# LUKSO Testnet Deployment

## Deployment Date: December 2024

### Diamond Contract
- **Address**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Explorer**: https://explorer.execution.testnet.lukso.network/address/0x5Ad808FAE645BA3682170467114e5b80A70bF276

### Facets

#### DiamondCutFacet
- **Address**: `0x528B2aD05dB526a2245c6621cB7D320E127d3be8`
- **Purpose**: Manages facet upgrades and modifications

#### DiamondLoupeFacet  
- **Address**: `0xC5B9bb6d38B0f9E908BCa96E2154fF1C5ceca9D1`
- **Purpose**: Provides introspection capabilities

#### OwnershipFacet
- **Address**: `0x6D2E0C2205A0660A6C5F0a0fAAA61D8107cC8260`
- **Purpose**: Manages contract ownership

#### OracleFacet
- **Address**: `0x7440762Df9E369E1b7BA2942d2Bf4605B51880C2`
- **Purpose**: Provides randomness for draws

#### GridottoFacet
- **Address**: `0x1a416e97aDC23b10f2208C92d6DC5113d7dD6528`
- **Purpose**: Lottery/draw functionality

## Configuration

### GridottoFacet Settings
- **Ticket Price**: 0.1 LYX
- **Weekly Draw Interval**: 7 days
- **Monthly Draw Interval**: 30 days
- **Owner Fee**: 5%
- **Monthly Pool**: 20%
- **Draw Pool**: 75%

### VIP Pass Integration
- **Testnet Address**: `0x65EDE8652bEA3e139cAc3683F87230036A30404a`
- **Mainnet Address**: `0x5DD5fF2562ce2De02955eebB967C6094de438428`

## Test Instructions

1. Buy tickets:
```javascript
await gridotto.buyTicket(userAddress, ticketCount, { value: ticketPrice * ticketCount });
```

2. Check ticket balance:
```javascript
const tickets = await gridotto.getUserTicketCount(userAddress);
```

3. Execute draw (owner only):
```javascript
await gridotto.manualDraw();
```

4. Claim prize:
```javascript
await gridotto.claimPrize();
```

## Contract Verification

All contracts are verified on LUKSO testnet explorer.

## Notes

- VIP Pass bonus system is active
- Oracle fallback is enabled for testnet
- Draw execution happens automatically when conditions are met