# Gridotto System Deployment Summary

## Deployment Date: July 22, 2025

### Network: LUKSO Testnet

## Contract Addresses

- **Diamond Proxy**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

### Current Active Facets (After Restructuring)

1. **GridottoCoreFacet**: `0x8400Ec09EdB6D454A00274176eB3AFc15CCB0aFE`
   - 9 functions
   - Handles: Draw creation, ticket purchase, view functions

2. **GridottoExecutionFacetSimple**: `0x71b49A77325C483d404dE22edaD29E6e164BDB36`
   - 4 functions
   - Handles: Draw execution, prize claiming

3. **GridottoAdminFacetSimple**: `0x6a029f8654334130bA500f05ccc939576D83516f`
   - 13 functions
   - Handles: System administration, fee management

4. **GridottoLeaderboardFacetSimple**: `0xb4DDeC2d27CeEb93883139257Cc367e77D8f5Ca7`
   - 5 functions
   - Handles: Statistics and leaderboards

### Diamond Standard Facets (Unchanged)

- **DiamondCutFacet**: `0x528B2aD05dB526a2245c6621cB7D320E127d3be8`
- **DiamondLoupeFacet**: `0xC5B9bb6d38B0f9E908BCa96E2154fF1C5ceca9D1`
- **OwnershipFacet**: `0x6D2E0C2205A0660A6C5F0a0fAAA61D8107cC8260`

## What Was Fixed

1. **Storage Mapping Issue**: Completely resolved by implementing a new simplified storage structure (`LibGridottoStorageSimple`)
2. **Facet Consolidation**: Reduced from 22 facets to 7 (including Diamond standard facets)
3. **Function Duplication**: Eliminated all duplicate functions
4. **Timestamp Issues**: Fixed by using proper storage layout

## Test Results

Successfully tested:
- ✅ Draw creation (LYX)
- ✅ Ticket purchase
- ✅ Draw execution
- ✅ Prize claiming
- ✅ Leaderboard queries
- ✅ Admin functions

## Important Scripts

- **Deploy**: `npx hardhat run scripts/deploy-simplified-system-v2.ts --network luksoTestnet`
- **Test**: `npx hardhat run scripts/test-simple-draw.ts --network luksoTestnet`
- **Check Status**: `npx hardhat run scripts/check-facet-addresses.ts --network luksoTestnet`

## Documentation

Complete documentation available in: `GRIDOTTO_COMPLETE_DOCUMENTATION.md`

## Notes

- All functions are working correctly on-chain
- The system is ready for UI integration
- Platform fee is set to 5% by default (can be changed by admin)
- Executor receives 10% of the platform fee as reward