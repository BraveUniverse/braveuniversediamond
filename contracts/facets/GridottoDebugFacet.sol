// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";

contract GridottoDebugFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    // Get raw draw data for debugging
    function getDrawDebugInfo(uint256 drawId) external view returns (
        address creator,
        uint8 drawType,
        uint256 configTicketPrice,
        uint256 configMaxTickets,
        uint256 configDuration,
        uint256 configMinParticipants,
        uint256 configPlatformFeePercent,
        address tokenAddress,
        uint256 ticketsSold,
        uint256 prizePool,
        uint256 creatorContribution,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted,
        bool isCancelled,
        uint256 participantCount,
        uint256 monthlyPoolContribution
    ) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        return (
            draw.creator,
            uint8(draw.drawType),
            draw.config.ticketPrice,
            draw.config.maxTickets,
            draw.config.duration,
            draw.config.minParticipants,
            draw.config.platformFeePercent,
            draw.tokenAddress,
            draw.ticketsSold,
            draw.prizePool,
            draw.creatorContribution,
            draw.startTime,
            draw.endTime,
            draw.isCompleted,
            draw.isCancelled,
            draw.participants.length,
            draw.monthlyPoolContribution
        );
    }
    
    // Get participant ticket count
    function getUserTicketCount(uint256 drawId, address user) external view returns (uint256) {
        return LibGridottoStorageV2.layout().draws[drawId].ticketCount[user];
    }
    
    // Get all participants
    function getDrawParticipants(uint256 drawId) external view returns (address[] memory) {
        return LibGridottoStorageV2.layout().draws[drawId].participants;
    }
    
    // Check if ticketsSold is being updated
    function getTicketsSoldDirectly(uint256 drawId) external view returns (uint256) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        return draw.ticketsSold;
    }
    
    // Get total tickets from counting participants
    function calculateTotalTickets(uint256 drawId) external view returns (uint256 total) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        for (uint256 i = 0; i < draw.participants.length; i++) {
            total += draw.ticketCount[draw.participants[i]];
        }
    }
}