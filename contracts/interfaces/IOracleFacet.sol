// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracleFacet {
    // Events
    event OracleValueUpdated(uint256 value, uint256 timestamp);
    event OracleAddressChanged(address oldAddress, address newAddress);
    event OracleMethodIDChanged(bytes32 oldMethodID, bytes32 newMethodID);
    event BackupRandomnessToggled(bool enabled);

    // Admin functions
    function initializeOracle() external;
    function setOracleAddress(address newOracleAddress) external;
    function setOracleMethodID(bytes32 newMethodId) external;
    function setUseBackupRandomness(bool enabled) external;
    function forceUpdateOracle() external returns (uint256);

    // Random generation functions
    function getRandomNumber() external returns (uint256);
    function getRandomNumberWithSeed(bytes32 seed) external returns (uint256);
    function getRandomInRange(uint256 min, uint256 max) external returns (uint256);
    function getGameRandomNumber(
        bytes32 gameId,
        uint256 roundNumber,
        address player
    ) external returns (uint256);

    // View functions
    function getOracleData() external view returns (
        address oracleAddress,
        bytes32 methodId,
        bool useBackupRandomness,
        uint256 lastValue,
        uint256 lastTimestamp
    );
    function getOracleAge() external view returns (uint256);
    function testOracleConnection() external view returns (bool success, uint256 value);
}