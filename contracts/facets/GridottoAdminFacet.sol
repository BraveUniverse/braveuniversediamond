// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageSimple.sol";
import "../libs/LibDiamond.sol";

contract GridottoAdminFacet {
    using LibGridottoStorageSimple for LibGridottoStorageSimple.Layout;
    
    // Events
    event SystemPaused();
    event SystemUnpaused();
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event PlatformFeeUpdated(uint256 newFee);
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    // ============ Admin Functions ============
    
    function pause() external onlyOwner {
        LibGridottoStorageSimple.layout().paused = true;
        emit SystemPaused();
    }
    
    function unpause() external onlyOwner {
        LibGridottoStorageSimple.layout().paused = false;
        emit SystemUnpaused();
    }
    
    function isPaused() external view returns (bool) {
        return LibGridottoStorageSimple.layout().paused;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(address(0), balance);
    }
    
    function emergencyWithdrawToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        
        uint256 balance = ILSP7(token).balanceOf(address(this));
        require(balance > 0, "No token balance");
        
        ILSP7(token).transfer(address(this), msg.sender, balance, true, "");
        
        emit EmergencyWithdraw(token, balance);
    }
    
    function withdrawPlatformFees() external onlyOwner {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        uint256 lyxFees = s.platformFeesLYX;
        if (lyxFees > 0) {
            s.platformFeesLYX = 0;
            (bool success, ) = msg.sender.call{value: lyxFees}("");
            require(success, "LYX transfer failed");
        }
    }
    
    function withdrawPlatformTokenFees(address token) external onlyOwner {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        uint256 tokenFees = s.platformFeesToken[token];
        if (tokenFees > 0) {
            s.platformFeesToken[token] = 0;
            ILSP7(token).transfer(address(this), msg.sender, tokenFees, true, "");
        }
    }
    
    function setDefaultPlatformFee(uint256 fee) external onlyOwner {
        require(fee <= 2000, "Fee too high"); // Max 20%
        LibGridottoStorageSimple.layout().defaultPlatformFee = fee;
        emit PlatformFeeUpdated(fee);
    }
    
    function getDefaultPlatformFee() external view returns (uint256) {
        return LibGridottoStorageSimple.layout().defaultPlatformFee;
    }
    
    function getPlatformFeesLYX() external view returns (uint256) {
        return LibGridottoStorageSimple.layout().platformFeesLYX;
    }
    
    function getPlatformFeesToken(address token) external view returns (uint256) {
        return LibGridottoStorageSimple.layout().platformFeesToken[token];
    }
    
    // ============ System Info Functions ============
    
    function getSystemStats() external view returns (
        uint256 totalDrawsCreated,
        uint256 totalTicketsSold,
        uint256 totalPrizesDistributed,
        uint256 totalExecutions
    ) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        return (
            s.totalDrawsCreated,
            s.totalTicketsSold,
            s.totalPrizesDistributed,
            s.totalExecutions
        );
    }
    
    function getNextDrawId() external view returns (uint256) {
        return LibGridottoStorageSimple.layout().nextDrawId;
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address account) external view returns (uint256);
}