// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/LibGridottoStorage.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title GridottoBatchFacet
 * @notice Batch operations for efficient multi-action execution
 * @dev Simplified version that works with existing storage
 */
contract GridottoBatchFacet {

    // Custom errors
    error InvalidArrayLength();
    error BatchOperationFailed(uint256 index);
    error InsufficientPayment();
    error NoPrizesToClaim();
    error TransferFailed();
    error ReentrancyGuard();

    // Events
    event BatchPrizesClaimed(address indexed user, uint256 totalLYX);
    event BatchTransferCompleted(address indexed from, address[] recipients, uint256[] amounts);

    modifier nonReentrant() {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        if (l.locked) revert ReentrancyGuard();
        l.locked = true;
        _;
        l.locked = false;
    }

    /**
     * @notice Claim all pending prizes (LYX only for now)
     * @return totalLYX Total LYX claimed
     */
    function claimAll() external nonReentrant returns (uint256 totalLYX) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Claim LYX prizes
        totalLYX = l.pendingPrizes[msg.sender];
        if (totalLYX > 0) {
            l.pendingPrizes[msg.sender] = 0;
            (bool success, ) = msg.sender.call{value: totalLYX}("");
            if (!success) revert TransferFailed();
        } else {
            revert NoPrizesToClaim();
        }
        
        emit BatchPrizesClaimed(msg.sender, totalLYX);
        
        return totalLYX;
    }

    /**
     * @notice Send LYX to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send
     */
    function batchTransferLYX(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        if (recipients.length != amounts.length) revert InvalidArrayLength();
        if (recipients.length == 0) revert InvalidArrayLength();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        if (msg.value < totalAmount) revert InsufficientPayment();
        
        // Process transfers
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            if (!success) revert BatchOperationFailed(i);
        }
        
        // Refund excess
        if (msg.value > totalAmount) {
            (bool success, ) = msg.sender.call{value: msg.value - totalAmount}("");
            if (!success) revert TransferFailed();
        }
        
        emit BatchTransferCompleted(msg.sender, recipients, amounts);
    }

    /**
     * @notice Get batch user draw information
     * @param drawIds Array of user draw IDs
     * @return creators Array of draw creators
     * @return endTimes Array of end times
     * @return prizePools Array of prize amounts
     */
    function batchGetUserDrawInfo(
        uint256[] calldata drawIds
    ) external view returns (
        address[] memory creators,
        uint256[] memory endTimes,
        uint256[] memory prizePools
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        creators = new address[](drawIds.length);
        endTimes = new uint256[](drawIds.length);
        prizePools = new uint256[](drawIds.length);
        
        for (uint256 i = 0; i < drawIds.length; i++) {
            uint256 drawId = drawIds[i];
            LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
            
            creators[i] = draw.creator;
            endTimes[i] = draw.endTime;
            prizePools[i] = draw.currentPrizePool;
        }
        
        return (creators, endTimes, prizePools);
    }
}