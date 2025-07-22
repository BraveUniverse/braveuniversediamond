// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

/**
 * @title GridottoFixedViewFacet
 * @notice Fixed view functions that properly read from storage
 */
contract GridottoFixedViewFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    /**
     * @notice Get user draw with correct field mapping
     * @param drawId The ID of the draw
     */
    function getUserDrawFixed(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorage.DrawType drawType,
        uint256 ticketPrice,
        uint256 ticketsSold,
        uint256 maxTickets,
        uint256 currentPrizePool,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted,
        bool isCancelled,
        uint256 minParticipants,
        address[] memory winners
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        return (
            draw.creator,
            draw.drawType,
            draw.ticketPrice,
            draw.ticketsSold,
            draw.maxTickets,
            draw.currentPrizePool,
            draw.startTime,
            draw.endTime,
            draw.isCompleted,
            draw.isCancelled,
            draw.minParticipants,
            draw.winners
        );
    }
    
    /**
     * @notice Check if a draw is active and can accept tickets
     * @param drawId The ID of the draw
     * @return isActive Whether the draw is active
     * @return reason If not active, why
     */
    function isDrawActive(uint256 drawId) external view returns (bool isActive, string memory reason) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        if (draw.creator == address(0)) {
            return (false, "Draw does not exist");
        }
        
        if (draw.isCompleted) {
            return (false, "Draw completed");
        }
        
        if (draw.isCancelled) {
            return (false, "Draw cancelled");
        }
        
        uint256 currentTime = block.timestamp;
        
        if (currentTime < draw.startTime) {
            return (false, "Draw not started");
        }
        
        if (currentTime >= draw.endTime) {
            return (false, "Draw ended");
        }
        
        if (draw.maxTickets > 0 && draw.ticketsSold >= draw.maxTickets) {
            return (false, "Sold out");
        }
        
        return (true, "Active");
    }
    
    /**
     * @notice Get draw prize configuration
     * @param drawId The ID of the draw
     */
    function getDrawPrizeConfig(uint256 drawId) external view returns (
        LibGridottoStorage.PrizeModel model,
        uint256 creatorContribution,
        bool addParticipationFees,
        uint256 participationFeePercent,
        uint256 totalWinners,
        uint256 minParticipants,
        uint256 gracePeriod
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        LibGridottoStorage.DrawPrizeConfig memory config = draw.prizeConfig;
        
        // Fixed grace period of 7 days
        uint256 fixedGracePeriod = 7 days;
        
        return (
            config.model,
            config.creatorContribution,
            config.addParticipationFees,
            config.participationFeePercent,
            config.totalWinners,
            draw.minParticipants,
            fixedGracePeriod
        );
    }
    
    /**
     * @notice Get comprehensive statistics for a draw
     * @param drawId The ID of the draw
     */
    function getDrawStats(uint256 drawId) external view returns (
        uint256 participantCount,
        uint256 totalTicketsSold,
        uint256 currentPrizePool,
        uint256 averageTicketsPerUser,
        uint256 timeUntilEnd,
        bool canExecute
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        participantCount = draw.participants.length;
        totalTicketsSold = draw.ticketsSold;
        currentPrizePool = draw.currentPrizePool;
        
        if (participantCount > 0) {
            averageTicketsPerUser = totalTicketsSold / participantCount;
        }
        
        uint256 currentTime = block.timestamp;
        if (currentTime < draw.endTime) {
            timeUntilEnd = draw.endTime - currentTime;
        }
        
        // Check if can execute
        canExecute = !draw.isCompleted && 
                    !draw.isCancelled && 
                    currentTime >= draw.endTime &&
                    draw.ticketsSold > 0;
                    
        // Check minimum participants
        if (draw.minParticipants > 0 && participantCount < draw.minParticipants) {
            uint256 gracePeriod = 7 days;
            if (currentTime < draw.endTime + gracePeriod) {
                canExecute = false;
            }
        }
        
        return (
            participantCount,
            totalTicketsSold,
            currentPrizePool,
            averageTicketsPerUser,
            timeUntilEnd,
            canExecute
        );
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
        
        // Check up to 1000 draws
        for (uint256 i = 1; i <= 1000 && count < limit; i++) {
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
}