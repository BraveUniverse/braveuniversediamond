// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IOracleFacet.sol";

contract GridottoExecutionV2Facet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event DrawExecuted(uint256 indexed drawId, address indexed executor, address[] winners);
    
    modifier notPaused() { require(!LibGridottoStorageV2.layout().paused, "System paused"); _; }
    
    // Execute regular draw (not platform draws)
    function executeDraw(uint256 drawId) external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Invalid state");
        require(block.timestamp >= draw.endTime, "Not ended");
        
        // Check minimum participants (not required for platform draws)
        if (draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY && 
            draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            require(draw.participants.length >= draw.config.minParticipants, "Not enough participants");
        }
        
        require(draw.participants.length > 0, "No participants");
        
        draw.isCompleted = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // Calculate fees
        uint256 totalPool = draw.prizePool;
        uint256 platformFee = (totalPool * s.defaultPlatformFee) / 10000; // 5%
        uint256 executorFee = (totalPool * s.executorFeePercent) / 10000; // 5%
        uint256 winnerPrize = totalPool - platformFee - executorFee;
        
        // Special handling for NFT draws with ticket sales
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 && draw.config.ticketPrice > 0) {
            // Creator gets 88% after all fees
            uint256 monthlyFee = (totalPool * s.monthlyPoolPercent) / 10000; // 2%
            uint256 creatorRevenue = totalPool - platformFee - executorFee - monthlyFee;
            
            // Transfer creator revenue
            (bool success, ) = draw.creator.call{value: creatorRevenue}("");
            require(success, "Creator payment failed");
            
            // Winner gets the NFT (handled in claimPrize)
            winnerPrize = 0; // No LYX prize, just NFT
        }
        
        // Update platform fees
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8) {
            s.platformFeesLYX += platformFee;
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            s.platformFeesToken[draw.tokenAddress] += platformFee;
        }
        
        // Select winner using Oracle
        uint256 randomNumber = IOracleFacet(address(this)).getRandomNumber();
        uint256 winnerIndex = randomNumber % draw.ticketsSold;
        
        // Find winner
        uint256 ticketCounter = 0;
        address winner;
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.ticketCount[participant];
            if (ticketCounter + userTickets > winnerIndex) {
                winner = participant;
                break;
            }
            ticketCounter += userTickets;
        }
        
        draw.winners.push(winner);
        draw.winnerAmounts.push(winnerPrize);
        
        // Update stats
        s.totalExecutions++;
        if (winnerPrize > 0) {
            s.totalPrizesDistributed += winnerPrize;
            s.userTotalWins[winner]++;
            s.userTotalWinnings[winner] += winnerPrize;
        }
        s.userDrawsExecuted[msg.sender]++;
        s.userExecutionFees[msg.sender] += executorFee;
        
        // Add executor fee to claimable balance instead of direct transfer
        if (executorFee > 0) {
            s.claimableExecutorFees[msg.sender] += executorFee;
        }
        
        emit DrawExecuted(drawId, msg.sender, draw.winners);
    }
    
    // Check if draw can be executed
    function canExecuteDraw(uint256 drawId) external view returns (bool) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        if (draw.creator == address(0) || draw.isCompleted || draw.isCancelled) {
            return false;
        }
        
        if (block.timestamp < draw.endTime) {
            return false;
        }
        
        if (draw.participants.length == 0) {
            return false;
        }
        
        // Check minimum participants (not required for platform draws)
        if (draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY && 
            draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            if (draw.participants.length < draw.config.minParticipants) {
                return false;
            }
        }
        
        return true;
    }
    
    // Get draw winners
    function getDrawWinners(uint256 drawId) external view returns (
        address[] memory winners,
        uint256[] memory amounts
    ) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        return (draw.winners, draw.winnerAmounts);
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}