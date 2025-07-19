// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibOracleStorage {
    bytes32 constant ORACLE_STORAGE_POSITION = keccak256("braveuniverse.oracle.storage");

    struct Layout {
        address oracleAddress;
        bytes32 oracleMethodId;
        bool useBackupRandomness;
        uint256 lastOracleValue;
        uint256 lastOracleTimestamp;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = ORACLE_STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
}