// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IOracleFacet.sol";

contract GridottoResetFacet {
    event SystemReset();
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event DrawReset(uint256 drawId);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    // Complete system reset - DANGEROUS!
    function resetSystem() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        // Reset draw management
        uint256 currentDrawId = s.nextDrawId;
        s.nextDrawId = 1; // Start from 1 again
        
        // Clear platform draw IDs
        s.currentWeeklyDrawId = 0;
        s.currentMonthlyDrawId = 0;
        s.weeklyDrawCount = 0;
        
        // Reset all balances
        s.platformFeesLYX = 0;
        s.monthlyPoolBalance = 0;
        
        // Reset global stats
        s.totalTicketsSold = 0;
        s.totalExecutions = 0;
        s.totalPrizesDistributed = 0;
        
        // Clear monthly participants
        delete s.monthlyParticipants;
        
        // Note: We cannot easily clear all mappings, but setting nextDrawId = 1
        // effectively makes old draws inaccessible
        
        emit SystemReset();
    }
    
    // Withdraw all contract funds and distribute
    function emergencyWithdrawAndDistribute(
        address recipient1,
        address recipient2,
        address recipient3
    ) external onlyOwner {
        require(recipient1 != address(0) && recipient2 != address(0) && recipient3 != address(0), "Invalid recipients");
        
        uint256 totalBalance = address(this).balance;
        require(totalBalance > 0, "No funds");
        
        uint256 amountPerRecipient = totalBalance / 3;
        uint256 remainder = totalBalance - (amountPerRecipient * 3);
        
        // Send to first recipient with remainder
        (bool success1, ) = recipient1.call{value: amountPerRecipient + remainder}("");
        require(success1, "Transfer 1 failed");
        emit FundsWithdrawn(recipient1, amountPerRecipient + remainder);
        
        // Send to second recipient
        (bool success2, ) = recipient2.call{value: amountPerRecipient}("");
        require(success2, "Transfer 2 failed");
        emit FundsWithdrawn(recipient2, amountPerRecipient);
        
        // Send to third recipient
        (bool success3, ) = recipient3.call{value: amountPerRecipient}("");
        require(success3, "Transfer 3 failed");
        emit FundsWithdrawn(recipient3, amountPerRecipient);
    }
    
    // Get system info before reset
    function getSystemInfo() external view returns (
        uint256 nextDrawId,
        uint256 weeklyDrawId,
        uint256 monthlyDrawId,
        uint256 platformFeesLYX,
        uint256 monthlyPoolBalance,
        uint256 contractBalance
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        return (
            s.nextDrawId,
            s.currentWeeklyDrawId,
            s.currentMonthlyDrawId,
            s.platformFeesLYX,
            s.monthlyPoolBalance,
            address(this).balance
        );
    }
}