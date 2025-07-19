# VIP Pass Contract Addresses

## Network Addresses

| Network | Address | Explorer |
|---------|---------|----------|
| **LUKSO Mainnet** | `0x5DD5fF2562ce2De02955eebB967C6094de438428` | [View on Explorer](https://explorer.lukso.network/address/0x5DD5fF2562ce2De02955eebB967C6094de438428) |
| **LUKSO Testnet** | `0x65EdE8652BEa3E139CaC3683f87230036A30404a` | [View on Explorer](https://explorer.execution.testnet.lukso.network/address/0x65EdE8652BEa3E139CaC3683f87230036A30404a) |

## VIP Tiers

| Tier | Value | Name | Bonus Multiplier |
|------|-------|------|------------------|
| 0 | NO_TIER | None | 0x |
| 1 | SILVER_TIER | Silver | 1.2x |
| 2 | GOLD_TIER | Gold | 1.5x |
| 3 | DIAMOND_TIER | Diamond | 2x |
| 4 | UNIVERSE_TIER | Universe | 3x |

## Interface

```solidity
interface IVIPPass {
    function getHighestTierOwned(address owner) external view returns (uint8);
}
```

## GridottoFacet VIP Bonus System

### Ticket Bonuses by Tier:
- **Silver (Tier 1)**: 1 bonus ticket when buying 5+ tickets
- **Gold (Tier 2)**: 1 bonus ticket for every 3 tickets
- **Diamond (Tier 3)**: 1 bonus ticket for every 2 tickets  
- **Universe (Tier 4)**: Double tickets (1:1 bonus)

### Fee Discounts by Tier:
- **Silver**: 20% platform fee discount
- **Gold**: 40% platform fee discount
- **Diamond**: 60% platform fee discount
- **Universe**: 80% platform fee discount

## Usage in Code

```solidity
// Get VIP Pass address based on network
address vipPassAddress = block.chainid == 42 
    ? 0x65EdE8652BEa3E139CaC3683f87230036A30404a  // Testnet
    : 0x5DD5fF2562ce2De02955eebB967C6094de438428; // Mainnet
```