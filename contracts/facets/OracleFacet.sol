// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibOracleStorage} from "../libs/LibOracleStorage.sol";

interface IEntryPointOracle {
    function getMethodData(bytes32 methodId) external view returns (uint256);
}

contract OracleFacet {
    event OracleAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event OracleMethodIdUpdated(bytes32 indexed oldMethodId, bytes32 indexed newMethodId);
    event RandomnessGenerated(uint256 randomValue, bool fromOracle);
    event FallbackModeToggled(bool enabled);

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    // Set oracle address
    function setOracleAddress(address _oracleAddress) external onlyOwner {
        require(_oracleAddress != address(0), "OracleFacet: Invalid address");
        
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        address oldAddress = l.oracleAddress;
        l.oracleAddress = _oracleAddress;
        
        emit OracleAddressUpdated(oldAddress, _oracleAddress);
    }

    // Set oracle method ID
    function setOracleMethodId(bytes32 _methodId) external onlyOwner {
        require(_methodId != bytes32(0), "OracleFacet: Invalid method ID");
        
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        bytes32 oldMethodId = l.oracleMethodId;
        l.oracleMethodId = _methodId;
        
        emit OracleMethodIdUpdated(oldMethodId, _methodId);
    }

    // Toggle fallback mode
    function setFallbackMode(bool _enabled) external onlyOwner {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        l.useFallback = _enabled;
        
        emit FallbackModeToggled(_enabled);
    }

    // Get current oracle configuration
    function getOracleConfig() external view returns (
        address oracleAddress,
        bytes32 methodId,
        bool useFallback,
        uint256 lastValue,
        uint256 lastTimestamp
    ) {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        return (
            l.oracleAddress,
            l.oracleMethodId,
            l.useFallback,
            l.lastOracleValue,
            l.lastOracleTimestamp
        );
    }

    // Generate random number with oracle or fallback
    function getRandomNumber() external returns (uint256) {
        return LibOracleStorage.generateRandomNumber();
    }

    // Generate random number with additional entropy
    function getRandomNumberWithEntropy(bytes32 entropy) external returns (uint256) {
        return LibOracleStorage.generateRandomNumberWithEntropy(entropy);
    }

    // Get random number in range [min, max]
    function getRandomInRange(uint256 min, uint256 max) external returns (uint256) {
        require(max > min, "OracleFacet: Invalid range");
        uint256 random = LibOracleStorage.generateRandomNumber();
        return (random % (max - min + 1)) + min;
    }

    // Get multiple random numbers
    function getMultipleRandomNumbers(uint256 count) external returns (uint256[] memory) {
        require(count > 0 && count <= 10, "OracleFacet: Invalid count");
        
        uint256[] memory randoms = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            randoms[i] = LibOracleStorage.generateRandomNumberWithEntropy(bytes32(i));
        }
        
        return randoms;
    }

    // Shuffle an array using Fisher-Yates algorithm
    function shuffleArray(uint256[] memory array) external returns (uint256[] memory) {
        uint256 n = array.length;
        
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = LibOracleStorage.generateRandomNumber() % (i + 1);
            
            // Swap elements
            uint256 temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        
        return array;
    }

    // Select random winners from participants
    function selectRandomWinners(
        address[] memory participants,
        uint256 winnerCount
    ) external returns (address[] memory) {
        require(winnerCount > 0 && winnerCount <= participants.length, "OracleFacet: Invalid winner count");
        
        // Create indices array
        uint256[] memory indices = new uint256[](participants.length);
        for (uint256 i = 0; i < participants.length; i++) {
            indices[i] = i;
        }
        
        // Shuffle indices
        for (uint256 i = participants.length - 1; i > 0; i--) {
            uint256 j = LibOracleStorage.generateRandomNumber() % (i + 1);
            uint256 temp = indices[i];
            indices[i] = indices[j];
            indices[j] = temp;
        }
        
        // Select winners
        address[] memory winners = new address[](winnerCount);
        for (uint256 i = 0; i < winnerCount; i++) {
            winners[i] = participants[indices[i]];
        }
        
        return winners;
    }

    // Get weighted random selection
    function getWeightedRandom(uint256[] memory weights) external returns (uint256) {
        require(weights.length > 0, "OracleFacet: Empty weights");
        
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        
        require(totalWeight > 0, "OracleFacet: Zero total weight");
        
        uint256 random = LibOracleStorage.generateRandomNumber() % totalWeight;
        uint256 cumulative = 0;
        
        for (uint256 i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return i;
            }
        }
        
        return weights.length - 1;
    }

    // Test oracle connection
    function testOracleConnection() external view returns (bool success, uint256 value) {
        LibOracleStorage.Layout storage l = LibOracleStorage.layout();
        
        if (l.oracleAddress == address(0)) {
            return (false, 0);
        }
        
        try IEntryPointOracle(l.oracleAddress).getMethodData(l.oracleMethodId) returns (uint256 randomValue) {
            return (true, randomValue);
        } catch {
            return (false, 0);
        }
    }
}