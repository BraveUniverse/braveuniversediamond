// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoStorageFixFacet
 * @notice Comprehensive storage fix for nextDrawId inconsistency
 * @dev This facet provides direct storage manipulation to fix the issue
 */
contract GridottoStorageFixFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event StorageFixed(string fixType, uint256 oldValue, uint256 newValue);
    event DebugStorageInfo(string info, uint256 value);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    /**
     * @notice Get complete storage debug information
     */
    function debugStorage() external view returns (
        uint256 nextDrawId,
        uint256 totalDrawsCreated,
        uint256 actualDrawCount,
        bytes32 storageSlot,
        bool hasInconsistency
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        nextDrawId = s.nextDrawId;
        totalDrawsCreated = s.totalDrawsCreated;
        
        // Count actual draws
        for (uint256 i = 1; i <= 100; i++) {
            if (s.draws[i].creator != address(0)) {
                actualDrawCount++;
            }
        }
        
        storageSlot = LibGridottoStorageV2.STORAGE_POSITION;
        hasInconsistency = (nextDrawId <= totalDrawsCreated);
        
        return (nextDrawId, totalDrawsCreated, actualDrawCount, storageSlot, hasInconsistency);
    }
    
    /**
     * @notice Force fix nextDrawId to be totalDrawsCreated + 1
     */
    function forceFixNextDrawId() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 oldNextDrawId = s.nextDrawId;
        uint256 newNextDrawId = s.totalDrawsCreated + 1;
        
        // Direct storage write
        s.nextDrawId = newNextDrawId;
        
        emit StorageFixed("forceFixNextDrawId", oldNextDrawId, newNextDrawId);
        emit DebugStorageInfo("totalDrawsCreated", s.totalDrawsCreated);
        emit DebugStorageInfo("newNextDrawId", s.nextDrawId);
    }
    
    /**
     * @notice Reset nextDrawId based on actual draw count
     */
    function resetBasedOnActualCount() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 oldNextDrawId = s.nextDrawId;
        uint256 highestId = 0;
        
        // Find highest draw ID
        for (uint256 i = 1; i <= 100; i++) {
            if (s.draws[i].creator != address(0)) {
                highestId = i;
            }
        }
        
        uint256 newNextDrawId = highestId + 1;
        s.nextDrawId = newNextDrawId;
        
        // Also fix totalDrawsCreated if needed
        if (s.totalDrawsCreated < highestId) {
            s.totalDrawsCreated = highestId;
        }
        
        emit StorageFixed("resetBasedOnActualCount", oldNextDrawId, newNextDrawId);
    }
    
    /**
     * @notice Nuclear option - manually set both values
     */
    function manualStorageOverride(
        uint256 _nextDrawId,
        uint256 _totalDrawsCreated
    ) external onlyOwner {
        require(_nextDrawId > _totalDrawsCreated, "nextDrawId must be > totalDrawsCreated");
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 oldNextDrawId = s.nextDrawId;
        uint256 oldTotalDrawsCreated = s.totalDrawsCreated;
        
        s.nextDrawId = _nextDrawId;
        s.totalDrawsCreated = _totalDrawsCreated;
        
        emit StorageFixed("manualOverride-nextDrawId", oldNextDrawId, _nextDrawId);
        emit StorageFixed("manualOverride-totalDrawsCreated", oldTotalDrawsCreated, _totalDrawsCreated);
    }
    
    /**
     * @notice Verify the fix by checking all storage values
     */
    function verifyStorageConsistency() external view returns (
        bool isConsistent,
        string memory message,
        uint256 nextDrawId,
        uint256 totalDrawsCreated,
        uint256 expectedNextDrawId
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        nextDrawId = s.nextDrawId;
        totalDrawsCreated = s.totalDrawsCreated;
        expectedNextDrawId = totalDrawsCreated + 1;
        
        if (nextDrawId == expectedNextDrawId) {
            isConsistent = true;
            message = "Storage is consistent";
        } else if (nextDrawId < expectedNextDrawId) {
            isConsistent = false;
            message = "nextDrawId is too low";
        } else {
            isConsistent = true;
            message = "nextDrawId is higher than expected but safe";
        }
        
        return (isConsistent, message, nextDrawId, totalDrawsCreated, expectedNextDrawId);
    }
}