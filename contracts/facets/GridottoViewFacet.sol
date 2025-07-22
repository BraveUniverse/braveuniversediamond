// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

contract GridottoViewFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
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
     * @return startTime When the draw started
     * @return endTime When the draw ends
     * @return isActive Whether the draw is currently active
     * @return timeRemaining Seconds until draw ends (0 if ended)
     */
    function getDrawTiming(uint256 drawId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 timeRemaining
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        startTime = draw.startTime;
        endTime = draw.endTime;
        
        uint256 currentTime = block.timestamp;
        isActive = currentTime >= startTime && currentTime < endTime && !draw.isCompleted && !draw.isCancelled;
        
        if (isActive && endTime > currentTime) {
            timeRemaining = endTime - currentTime;
        } else {
            timeRemaining = 0;
        }
        
        return (startTime, endTime, isActive, timeRemaining);
    }
    
    /**
     * @notice Get user participation details for a draw
     * @param drawId The ID of the draw
     * @param user The user address
     * @return ticketCount Number of tickets owned by user
     * @return hasParticipated Whether user has participated
     * @return winningChance User's winning chance percentage (basis points)
     */
    function getUserDrawInfo(uint256 drawId, address user) external view returns (
        uint256 ticketCount,
        bool hasParticipated,
        uint256 winningChance
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        ticketCount = draw.userTickets[user];
        hasParticipated = draw.hasParticipated[user];
        
        if (draw.ticketsSold > 0 && ticketCount > 0) {
            winningChance = (ticketCount * 10000) / draw.ticketsSold; // basis points
        } else {
            winningChance = 0;
        }
        
        return (ticketCount, hasParticipated, winningChance);
    }
    
    /**
     * @notice Get all participants of a draw
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
     * @notice Check if a draw can be executed
     * @param drawId The ID of the draw
     * @return canExecute Whether the draw can be executed
     * @return reason Reason why it cannot be executed (empty if can execute)
     */
    function canExecuteDraw(uint256 drawId) external view returns (bool canExecute, string memory reason) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        if (draw.creator == address(0)) {
            return (false, "Draw does not exist");
        }
        
        if (draw.isCompleted) {
            return (false, "Draw already completed");
        }
        
        if (draw.isCancelled) {
            return (false, "Draw cancelled");
        }
        
        if (block.timestamp < draw.endTime) {
            return (false, "Draw not ended yet");
        }
        
        if (draw.ticketsSold == 0) {
            return (false, "No tickets sold");
        }
        
        // Check minimum participants
        if (draw.minParticipants > 0 && draw.participants.length < draw.minParticipants) {
            // Check grace period (fixed at 7 days)
            uint256 gracePeriod = 7 days;
            if (block.timestamp < draw.endTime + gracePeriod) {
                return (false, "In grace period");
            }
        }
        
        return (true, "");
    }
}