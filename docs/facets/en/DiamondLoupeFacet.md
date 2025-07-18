# Facet: DiamondLoupeFacet

### Purpose
Provides inspection capabilities for the Diamond, allowing users and external contracts to query information about facets, their functions, and supported interfaces. Essential for Diamond transparency and introspection.

### Functions
- `facets()` — Returns all facets and their function selectors
- `facetFunctionSelectors(address _facet)` — Returns function selectors for a specific facet
- `facetAddresses()` — Returns all facet addresses
- `facetAddress(bytes4 _functionSelector)` — Returns the facet address for a specific function selector
- `supportsInterface(bytes4 _interfaceId)` — ERC165 interface support check

### Access Control
- All functions are publicly accessible (view functions)
- No restrictions as these are read-only inspection functions
- Safe for external contracts and dApps to call

### Storage
Uses `LibDiamond` for Diamond storage access. Reads from the shared Diamond storage to provide facet information. No additional storage library required.

### Deployment Details
- **Network**: LUKSO Testnet
- **Address**: `0x8C272e3e0a3B0dB07c152F38981c3a04021a6377`
- **Function Selectors**: `0x7a0ed627`, `0xadfca15e`, `0x52ef6b2c`, `0xcdffacc6`, `0x01ffc9a7`