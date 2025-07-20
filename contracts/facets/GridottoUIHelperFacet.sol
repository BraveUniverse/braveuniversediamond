// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";

/**
 * @title GridottoUIHelperFacet
 * @notice Helper functions for UI to display data efficiently
 * @dev Simplified version that works with existing storage
 */
contract GridottoUIHelperFacet {

    // Custom errors
    error InvalidLimit();

    /**
     * @notice Get user's created draws
     * @param creator The creator address
     * @param offset Starting position
     * @param limit Number of results
     * @return drawIds Array of draw IDs created by the user
     */
    function getUserCreatedDraws(
        address creator,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory drawIds) {
        if (limit == 0 || limit > 100) revert InvalidLimit();
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256[] storage createdDraws = l.userCreatedDraws[creator];
        uint256 totalDraws = createdDraws.length;
        
        if (offset >= totalDraws) {
            return new uint256[](0);
        }
        
        uint256 resultSize = limit;
        if (offset + limit > totalDraws) {
            resultSize = totalDraws - offset;
        }
        
        drawIds = new uint256[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            drawIds[i] = createdDraws[offset + i];
        }
        
        return drawIds;
    }

    /**
     * @notice Get active user draws
     * @param limit Maximum number of draws to return
     * @return drawIds Array of active draw IDs
     * @return creators Array of draw creators
     * @return endTimes Array of end times
     */
    function getActiveUserDraws(uint256 limit) external view returns (
        uint256[] memory drawIds,
        address[] memory creators,
        uint256[] memory endTimes
    ) {
        if (limit == 0 || limit > 50) revert InvalidLimit();
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256[] storage activeDraws = l.activeUserDraws;
        uint256 activeCount = activeDraws.length;
        
        uint256 resultSize = limit;
        if (resultSize > activeCount) {
            resultSize = activeCount;
        }
        
        drawIds = new uint256[](resultSize);
        creators = new address[](resultSize);
        endTimes = new uint256[](resultSize);
        
        for (uint256 i = 0; i < resultSize; i++) {
            uint256 drawId = activeDraws[i];
            LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
            
            drawIds[i] = drawId;
            creators[i] = draw.creator;
            endTimes[i] = draw.endTime;
        }
        
        return (drawIds, creators, endTimes);
    }

    /**
     * @notice Get all claimable prizes for a user
     * @param user The user address
     * @return totalLYX Total LYX to claim
     * @return hasTokenPrizes Whether user has token prizes
     * @return hasNFTPrizes Whether user has NFT prizes
     */
    function getAllClaimablePrizes(address user) external view returns (
        uint256 totalLYX,
        bool hasTokenPrizes,
        bool hasNFTPrizes
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Get LYX prizes
        totalLYX = l.pendingPrizes[user];
        
        // Check for token prizes (simplified - just check if mapping exists)
        // In production, would iterate through known tokens
        hasTokenPrizes = false;
        
        // Check for NFT prizes (simplified)
        hasNFTPrizes = false;
        
        return (totalLYX, hasTokenPrizes, hasNFTPrizes);
    }

    /**
     * @notice Get draw statistics
     * @param drawId The user draw ID
     * @return creator Draw creator
     * @return endTime Draw end time
     * @return prizePool Current prize pool
     * @return participantCount Number of participants
     * @return ticketsSold Total tickets sold
     */
    function getUserDrawStats(uint256 drawId) external view returns (
        address creator,
        uint256 endTime,
        uint256 prizePool,
        uint256 participantCount,
        uint256 ticketsSold
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        creator = draw.creator;
        endTime = draw.endTime;
        prizePool = draw.currentPrizePool;
        participantCount = draw.participants.length;
        ticketsSold = draw.ticketsSold;
        
        return (creator, endTime, prizePool, participantCount, ticketsSold);
    }

    /**
     * @notice Get official draw info
     * @return currentDraw Current draw number
     * @return currentMonthlyDraw Current monthly draw number
     * @return nextDrawTime Next draw time
     * @return nextMonthlyDrawTime Next monthly draw time
     * @return ticketPrice Ticket price for official draws
     */
    function getOfficialDrawInfo() external view returns (
        uint256 currentDraw,
        uint256 currentMonthlyDraw,
        uint256 nextDrawTime,
        uint256 nextMonthlyDrawTime,
        uint256 ticketPrice
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        currentDraw = l.currentDraw;
        currentMonthlyDraw = l.currentMonthlyDraw;
        nextDrawTime = l.drawTime;
        nextMonthlyDrawTime = l.monthlyDrawTime;
        ticketPrice = l.ticketPrice;
        
        return (currentDraw, currentMonthlyDraw, nextDrawTime, nextMonthlyDrawTime, ticketPrice);
    }

    /**
     * @notice Get executor reward for a user draw
     * @param drawId The draw ID
     * @return reward The executor reward amount
     */
    function getUserDrawExecutorReward(uint256 drawId) external view returns (uint256 reward) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        if (draw.endTime == 0 || block.timestamp < draw.endTime) {
            return 0;
        }
        
        // Executor gets 1% of collected fees
        uint256 totalCollected = draw.ticketsSold * draw.ticketPrice;
        reward = (totalCollected * 1) / 100;
        
        return reward;
    }

    /**
     * @notice Get draw participants list
     * @param drawId The draw ID
     * @param offset Starting position
     * @param limit Number of results
     * @return participants Array of participant addresses
     * @return ticketCounts Array of ticket counts per participant
     */
    function getDrawParticipants(
        uint256 drawId,
        uint256 offset,
        uint256 limit
    ) external view returns (
        address[] memory participants,
        uint256[] memory ticketCounts
    ) {
        if (limit == 0 || limit > 100) revert InvalidLimit();
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        uint256 totalParticipants = draw.participants.length;
        
        if (offset >= totalParticipants) {
            return (new address[](0), new uint256[](0));
        }
        
        uint256 resultSize = limit;
        if (offset + limit > totalParticipants) {
            resultSize = totalParticipants - offset;
        }
        
        participants = new address[](resultSize);
        ticketCounts = new uint256[](resultSize);
        
        for (uint256 i = 0; i < resultSize; i++) {
            address participant = draw.participants[offset + i];
            participants[i] = participant;
            ticketCounts[i] = draw.userTickets[participant];
        }
        
        return (participants, ticketCounts);
    }

    /**
     * @notice Check if user can participate in a draw
     * @param drawId The draw ID
     * @param user The user address
     * @return canParticipate Whether user can participate
     * @return reason Reason if cannot participate
     */
    function canUserParticipate(
        uint256 drawId,
        address user
    ) external view returns (
        bool canParticipate,
        string memory reason
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        // Check if draw exists
        if (draw.endTime == 0) {
            return (false, "Draw does not exist");
        }
        
        // Check if draw has ended
        if (block.timestamp >= draw.endTime) {
            return (false, "Draw has ended");
        }
        
        // Check if draw is completed
        if (draw.isCompleted) {
            return (false, "Draw is completed");
        }
        
        // Check max participants
        if (draw.maxTickets > 0 && draw.ticketsSold >= draw.maxTickets) {
            return (false, "Maximum tickets reached");
        }
        
        // Check participation requirements
        if (draw.requirement == LibGridottoStorage.ParticipationRequirement.LSP7_HOLDER) {
            // Would check token balance here
            // For now, assume pass
        } else if (draw.requirement == LibGridottoStorage.ParticipationRequirement.LSP8_HOLDER) {
            // Would check NFT ownership here
            // For now, assume pass
        } else if (draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_ONLY) {
            // Would check follower count here
            // For now, assume pass
        }
        
        return (true, "");
    }

    /**
     * @notice Get user's participation history
     * @param user The user address
     * @param offset Starting position
     * @param limit Number of results
     * @return drawIds Array of draw IDs user participated in
     * @return ticketsBought Array of tickets bought per draw
     * @return won Array indicating if user won each draw
     */
    function getUserParticipationHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (
        uint256[] memory drawIds,
        uint256[] memory ticketsBought,
        bool[] memory won
    ) {
        if (limit == 0 || limit > 100) revert InvalidLimit();
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256[] storage participatedDraws = l.userParticipatedDraws[user];
        uint256 totalParticipated = participatedDraws.length;
        
        if (offset >= totalParticipated) {
            return (new uint256[](0), new uint256[](0), new bool[](0));
        }
        
        uint256 resultSize = limit;
        if (offset + limit > totalParticipated) {
            resultSize = totalParticipated - offset;
        }
        
        drawIds = new uint256[](resultSize);
        ticketsBought = new uint256[](resultSize);
        won = new bool[](resultSize);
        
        for (uint256 i = 0; i < resultSize; i++) {
            uint256 drawId = participatedDraws[offset + i];
            LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
            
            drawIds[i] = drawId;
            ticketsBought[i] = draw.userTickets[user];
            
            // Check if user won
            for (uint256 j = 0; j < draw.winners.length; j++) {
                if (draw.winners[j] == user) {
                    won[i] = true;
                    break;
                }
            }
        }
        
        return (drawIds, ticketsBought, won);
    }

    /**
     * @notice Get recent winners for leaderboard
     * @param offset Starting index
     * @param limit Maximum number of results (max 100)
     * @return winners Array of winner information
     */
    function getRecentWinners(
        uint256 offset,
        uint256 limit
    ) external view returns (
        LibGridottoStorage.WinnerInfo[] memory winners
    ) {
        if (limit == 0 || limit > 100) revert InvalidLimit();
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 totalWinners = l.recentWinners.length;
        
        if (offset >= totalWinners) {
            return new LibGridottoStorage.WinnerInfo[](0);
        }
        
        uint256 resultSize = limit;
        if (offset + limit > totalWinners) {
            resultSize = totalWinners - offset;
        }
        
        winners = new LibGridottoStorage.WinnerInfo[](resultSize);
        
        // Return in reverse order (most recent first)
        for (uint256 i = 0; i < resultSize; i++) {
            uint256 index = totalWinners - offset - i - 1;
            winners[i] = l.recentWinners[index];
        }
        
        return winners;
    }

    /**
     * @notice Get detailed draw information for UI
     * @param drawId The draw ID
     * @return creator Draw creator address
     * @return drawType Type of draw (USER_LYX, USER_LSP7, USER_LSP8)
     * @return startTime Draw start timestamp
     * @return endTime Draw end timestamp
     * @return ticketPrice Price per ticket in wei
     * @return totalTickets Total tickets sold
     * @return participantCount Number of unique participants
     * @return prizePool Current prize pool amount
     * @return tokenAddress Token address (for LSP7 draws)
     * @return nftContract NFT contract address (for LSP8 draws)
     * @return nftCount Number of NFTs (for LSP8 draws)
     * @return isCompleted Whether draw is completed
     * @return winners Array of winner addresses
     * @return minParticipants Minimum participants required
     * @return maxParticipants Maximum participants allowed
     * @return requirement Participation requirement type
     * @return executorReward Calculated executor reward
     */
    function getAdvancedDrawInfo(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorage.DrawType drawType,
        uint256 startTime,
        uint256 endTime,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 participantCount,
        uint256 prizePool,
        address tokenAddress,
        address nftContract,
        uint256 nftCount,
        bool isCompleted,
        address[] memory winners,
        uint256 minParticipants,
        uint256 maxParticipants,
        LibGridottoStorage.ParticipationRequirement requirement,
        uint256 executorReward
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        creator = draw.creator;
        drawType = draw.drawType;
        startTime = draw.startTime;
        endTime = draw.endTime;
        ticketPrice = draw.ticketPrice;
        totalTickets = draw.totalTickets;
        participantCount = draw.participants.length;
        
        // Calculate prize pool based on draw type
        if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
            prizePool = draw.currentPrize;
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
            prizePool = draw.currentPrizePool;
            tokenAddress = draw.tokenAddress;
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            nftContract = draw.nftAddress;
            nftCount = draw.nftTokenIds.length;
            prizePool = draw.currentPrize; // LYX amount for NFT draws
        }
        
        isCompleted = draw.isCompleted;
        winners = draw.winners;
        minParticipants = 0; // Not stored in UserDraw, using 0 as default
        maxParticipants = draw.maxTickets;
        requirement = draw.requirement;
        
        // Calculate executor reward
        if (!draw.isCompleted && block.timestamp >= draw.endTime) {
            if (draw.ticketPrice > 0 && draw.totalTickets > 0) {
                uint256 totalCollected = draw.ticketPrice * draw.totalTickets;
                (uint256 executorPercent, uint256 maxReward) = LibAdminStorage.getExecutorRewardConfig();
                executorReward = (totalCollected * executorPercent) / 100;
                
                // Apply max reward cap for LYX draws only
                if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX && executorReward > maxReward) {
                    executorReward = maxReward;
                }
            }
        }
    }
}