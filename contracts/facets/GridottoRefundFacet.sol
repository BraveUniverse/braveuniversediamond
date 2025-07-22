// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

contract GridottoRefundFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event RefundClaimed(uint256 indexed drawId, address indexed user, uint256 amount);
    event PrizeClaimed(uint256 indexed drawId, address indexed winner, uint256 amount);
    
    modifier notPaused() { require(!LibGridottoStorageV2.layout().paused, "System paused"); _; }
    
    // Claim refund for cancelled draw
    function claimRefund(uint256 drawId) external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(draw.isCancelled, "Draw not cancelled");
        require(draw.hasParticipated[msg.sender], "Not a participant");
        require(!draw.hasClaimed[msg.sender], "Already claimed");
        
        uint256 userTickets = draw.ticketCount[msg.sender];
        require(userTickets > 0, "No tickets");
        
        draw.hasClaimed[msg.sender] = true;
        
        // Calculate refund amount
        uint256 refundAmount = draw.config.ticketPrice * userTickets;
        
        // Deduct monthly pool contribution if applicable
        if (draw.monthlyPoolContribution > 0 && draw.ticketsSold > 0) {
            uint256 userShare = (draw.monthlyPoolContribution * userTickets) / draw.ticketsSold;
            refundAmount -= userShare;
        }
        
        // Transfer refund based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY) {
            
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            require(success, "Refund transfer failed");
            
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            // Handle token refund
            ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, refundAmount, true, "");
        }
        
        emit RefundClaimed(drawId, msg.sender, refundAmount);
    }
    
    // Claim prize for completed draw
    function claimPrize(uint256 drawId) external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(draw.isCompleted, "Not completed");
        require(!draw.hasClaimed[msg.sender], "Already claimed");
        
        // Find if user is a winner
        uint256 prizeAmount = 0;
        bool isWinner = false;
        
        for (uint256 i = 0; i < draw.winners.length; i++) {
            if (draw.winners[i] == msg.sender) {
                prizeAmount = draw.winnerAmounts[i];
                isWinner = true;
                break;
            }
        }
        
        require(isWinner, "Not a winner");
        require(prizeAmount > 0, "No prize");
        
        draw.hasClaimed[msg.sender] = true;
        
        // Transfer prize based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            
            (bool success, ) = msg.sender.call{value: prizeAmount}("");
            require(success, "Prize transfer failed");
            
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, prizeAmount, true, "");
            
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8) {
            // For NFT draws, transfer the NFT
            require(draw.nftTokenIds.length > 0, "No NFT to claim");
            ILSP8(draw.tokenAddress).transfer(address(this), msg.sender, draw.nftTokenIds[0], true, "");
            
            // If there was a ticket price, creator revenue was already paid during execution
        }
        
        emit PrizeClaimed(drawId, msg.sender, prizeAmount);
    }
    
    // Get refund amount for a user
    function getRefundAmount(uint256 drawId, address user) external view returns (uint256) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        if (!draw.isCancelled || !draw.hasParticipated[user] || draw.hasClaimed[user]) {
            return 0;
        }
        
        uint256 userTickets = draw.ticketCount[user];
        uint256 refundAmount = draw.config.ticketPrice * userTickets;
        
        // Deduct monthly pool contribution if applicable
        if (draw.monthlyPoolContribution > 0 && draw.ticketsSold > 0) {
            uint256 userShare = (draw.monthlyPoolContribution * userTickets) / draw.ticketsSold;
            refundAmount -= userShare;
        }
        
        return refundAmount;
    }
    
    // Check if user can claim prize
    function canClaimPrize(uint256 drawId, address user) external view returns (bool canClaim, uint256 amount) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        if (!draw.isCompleted || draw.hasClaimed[user]) {
            return (false, 0);
        }
        
        for (uint256 i = 0; i < draw.winners.length; i++) {
            if (draw.winners[i] == user) {
                return (true, draw.winnerAmounts[i]);
            }
        }
        
        return (false, 0);
    }
}

// Interfaces
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}

interface ILSP8 {
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) external;
}