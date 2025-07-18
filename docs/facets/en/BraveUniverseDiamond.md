# Facet: BraveUniverseDiamond

### Purpose
Main Diamond contract for the BraveUniverse ecosystem. Implements the EIP-2535 Diamond proxy pattern, providing a modular smart contract system that enables upgradeable facets and shared storage. Acts as the central hub for all BraveUniverse functionality.

### Functions
- `fallback()` — Delegates all function calls to appropriate facets using the Diamond proxy pattern
- `receive()` — Accepts ETH transfers to the diamond contract

### Access Control
- Fallback function can be called by anyone, but actual access control is enforced by individual facets
- Only functions that exist in registered facets can be called
- Ownership and administrative functions are handled by the OwnershipFacet

### Storage
Uses `LibDiamond` for Diamond storage management, including facet registry, function selectors, and ERC165 interface support. The Diamond storage is shared across all facets using the Diamond storage pattern.

### Deployment Details
- **Network**: LUKSO Testnet
- **Address**: `0xda142c5978D707E83618390F4f8796bD7eb3a790`
- **Initial Facets**: DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet