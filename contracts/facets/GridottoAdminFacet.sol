// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

contract GridottoAdminFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event SystemPaused(bool paused);
    event PlatformFeesWithdrawn(uint256 amount);
    event TokenFeesWithdrawn(address token, uint256 amount);
    event EmergencyWithdraw(address token, uint256 amount);
    event FeePercentagesUpdated(uint256 platform, uint256 executor, uint256 monthly, uint256 weeklyMonthly);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    // System Control
    function pauseSystem() external onlyOwner {
        LibGridottoStorageV2.layout().paused = true;
        emit SystemPaused(true);
    }
    
    function unpauseSystem() external onlyOwner {
        LibGridottoStorageV2.layout().paused = false;
        emit SystemPaused(false);
    }
    
    function isPaused() external view returns (bool) {
        return LibGridottoStorageV2.layout().paused;
    }
    
    // Fee Management
    function withdrawPlatformFees() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 amount = s.platformFeesLYX;
        require(amount > 0, "No fees to withdraw");
        
        s.platformFeesLYX = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit PlatformFeesWithdrawn(amount);
    }
    
    function withdrawTokenFees(address token) external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 amount = s.platformFeesToken[token];
        require(amount > 0, "No fees to withdraw");
        
        s.platformFeesToken[token] = 0;
        // Transfer token fees (would need ILSP7 interface)
        
        emit TokenFeesWithdrawn(token, amount);
    }
    
    function getPlatformFeesLYX() external view returns (uint256) {
        return LibGridottoStorageV2.layout().platformFeesLYX;
    }
    
    function getPlatformFeesToken(address token) external view returns (uint256) {
        return LibGridottoStorageV2.layout().platformFeesToken[token];
    }
    
    // Fee Configuration
    function setFeePercentages(
        uint256 defaultPlatformFee,
        uint256 executorFeePercent,
        uint256 monthlyPoolPercent,
        uint256 weeklyMonthlyPercent
    ) external onlyOwner {
        require(defaultPlatformFee <= 2000, "Platform fee too high"); // Max 20%
        require(executorFeePercent <= 1000, "Executor fee too high"); // Max 10%
        require(monthlyPoolPercent <= 500, "Monthly pool too high"); // Max 5%
        require(weeklyMonthlyPercent <= 3000, "Weekly monthly too high"); // Max 30%
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        s.defaultPlatformFee = defaultPlatformFee;
        s.executorFeePercent = executorFeePercent;
        s.monthlyPoolPercent = monthlyPoolPercent;
        s.weeklyMonthlyPercent = weeklyMonthlyPercent;
        
        emit FeePercentagesUpdated(defaultPlatformFee, executorFeePercent, monthlyPoolPercent, weeklyMonthlyPercent);
    }
    
    // System Statistics
    function getSystemStats() external view returns (
        uint256 totalDrawsCreated,
        uint256 totalTicketsSold,
        uint256 totalPrizesDistributed,
        uint256 totalExecutions
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        return (
            s.totalDrawsCreated,
            s.totalTicketsSold,
            s.totalPrizesDistributed,
            s.totalExecutions
        );
    }
    
    // Get next draw ID
    function getNextDrawId() external view returns (uint256) {
        return LibGridottoStorageV2.layout().nextDrawId;
    }
    
    // Platform Statistics (alias for getSystemStats with additional data)
    function getPlatformStatistics() external view returns (
        uint256 totalDrawsCreated,
        uint256 totalTicketsSold,
        uint256 totalPrizesDistributed,
        uint256 totalExecutions,
        uint256 platformFeesLYX,
        uint256 monthlyPoolBalance,
        uint256 currentWeeklyDrawId,
        uint256 currentMonthlyDrawId
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        return (
            s.totalDrawsCreated,
            s.totalTicketsSold,
            s.totalPrizesDistributed,
            s.totalExecutions,
            s.platformFeesLYX,
            s.monthlyPoolBalance,
            s.currentWeeklyDrawId,
            s.currentMonthlyDrawId
        );
    }
    
    // Emergency Functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdraw(address(0), balance);
    }
    
    // Draw Management
    function forceExecuteDraw(uint256 drawId) external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Draw ended");
        
        // Force execution even if conditions not met
        draw.endTime = block.timestamp - 1;
    }
}