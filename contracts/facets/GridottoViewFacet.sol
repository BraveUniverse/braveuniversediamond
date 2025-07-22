// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

/**
 * @title GridottoViewFacet
 * @notice Comprehensive view functions for all draw data
 */
contract GridottoViewFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Structs for return data
    struct DrawDetails {
        address creator;
        LibGridottoStorage.DrawType drawType;
        uint256 ticketPrice;
        uint256 ticketsSold;
        uint256 maxTickets;
        uint256 currentPrizePool;
        uint256 startTime;
        uint256 endTime;
        bool isCompleted;
        bool isCancelled;
        address[] winners;
        uint256[] winnerPrizes;
        address executor;
        uint256 executedAt;
    }
    
    struct DrawTimingInfo {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 timeRemaining;
        bool canExecute;
    }
    
    struct UserDrawInfo {
        uint256 ticketCount;
        bool hasParticipated;
        uint256 winningChance;
        bool hasWon;
        uint256 prizeAmount;
        bool prizeClaimed;
    }
    
    /**
     * @notice Get comprehensive draw details
     * @param drawId The ID of the draw
     * @return details Complete draw information
     */
    function getDrawDetails(uint256 drawId) external view returns (DrawDetails memory details) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        details.creator = draw.creator;
        details.drawType = draw.drawType;
        details.ticketPrice = draw.ticketPrice;
        details.ticketsSold = draw.ticketsSold;
        details.maxTickets = draw.maxTickets;
        details.currentPrizePool = draw.currentPrizePool;
        details.startTime = draw.startTime;
        details.endTime = draw.endTime;
        details.isCompleted = draw.isCompleted;
        details.isCancelled = draw.isCancelled;
        details.winners = draw.winners;
        details.winnerPrizes = draw.winnerPrizes;
        details.executor = draw.executor;
        details.executedAt = draw.executedAt;
        
        return details;
    }
    
    /**
     * @notice Get draw timing information
     * @param drawId The ID of the draw
     * @return timing Timing information
     */
    function getDrawTiming(uint256 drawId) external view returns (DrawTimingInfo memory timing) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        timing.startTime = draw.startTime;
        timing.endTime = draw.endTime;
        
        uint256 currentTime = block.timestamp;
        timing.isActive = currentTime >= draw.startTime && 
                         currentTime < draw.endTime && 
                         !draw.isCompleted && 
                         !draw.isCancelled;
        
        if (currentTime < draw.endTime) {
            timing.timeRemaining = draw.endTime - currentTime;
        }
        
        // Check if can execute
        timing.canExecute = !draw.isCompleted && 
                           !draw.isCancelled && 
                           currentTime >= draw.endTime &&
                           draw.ticketsSold > 0;
                           
        // Check minimum participants with grace period
        if (draw.minParticipants > 0 && draw.participants.length < draw.minParticipants) {
            uint256 gracePeriod = 7 days;
            if (currentTime < draw.endTime + gracePeriod) {
                timing.canExecute = false;
            }
        }
        
        return timing;
    }
    
    /**
     * @notice Get user participation details for a draw
     * @param drawId The ID of the draw
     * @param user The user address
     * @return info User participation information
     */
    function getUserDrawInfo(uint256 drawId, address user) external view returns (UserDrawInfo memory info) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        info.ticketCount = draw.userTickets[user];
        info.hasParticipated = draw.hasParticipated[user];
        
        if (draw.ticketsSold > 0 && info.ticketCount > 0) {
            info.winningChance = (info.ticketCount * 10000) / draw.ticketsSold; // basis points
        }
        
        // Check if user won
        for (uint256 i = 0; i < draw.winners.length; i++) {
            if (draw.winners[i] == user) {
                info.hasWon = true;
                info.prizeAmount = draw.winnerPrizes[i];
                info.prizeClaimed = false; // Would need to check claim status
                break;
            }
        }
        
        return info;
    }
    
    /**
     * @notice Get all participants of a draw with their ticket counts
     * @param drawId The ID of the draw
     * @return participants Array of participant addresses
     * @return ticketCounts Array of ticket counts for each participant
     */
    function getDrawParticipantsWithTickets(uint256 drawId) external view returns (
        address[] memory participants,
        uint256[] memory ticketCounts
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        participants = draw.participants;
        ticketCounts = new uint256[](participants.length);
        
        for (uint256 i = 0; i < participants.length; i++) {
            ticketCounts[i] = draw.userTickets[participants[i]];
        }
        
        return (participants, ticketCounts);
    }
    
    /**
     * @notice Get all active draws
     * @param limit Maximum number of draws to return
     * @return drawIds Array of active draw IDs
     */
    function getActiveDraws(uint256 limit) external view returns (uint256[] memory drawIds) {
        LibGridottoStorage.Layout storage s = LibGridottoStorage.layout();
        uint256 currentTime = block.timestamp;
        
        uint256[] memory tempIds = new uint256[](limit);
        uint256 count = 0;
        
        // Check draws starting from most recent
        for (uint256 i = s.nextDrawId; i > 0 && count < limit; i--) {
            LibGridottoStorage.UserDraw storage draw = s.userDraws[i];
            
            if (draw.creator != address(0) &&
                !draw.isCompleted &&
                !draw.isCancelled &&
                currentTime >= draw.startTime &&
                currentTime < draw.endTime) {
                
                tempIds[count] = i;
                count++;
            }
        }
        
        // Create correctly sized array
        drawIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            drawIds[i] = tempIds[i];
        }
        
        return drawIds;
    }
    
    /**
     * @notice Get draws created by a specific user
     * @param creator The creator address
     * @param limit Maximum number of draws to return
     * @return drawIds Array of draw IDs created by the user
     */
    function getUserCreatedDraws(address creator, uint256 limit) external view returns (uint256[] memory drawIds) {
        LibGridottoStorage.Layout storage s = LibGridottoStorage.layout();
        
        uint256[] memory tempIds = new uint256[](limit);
        uint256 count = 0;
        
        for (uint256 i = s.nextDrawId; i > 0 && count < limit; i--) {
            if (s.userDraws[i].creator == creator) {
                tempIds[count] = i;
                count++;
            }
        }
        
        // Create correctly sized array
        drawIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            drawIds[i] = tempIds[i];
        }
        
        return drawIds;
    }
    
    /**
     * @notice Get draws a user has participated in
     * @param user The user address
     * @param limit Maximum number of draws to return
     * @return drawIds Array of draw IDs the user participated in
     */
    function getUserParticipatedDraws(address user, uint256 limit) external view returns (uint256[] memory drawIds) {
        LibGridottoStorage.Layout storage s = LibGridottoStorage.layout();
        
        uint256[] memory tempIds = new uint256[](limit);
        uint256 count = 0;
        
        for (uint256 i = s.nextDrawId; i > 0 && count < limit; i--) {
            if (s.userDraws[i].hasParticipated[user]) {
                tempIds[count] = i;
                count++;
            }
        }
        
        // Create correctly sized array
        drawIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            drawIds[i] = tempIds[i];
        }
        
        return drawIds;
    }
    
    /**
     * @notice Check if a draw exists
     * @param drawId The ID of the draw
     * @return exists Whether the draw exists
     */
    function drawExists(uint256 drawId) external view returns (bool exists) {
        return LibGridottoStorage.layout().userDraws[drawId].creator != address(0);
    }
    
    /**
     * @notice Get the current draw ID counter
     * @return counter The current draw ID counter
     */
    function getDrawIdCounter() external view returns (uint256 counter) {
        return LibGridottoStorage.layout().nextDrawId;
    }
    
    /**
     * @notice Check if contract is paused
     * @return paused Whether the contract is paused
     */
    function isPaused() external view returns (bool paused) {
        return LibGridottoStorage.layout().paused;
    }
}