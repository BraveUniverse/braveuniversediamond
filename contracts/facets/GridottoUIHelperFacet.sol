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
}