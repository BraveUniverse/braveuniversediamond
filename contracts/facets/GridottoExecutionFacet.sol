// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";
import "../interfaces/IOracleFacet.sol";
import { LibDiamond } from "../libs/LibDiamond.sol";

contract GridottoExecutionFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event UserDrawExecuted(uint256 indexed drawId, address indexed executor, address[] winners);
    event DrawExecutorRewarded(address indexed executor, uint256 reward, uint256 drawId);
    event UserDrawCompleted(uint256 indexed drawId, address[] winners, uint256 prizeAmount);
    event UserDrawCancelled(uint256 indexed drawId, address indexed canceller, string reason);
    
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
        
        // Check minimum participants - allow execution if time has passed
        if (draw.minParticipants > 0 && draw.participants.length < draw.minParticipants) {
            // Allow execution after grace period (e.g., 7 days after end time)
            uint256 gracePeriod = 7 days;
            require(
                block.timestamp >= draw.endTime + gracePeriod,
                "Min participants not met, wait for grace period"
            );
        }
        
        // Select winners
        _selectWinners(draw, drawId);
        
        // Calculate and distribute prizes
        _distributePrizes(draw, drawId);
        
        // Mark as completed
        draw.isCompleted = true;
        
        emit UserDrawExecuted(drawId, msg.sender, draw.winners);
    }
    
    /**
     * @notice Cancel a user draw (only creator or owner)
     * @param drawId The draw ID to cancel
     */
    function cancelUserDraw(uint256 drawId) external notPaused nonReentrant {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        
        // Allow creator to cancel only if no participants
        // Allow owner to cancel any draw (for cleanup)
        bool isOwner = msg.sender == LibDiamond.contractOwner();
        
        if (!isOwner) {
            require(draw.creator == msg.sender, "Only creator can cancel");
            require(draw.participants.length == 0, "Cannot cancel with participants");
        }
        
        // Mark as completed to prevent execution
        draw.isCompleted = true;
        
        // Return initial prize to creator (if any)
        if (draw.initialPrize > 0 && draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
            (bool success, ) = payable(draw.creator).call{value: draw.initialPrize}("");
            require(success, "Prize return failed");
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7 && draw.initialPrize > 0) {
            ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
            token.transfer(address(this), draw.creator, draw.initialPrize, true, "");
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8 && draw.nftTokenIds.length > 0) {
            ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
            for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                nft.transfer(address(this), draw.creator, draw.nftTokenIds[i], true, "");
            }
        }
        
        // Remove from active draws
        _removeFromActiveDraws(drawId);
        
        emit UserDrawCancelled(drawId, msg.sender, isOwner ? "Admin cancelled" : "Creator cancelled");
    }
    
    /**
     * @notice Force execute a draw that met minimum time requirements (owner only)
     * @param drawId The draw ID to force execute
     */
    function forceExecuteDraw(uint256 drawId) external notPaused nonReentrant {
        require(msg.sender == LibDiamond.contractOwner(), "Only owner");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(draw.participants.length > 0, "No participants");
        
        // Admin can force execute after end time regardless of min participants
        require(block.timestamp >= draw.endTime, "Draw not ended yet");
        
        // Select winners
        _selectWinners(draw, drawId);
        
        // Mark as completed
        draw.isCompleted = true;
        
        // Distribute prizes
        _distributePrizes(draw, drawId);
        
        // Remove from active draws
        _removeFromActiveDraws(drawId);
        
        emit UserDrawExecuted(drawId, msg.sender, draw.winners);
    }
    
    // Internal functions
    function _selectWinners(LibGridottoStorage.UserDraw storage draw, uint256 drawId) internal {
        uint256 numWinners = draw.winnerConfig.enabled ? draw.winnerConfig.totalWinners : 1;
        
        if (numWinners > draw.participants.length) {
            numWinners = draw.participants.length;
        }
        
        draw.winners = new address[](numWinners);
        
        // Get random number from Oracle
        uint256 randomSeed;
        try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
            randomSeed = value;
        } catch {
            // Fallback to pseudo-random if oracle fails
            randomSeed = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                drawId,
                draw.participants.length
            )));
        }
        
        // Select winners using the random seed
        for (uint256 i = 0; i < numWinners; i++) {
            // Generate unique random for each winner
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(
                randomSeed,
                i,
                drawId
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
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
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
            // Make token prize claimable instead of direct transfer
            l.pendingTokenPrizes[draw.winners[0]][draw.tokenAddress] += totalPrize;
            
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
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (draw.winnerConfig.tiers.length > 0) {
            // Tier-based distribution
            uint256 winnerIndex = 0;
            
            for (uint256 i = 0; i < draw.winnerConfig.tiers.length && winnerIndex < draw.winners.length; i++) {
                LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[i];
                uint256 prizePerWinner = (totalPrize * tier.prizePercent) / 10000 / tier.winnersCount;
                
                for (uint256 j = 0; j < tier.winnersCount && winnerIndex < draw.winners.length; j++) {
                    // Make claimable instead of direct transfer
                    l.pendingTokenPrizes[draw.winners[winnerIndex]][draw.tokenAddress] += prizePerWinner;
                    
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
                // Make claimable instead of direct transfer
                l.pendingTokenPrizes[draw.winners[i]][draw.tokenAddress] += prizePerWinner;
                
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
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (draw.winnerConfig.enabled) {
            // Multi-winner NFT distribution
            uint256 nftIndex = 0;
            uint256 winnerIndex = 0;
            
            for (uint256 i = 0; i < draw.winnerConfig.tiers.length && winnerIndex < draw.winners.length; i++) {
                LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[i];
                
                for (uint256 j = 0; j < tier.winnersCount && winnerIndex < draw.winners.length; j++) {
                    if (tier.specificNFTIds.length > j) {
                        // Make NFT claimable instead of direct transfer
                        l.pendingNFTPrizes[draw.winners[winnerIndex]][draw.nftAddress].push(tier.specificNFTIds[j]);
                        
                        // Track winner
                        LibGridottoStorage.trackWinner(
                            draw.winners[winnerIndex],
                            drawId,
                            draw.drawType,
                            0,
                            address(0),
                            tier.specificNFTIds[j],
                            draw.creator
                        );
                    } else if (nftIndex < draw.nftTokenIds.length) {
                        // Make NFT claimable instead of direct transfer
                        l.pendingNFTPrizes[draw.winners[winnerIndex]][draw.nftAddress].push(draw.nftTokenIds[nftIndex]);
                        
                        // Track winner
                        LibGridottoStorage.trackWinner(
                            draw.winners[winnerIndex],
                            drawId,
                            draw.drawType,
                            0,
                            address(0),
                            draw.nftTokenIds[nftIndex],
                            draw.creator
                        );
                        nftIndex++;
                    }
                    winnerIndex++;
                }
            }
        } else {
            // Single winner gets first NFT
            if (draw.nftTokenIds.length > 0) {
                // Make NFT claimable instead of direct transfer
                l.pendingNFTPrizes[draw.winners[0]][draw.nftAddress].push(draw.nftTokenIds[0]);
                
                // Track winner
                LibGridottoStorage.trackWinner(
                    draw.winners[0],
                    drawId,
                    draw.drawType,
                    0,
                    address(0),
                    draw.nftTokenIds[0],
                    draw.creator
                );
            }
        }
        
        emit UserDrawCompleted(drawId, draw.winners, 0);
    }

    function _removeFromActiveDraws(uint256 drawId) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        // This function is not fully implemented in the original file,
        // so it's added here as a placeholder.
        // In a real scenario, this would remove the draw from a mapping
        // of active draws or a similar data structure.
        // For now, it's just a placeholder to avoid compilation errors.
    }
}