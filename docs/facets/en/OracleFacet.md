# Facet: OracleFacet

### Purpose
Provides secure random number generation for all games and applications in the BraveUniverse ecosystem. Integrates with an external oracle on mainnet and provides fallback randomness for testnet environments.

### Functions
- `initializeOracle()` — Initializes oracle with default mainnet configuration
- `setOracleAddress(address)` — Updates the oracle contract address (admin only)
- `setOracleMethodID(bytes32)` — Updates the oracle method identifier (admin only)
- `setUseBackupRandomness(bool)` — Toggles fallback randomness mode (admin only)
- `getRandomNumber()` — Generates a random number using oracle or fallback
- `getRandomNumberWithSeed(bytes32)` — Generates random with additional entropy
- `getRandomInRange(uint256,uint256)` — Gets random number within specified range
- `getGameRandomNumber(bytes32,uint256,address)` — Game-specific random generation
- `getOracleData()` — Returns current oracle configuration
- `getOracleAge()` — Returns age of last oracle value in seconds
- `testOracleConnection()` — Tests if oracle is accessible
- `forceUpdateOracle()` — Forces oracle value update (admin only)

### Access Control
- Admin functions: Only contract owner can modify oracle settings
- Public functions: Any contract/user can request random numbers
- Internal usage: Other facets can call random generation functions

### Storage
Uses `LibOracleStorage` to store:
- Oracle contract address
- Oracle method ID
- Backup randomness toggle
- Last oracle value and timestamp

### Events
- `OracleValueUpdated(uint256 value, uint256 timestamp)`
- `OracleAddressChanged(address oldAddress, address newAddress)`
- `OracleMethodIDChanged(bytes32 oldMethodID, bytes32 newMethodID)`
- `BackupRandomnessToggled(bool enabled)`

### Examples
```solidity
// Initialize oracle
oracleFacet.initializeOracle();

// Get random number
uint256 random = oracleFacet.getRandomNumber();

// Get random in range [1, 100]
uint256 diceRoll = oracleFacet.getRandomInRange(1, 100);

// Game-specific random
bytes32 gameId = keccak256("GRIDOTTO");
uint256 gameRandom = oracleFacet.getGameRandomNumber(gameId, roundNumber, player);
```