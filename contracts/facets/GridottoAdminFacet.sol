// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoAdminFacet
 * @notice Admin functions for managing the Gridotto system
 */
contract GridottoAdminFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event Paused();
    event Unpaused();
    event DrawIntervalUpdated(uint256 newInterval);
    event FeePercentagesUpdated(uint256 ownerFee, uint256 monthlyPoolFee);
    event EmergencyWithdraw(address to, uint256 amount);
    event OwnerProfitWithdrawn(uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        LibGridottoStorage.layout().paused = true;
        emit Paused();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        LibGridottoStorage.layout().paused = false;
        emit Unpaused();
    }
    
    /**
     * @notice Set paused state
     * @param paused Whether to pause or unpause
     */
    function setPaused(bool paused) external onlyOwner {
        LibGridottoStorage.layout().paused = paused;
        if (paused) {
            emit Paused();
        } else {
            emit Unpaused();
        }
    }
    
    /**
     * @notice Emergency withdraw funds
     * @param to Address to send funds to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(to, amount);
    }
    
    /**
     * @notice Withdraw owner profit
     */
    function withdrawOwnerProfit() external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 profit = l.ownerProfit;
        
        require(profit > 0, "No profit to withdraw");
        
        l.ownerProfit = 0;
        
        (bool success, ) = msg.sender.call{value: profit}("");
        require(success, "Transfer failed");
        
        emit OwnerProfitWithdrawn(profit);
    }
    
    /**
     * @notice Set draw intervals
     * @param daily Daily draw interval in seconds
     * @param monthly Monthly draw interval in seconds
     */
    function setDrawIntervals(uint256 daily, uint256 monthly) external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        require(daily >= 1 hours, "Daily interval too short");
        require(monthly >= 1 days, "Monthly interval too short");
        
        l.drawInterval = daily;
        l.monthlyDrawInterval = monthly;
        
        emit DrawIntervalUpdated(daily);
    }
    
    /**
     * @notice Set fee percentages
     * @param ownerFee Owner fee percentage (basis points)
     * @param monthlyPoolFee Monthly pool fee percentage (basis points)
     */
    function setFeePercentages(uint256 ownerFee, uint256 monthlyPoolFee) external onlyOwner {
        require(ownerFee + monthlyPoolFee <= 10000, "Total fees exceed 100%");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.ownerFeePercent = ownerFee;
        l.monthlyPoolPercent = monthlyPoolFee;
        
        emit FeePercentagesUpdated(ownerFee, monthlyPoolFee);
    }
    
    /**
     * @notice Set ticket price for official draws
     * @param newPrice New ticket price in LYX
     */
    function setTicketPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        
        LibGridottoStorage.layout().ticketPrice = newPrice;
    }
    
    /**
     * @notice Cancel a draw as admin
     * @param drawId The ID of the draw to cancel
     * @param reason Reason for cancellation
     */
    function cancelDrawAsAdmin(uint256 drawId, string memory reason) external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw already cancelled");
        
        draw.isCancelled = true;
        
        // Refund all participants
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 ticketCount = draw.userTickets[participant];
            
            if (ticketCount > 0) {
                uint256 refundAmount = draw.ticketPrice * ticketCount;
                
                if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                    (bool success, ) = participant.call{value: refundAmount}("");
                    require(success, "Refund failed");
                } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                    ILSP7 token = ILSP7(draw.prizeToken);
                    token.transfer(address(this), participant, refundAmount, true, "");
                }
            }
        }
        
        // Refund creator contribution
        if (draw.initialPrize > 0) {
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
                require(success, "Creator refund failed");
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                ILSP7 token = ILSP7(draw.prizeToken);
                token.transfer(address(this), draw.creator, draw.initialPrize, true, "");
            }
        }
    }
    

    
    /**
     * @notice Get owner LYX profit
     * @return profit Amount of LYX profit available
     */
    function getOwnerProfit() external view returns (uint256 profit) {
        return LibGridottoStorage.layout().ownerProfit;
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}