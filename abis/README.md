# Gridotto V2 ABIs

This directory contains the Application Binary Interfaces (ABIs) for all Gridotto V2 contracts.

## Diamond Contract
- **GridottoDiamond.json** - Combined ABI for the entire Diamond proxy contract

## Facets
- **DiamondCutFacet.json** - Diamond upgrade functionality
- **DiamondLoupeFacet.json** - Diamond introspection
- **OwnershipFacet.json** - Ownership management
- **GridottoCoreV2Facet.json** - Core draw creation and ticket purchase
- **GridottoExecutionV2Facet.json** - Draw execution and prize claiming
- **GridottoPlatformDrawsFacet.json** - Platform weekly/monthly draws
- **GridottoRefundFacet.json** - Refund functionality
- **GridottoAdminFacet.json** - Admin controls
- **GridottoLeaderboardFacet.json** - Leaderboard queries
- **GridottoDebugFacet.json** - Debug utilities
- **OracleFacet.json** - Random number generation

## Mock Contracts (for testing)
- **MockLSP7.json** - Mock LSP7 token
- **MockLSP8.json** - Mock LSP8 NFT

## Usage

### JavaScript/TypeScript
```javascript
const diamondABI = require('./GridottoDiamond.json');
const diamondContract = new ethers.Contract(DIAMOND_ADDRESS, diamondABI, signer);
```

### Individual Facets
```javascript
const coreABI = require('./GridottoCoreV2Facet.json');
// Use with the same Diamond address
const coreContract = new ethers.Contract(DIAMOND_ADDRESS, coreABI, signer);
```

## Contract Addresses (LUKSO Testnet)
- Diamond: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
