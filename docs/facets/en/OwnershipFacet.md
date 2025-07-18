# Facet: OwnershipFacet

### Purpose
Manages ownership of the Diamond contract, providing secure ownership transfer functionality. Implements the ERC173 standard for contract ownership, ensuring proper access control for administrative functions.

### Functions
- `owner()` — Returns the current owner address
- `transferOwnership(address _newOwner)` — Transfers ownership to a new address (only callable by current owner)

### Access Control
- `owner()` is publicly accessible (view function)
- `transferOwnership()` can only be called by the current contract owner
- Protected by the `enforceIsContractOwner()` modifier from LibDiamond
- Ownership is required for Diamond cuts and other administrative functions

### Storage
Uses `LibDiamond` for Diamond storage management. The owner address is stored in the shared Diamond storage structure, accessible across all facets.

### Deployment Details
- **Network**: LUKSO Testnet
- **Address**: `0xc6Ca514Ab32458bf35c04f908463345149a3c6A8`
- **Function Selectors**: `0x8da5cb5b` (owner), `0xf2fde38b` (transferOwnership)