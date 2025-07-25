// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoFixFacet
 * @notice Facet to fix storage inconsistencies in Gridotto system
 */
contract GridottoFixFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event NextDrawIdFixed(uint256 oldValue, uint256 newValue);
    event StorageInconsistencyFixed(string fixType, uint256 timestamp);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    /**
     * @notice Fix nextDrawId to match the actual number of draws
     * @dev This fixes the mismatch between nextDrawId and totalDrawsCreated
     */
    function fixNextDrawId() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 oldNextDrawId = s.nextDrawId;
        
        // Find the highest existing draw ID
        uint256 highestId = 0;
        for (uint256 i = 1; i <= s.totalDrawsCreated; i++) {
            if (s.draws[i].creator != address(0)) {
                highestId = i;
            }
        }
        
        // Set nextDrawId to highestId + 1
        s.nextDrawId = highestId + 1;
        
        emit NextDrawIdFixed(oldNextDrawId, s.nextDrawId);
        emit StorageInconsistencyFixed("nextDrawId", block.timestamp);
    }
    
    /**
     * @notice Sync nextDrawId with totalDrawsCreated
     * @dev Alternative fix that ensures nextDrawId = totalDrawsCreated + 1
     */
    function syncNextDrawIdWithTotal() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 oldNextDrawId = s.nextDrawId;
        s.nextDrawId = s.totalDrawsCreated + 1;
        
        emit NextDrawIdFixed(oldNextDrawId, s.nextDrawId);
        emit StorageInconsistencyFixed("syncWithTotal", block.timestamp);
    }
    
    /**
     * @notice Get storage diagnostic information
     * @return nextDrawId Current nextDrawId value
     * @return totalDrawsCreated Total draws created
     * @return highestExistingId Highest draw ID that exists
     * @return inconsistencyFound Whether there's an inconsistency
     */
    function getStorageDiagnostics() external view returns (
        uint256 nextDrawId,
        uint256 totalDrawsCreated,
        uint256 highestExistingId,
        bool inconsistencyFound
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        nextDrawId = s.nextDrawId;
        totalDrawsCreated = s.totalDrawsCreated;
        
        // Find highest existing ID
        for (uint256 i = 1; i <= s.totalDrawsCreated; i++) {
            if (s.draws[i].creator != address(0)) {
                highestExistingId = i;
            }
        }
        
        // Check for inconsistency
        inconsistencyFound = (nextDrawId != highestExistingId + 1) || 
                           (nextDrawId != totalDrawsCreated + 1);
    }
    
    /**
     * @notice Manually set nextDrawId (use with extreme caution)
     * @param newNextDrawId The new value for nextDrawId
     */
    function setNextDrawId(uint256 newNextDrawId) external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        require(newNextDrawId > 0, "Invalid ID");
        require(newNextDrawId > s.totalDrawsCreated, "Must be greater than totalDrawsCreated");
        
        uint256 oldValue = s.nextDrawId;
        s.nextDrawId = newNextDrawId;
        
        emit NextDrawIdFixed(oldValue, newNextDrawId);
    }
}