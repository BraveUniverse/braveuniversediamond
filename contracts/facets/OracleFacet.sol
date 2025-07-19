// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibOracleStorage} from "../libs/LibOracleStorage.sol";

contract OracleFacet {
    event OracleValueUpdated(uint256 value, uint256 timestamp);
    event OracleAddressChanged(address oldAddress, address newAddress);
    event OracleMethodIDChanged(bytes32 oldMethodID, bytes32 newMethodID);
    event BackupRandomnessToggled(bool enabled);

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    // Initialize oracle with default values (Gridotto'daki değerler)
    function initializeOracle() external onlyOwner {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        
        // Gridotto'daki default değerler
        l.oracleAddress = 0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71;
        l.oracleMethodId = 0xf1bd2bfee10cc719fb50dbbe6ca6a3a36e2786f6aab5008f8bb28038241816db;
        l.useBackupRandomness = true;
        
        // İlk oracle değerini güncelle
        _updateOracleValue();
    }

    // Set oracle address
    function setOracleAddress(address newOracleAddress) external onlyOwner {
        require(newOracleAddress != address(0), "Oracle address cannot be zero address");
        
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        address oldAddress = l.oracleAddress;
        l.oracleAddress = newOracleAddress;
        
        emit OracleAddressChanged(oldAddress, newOracleAddress);
    }

    // Set oracle method ID
    function setOracleMethodID(bytes32 newMethodId) external onlyOwner {
        require(newMethodId != bytes32(0), "Method ID cannot be zero");
        
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        bytes32 oldMethodID = l.oracleMethodId;
        l.oracleMethodId = newMethodId;
        
        emit OracleMethodIDChanged(oldMethodID, newMethodId);
    }

    // Toggle backup randomness
    function setUseBackupRandomness(bool enabled) external onlyOwner {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        l.useBackupRandomness = enabled;
        
        emit BackupRandomnessToggled(enabled);
    }

    // Internal function to update oracle value
    function _updateOracleValue() internal returns (uint256) {
        // For testing, always use fallback
        return _generateFallbackRandom();
    }

    // Generate fallback random number
    function _generateFallbackRandom() internal returns (uint256) {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        
        // Always generate new random for testing
        l.lastOracleValue = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            msg.sender,
            l.lastOracleValue // Use previous value as additional entropy
        ))) % 900000000 + 100000000;
        l.lastOracleTimestamp = block.timestamp;
        emit OracleValueUpdated(l.lastOracleValue, block.timestamp);
        
        return l.lastOracleValue;
    }

    // Get random number (public function for other facets)
    function getRandomNumber() external returns (uint256) {
        return _updateOracleValue();
    }

    // Get random number with seed (for better randomness)
    function getRandomNumberWithSeed(bytes32 seed) external returns (uint256) {
        uint256 oracleValue = _updateOracleValue();
        
        return uint256(keccak256(abi.encodePacked(
            oracleValue,
            block.timestamp,
            block.prevrandao,
            msg.sender,
            seed
        )));
    }

    // Get random number in range
    function getRandomInRange(uint256 min, uint256 max) external returns (uint256) {
        require(max > min, "Invalid range");
        uint256 randomValue = _updateOracleValue();
        return (randomValue % (max - min + 1)) + min;
    }

    // Complex random for games (Gridotto tarzı)
    function getGameRandomNumber(
        bytes32 gameId,
        uint256 roundNumber,
        address player
    ) external returns (uint256) {
        uint256 oracleValue = _updateOracleValue();
        
        return uint256(keccak256(abi.encodePacked(
            oracleValue,
            block.timestamp,
            block.prevrandao,
            player,
            gameId,
            roundNumber,
            blockhash(block.number - 1)
        )));
    }

    // Get oracle data
    function getOracleData() external view returns (
        address oracleAddress,
        bytes32 methodId,
        bool useBackupRandomness,
        uint256 lastValue,
        uint256 lastTimestamp
    ) {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        return (
            l.oracleAddress,
            l.oracleMethodId,
            l.useBackupRandomness,
            l.lastOracleValue,
            l.lastOracleTimestamp
        );
    }

    // Get oracle age (how old is the last value)
    function getOracleAge() external view returns (uint256) {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        if (l.lastOracleTimestamp == 0) return type(uint256).max;
        return block.timestamp - l.lastOracleTimestamp;
    }

    // Test oracle connection
    function testOracleConnection() external pure returns (bool success, uint256 value) {
        // For testing, always return false (no real oracle)
        return (false, 0);
    }

    // Force update oracle value (for testing)
    function forceUpdateOracle() external onlyOwner returns (uint256) {
        return _updateOracleValue();
    }
}