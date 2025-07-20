// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";

contract GridottoExecutionFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event UserDrawExecuted(uint256 indexed drawId, address indexed executor, address[] winners);
    event DrawExecutorRewarded(address indexed executor, uint256 reward, uint256 drawId);
    event UserDrawCompleted(uint256 indexed drawId, address[] winners, uint256 prizeAmount);
    
    // Modifiers
    modifier notBanned() {
        require(!LibAdminStorage.isBanned(msg.sender), "User is banned");
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        require(!LibGridottoStorage.layout().locked, "ReentrancyGuard: reentrant call");
        LibGridottoStorage.layout().locked = true;
        _;
        LibGridottoStorage.layout().locked = false;
    }
    
    /**
     * @notice Execute a user draw and distribute prizes
     * @param drawId The draw ID to execute
     */
    function executeUserDraw(uint256 drawId) external notPaused nonReentrant notBanned {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(block.timestamp >= draw.endTime, "Draw not ended yet");
        require(draw.participants.length > 0, "No participants");
        
        // Select winners
        _selectWinners(draw, drawId);
        
        // Calculate and distribute prizes
        _distributePrizes(draw, drawId);
        
        // Mark as completed
        draw.isCompleted = true;
        
        emit UserDrawExecuted(drawId, msg.sender, draw.winners);
    }
    
    /**
     * @notice Cancel a user draw (only if no participants)
     * @param drawId The draw ID to cancel
     */
    function cancelUserDraw(uint256 drawId) external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator == msg.sender, "Only creator can cancel");
        require(!draw.isCompleted, "Draw already completed");
        require(draw.participants.length == 0, "Cannot cancel - draw has participants");
        
        // Refund creator based on draw type
        if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
            if (draw.initialPrize > 0) {
                (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
                require(success, "Refund failed");
            }
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
            if (draw.initialPrize > 0) {
                ILSP7DigitalAsset(draw.tokenAddress).transfer(
                    address(this),
                    draw.creator,
                    draw.initialPrize,
                    true,
                    ""
                );
            }
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
            for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                nft.transfer(address(this), draw.creator, draw.nftTokenIds[i], true, "");
            }
            
            // Refund any LYX sent
            if (draw.initialPrize > 0) {
                (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
                require(success, "LYX refund failed");
            }
        }
        
        // Mark as completed
        draw.isCompleted = true;
    }
    
    // Internal functions
    function _selectWinners(LibGridottoStorage.UserDraw storage draw, uint256 drawId) internal {
        uint256 numWinners = draw.winnerConfig.enabled ? draw.winnerConfig.totalWinners : 1;
        
        if (numWinners > draw.participants.length) {
            numWinners = draw.participants.length;
        }
        
        draw.winners = new address[](numWinners);
        
        // Simple random selection (can be improved with Chainlink VRF)
        for (uint256 i = 0; i < numWinners; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                drawId,
                i
            ))) % draw.participants.length;
            
            draw.winners[i] = draw.participants[randomIndex];
        }
    }
    
    function _distributePrizes(LibGridottoStorage.UserDraw storage draw, uint256 drawId) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (draw.ticketPrice > 0 && draw.totalTickets > 0) {
            uint256 totalCollected = draw.ticketPrice * draw.totalTickets;
            (uint256 executorPercent, uint256 maxReward) = LibAdminStorage.getExecutorRewardConfig();
            uint256 executorReward = (totalCollected * executorPercent) / 100;
            
            // Apply max reward cap for LYX draws only
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX && executorReward > maxReward) {
                executorReward = maxReward;
            }
            
            // Handle prize distribution based on draw type
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                uint256 prizeAmount = draw.currentPrize;
                
                if (executorReward > 0 && prizeAmount > executorReward) {
                    prizeAmount -= executorReward;
                    
                    // Pay executor
                    (bool success, ) = msg.sender.call{value: executorReward}("");
                    require(success, "Executor reward transfer failed");
                    emit DrawExecutorRewarded(msg.sender, executorReward, drawId);
                }
                
                // Distribute to winners
                if (draw.winnerConfig.enabled) {
                    _distributeLYXPrizesToMultipleWinners(draw, prizeAmount);
                } else {
                    l.pendingPrizes[draw.winners[0]] += prizeAmount;
                    
                    // Track winner for leaderboard
                    LibGridottoStorage.trackWinner(
                        draw.winners[0],
                        drawId,
                        draw.drawType,
                        prizeAmount,
                        address(0), // LYX
                        bytes32(0),
                        draw.creator
                    );
                }
                
                emit UserDrawCompleted(drawId, draw.winners, prizeAmount);
                
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                _distributeTokenPrizes(draw, drawId, executorReward);
                
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
                _distributeNFTPrizes(draw, drawId);
            }
        } else {
            // Free draw - no executor reward
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
                _distributeNFTPrizes(draw, drawId);
            }
        }
    }
    
    function _distributeLYXPrizesToMultipleWinners(
        LibGridottoStorage.UserDraw storage draw,
        uint256 totalPrize
    ) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (draw.winnerConfig.tiers.length > 0) {
            // Tier-based distribution
            uint256 tierIndex = 0;
            uint256 winnerIndex = 0;
            
            for (uint256 i = 0; i < draw.winnerConfig.tiers.length && winnerIndex < draw.winners.length; i++) {
                LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[i];
                uint256 prizePerWinner = (totalPrize * tier.prizePercent) / 10000 / tier.winnersCount;
                
                for (uint256 j = 0; j < tier.winnersCount && winnerIndex < draw.winners.length; j++) {
                    l.pendingPrizes[draw.winners[winnerIndex]] += prizePerWinner;
                    
                    // Track winner
                    LibGridottoStorage.trackWinner(
                        draw.winners[winnerIndex],
                        draw.prizeConfig.totalWinners, // drawId
                        draw.drawType,
                        prizePerWinner,
                        address(0),
                        bytes32(0),
                        draw.creator
                    );
                    
                    winnerIndex++;
                }
            }
        } else {
            // Equal distribution
            uint256 prizePerWinner = totalPrize / draw.winners.length;
            for (uint256 i = 0; i < draw.winners.length; i++) {
                l.pendingPrizes[draw.winners[i]] += prizePerWinner;
                
                // Track winner
                LibGridottoStorage.trackWinner(
                    draw.winners[i],
                    draw.prizeConfig.totalWinners, // drawId
                    draw.drawType,
                    prizePerWinner,
                    address(0),
                    bytes32(0),
                    draw.creator
                );
            }
        }
    }
    
    function _distributeTokenPrizes(
        LibGridottoStorage.UserDraw storage draw,
        uint256 drawId,
        uint256 executorReward
    ) internal {
        ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
        uint256 totalPrize = draw.currentPrizePool;
        
        if (executorReward > 0 && totalPrize > executorReward) {
            totalPrize -= executorReward;
            
            // Pay executor in tokens
            token.transfer(address(this), msg.sender, executorReward, true, "");
            emit DrawExecutorRewarded(msg.sender, executorReward, drawId);
        }
        
        // Distribute to winners
        if (draw.winnerConfig.enabled) {
            _distributeTokenPrizesToMultipleWinners(draw, totalPrize);
        } else {
            token.transfer(address(this), draw.winners[0], totalPrize, true, "");
            
            // Track winner
            LibGridottoStorage.trackWinner(
                draw.winners[0],
                drawId,
                draw.drawType,
                totalPrize,
                draw.tokenAddress,
                bytes32(0),
                draw.creator
            );
        }
        
        emit UserDrawCompleted(drawId, draw.winners, totalPrize);
    }
    
    function _distributeTokenPrizesToMultipleWinners(
        LibGridottoStorage.UserDraw storage draw,
        uint256 totalPrize
    ) internal {
        ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
        
        if (draw.winnerConfig.tiers.length > 0) {
            // Tier-based distribution
            uint256 winnerIndex = 0;
            
            for (uint256 i = 0; i < draw.winnerConfig.tiers.length && winnerIndex < draw.winners.length; i++) {
                LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[i];
                uint256 prizePerWinner = (totalPrize * tier.prizePercent) / 10000 / tier.winnersCount;
                
                for (uint256 j = 0; j < tier.winnersCount && winnerIndex < draw.winners.length; j++) {
                    token.transfer(address(this), draw.winners[winnerIndex], prizePerWinner, true, "");
                    
                    // Track winner
                    LibGridottoStorage.trackWinner(
                        draw.winners[winnerIndex],
                        draw.prizeConfig.totalWinners, // drawId
                        draw.drawType,
                        prizePerWinner,
                        draw.tokenAddress,
                        bytes32(0),
                        draw.creator
                    );
                    
                    winnerIndex++;
                }
            }
        } else {
            // Equal distribution
            uint256 prizePerWinner = totalPrize / draw.winners.length;
            for (uint256 i = 0; i < draw.winners.length; i++) {
                token.transfer(address(this), draw.winners[i], prizePerWinner, true, "");
                
                // Track winner
                LibGridottoStorage.trackWinner(
                    draw.winners[i],
                    draw.prizeConfig.totalWinners, // drawId
                    draw.drawType,
                    prizePerWinner,
                    draw.tokenAddress,
                    bytes32(0),
                    draw.creator
                );
            }
        }
    }
    
    function _distributeNFTPrizes(
        LibGridottoStorage.UserDraw storage draw,
        uint256 drawId
    ) internal {
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
        
        if (draw.winnerConfig.enabled) {
            // Multi-winner NFT distribution
            uint256 nftIndex = 0;
            uint256 winnerIndex = 0;
            
            for (uint256 i = 0; i < draw.winnerConfig.tiers.length && winnerIndex < draw.winners.length; i++) {
                LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[i];
                
                for (uint256 j = 0; j < tier.winnersCount && winnerIndex < draw.winners.length; j++) {
                    if (tier.specificNFTIds.length > j) {
                        // Specific NFT for this tier winner
                        nft.transfer(address(this), draw.winners[winnerIndex], tier.specificNFTIds[j], true, "");
                        
                        // Track winner
                        LibGridottoStorage.trackWinner(
                            draw.winners[winnerIndex],
                            drawId,
                            draw.drawType,
                            1,
                            draw.nftAddress,
                            tier.specificNFTIds[j],
                            draw.creator
                        );
                    } else if (nftIndex < draw.nftTokenIds.length) {
                        // Next available NFT
                        nft.transfer(address(this), draw.winners[winnerIndex], draw.nftTokenIds[nftIndex], true, "");
                        
                        // Track winner
                        LibGridottoStorage.trackWinner(
                            draw.winners[winnerIndex],
                            drawId,
                            draw.drawType,
                            1,
                            draw.nftAddress,
                            draw.nftTokenIds[nftIndex],
                            draw.creator
                        );
                        
                        nftIndex++;
                    }
                    winnerIndex++;
                }
            }
        } else {
            // Single winner gets all NFTs
            for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                nft.transfer(address(this), draw.winners[0], draw.nftTokenIds[i], true, "");
                
                // Track each NFT winner
                LibGridottoStorage.trackWinner(
                    draw.winners[0],
                    drawId,
                    draw.drawType,
                    1, // 1 NFT
                    draw.nftAddress,
                    draw.nftTokenIds[i],
                    draw.creator
                );
            }
        }
        
        emit UserDrawCompleted(drawId, draw.winners, draw.nftTokenIds.length);
    }
}