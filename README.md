# 💎 BraveUniverse Diamond

A modular smart contract system built with **EIP-2535 Diamond Standard** for the BraveUniverse ecosystem on **LUKSO Testnet**.

## 🌟 Features

- **Diamond Proxy Pattern (EIP-2535)** - Upgradeable and modular smart contracts
- **LUKSO Testnet Integration** - Built specifically for LUKSO blockchain
- **Comprehensive Testing** - 100% test coverage with multi-user simulations
- **Gas Optimized** - Optimized for efficient gas usage
- **Access Control** - Role-based permission system
- **Facet Management** - Add, remove, and upgrade contract functions dynamically
- **Gridotto Lottery System** - Complete lottery platform with multiple draw types
- **Upfront Fee Deduction** - Automatic fee collection during ticket purchases
- **Claim Mechanism** - Gas-efficient prize and fee claiming system
- **Multi-Asset Support** - LYX, LSP7 tokens, and LSP8 NFT draws

## 🏗️ Architecture

```
BraveUniverse Diamond
├── DiamondCutFacet               # Facet management (add/remove/replace)
├── DiamondLoupeFacet             # Diamond introspection
├── OwnershipFacet                # Ownership management
├── GridottoCoreV2Facet           # Draw creation and ticket purchases
├── GridottoExecutionV2Facet      # Draw execution and winner selection
├── GridottoPlatformDrawsFacet    # Weekly and monthly platform draws
├── GridottoPrizeClaimFacet       # Prize and fee claiming system
├── GridottoRefundFacet           # Refund handling for cancelled draws
├── GridottoAdminFacetV2          # Admin functions and fee management
├── GridottoLeaderboardFacet      # User statistics and leaderboards
└── GridottoMonthlyTicketsFacet   # Monthly ticket reward system
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.13.1
- npm or yarn
- LUKSO testnet LYX tokens

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd brave-universe-diamond

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Configuration

Edit `.env` file with your private keys:

```bash
# Add your LUKSO testnet private keys (comma separated)
PRIVATE_KEYS=your_private_key_1,your_private_key_2,your_private_key_3

# Optional: Custom RPC endpoint
LUKSO_TESTNET_RPC=https://rpc.testnet.lukso.network
```

## 📋 Available Scripts

```bash
npm run compile          # Compile contracts
npm test                 # Run tests
npm run coverage         # Generate coverage report
npm run gas              # Gas usage analysis
npm run deploy:local     # Deploy to local network
npm run deploy:lukso     # Deploy to LUKSO testnet
```

## 🧪 Testing

The project includes comprehensive tests covering:

- ✅ Diamond deployment and initialization
- ✅ Facet management (add/remove/replace)
- ✅ Access control mechanisms
- ✅ Multi-user interactions
- ✅ ERC165 interface support
- ✅ Ownership transfers

```bash
# Run all tests
npm test

# Run with gas reporting
npm run gas

# Generate coverage report
npm run coverage
```

## 🎯 Deployment

### Local Network

```bash
# Start local node (in separate terminal)
npx hardhat node

# Deploy to local network
npm run deploy:local
```

### LUKSO Testnet

```bash
# Deploy to LUKSO testnet
npm run deploy:lukso
```

Deployment addresses are automatically saved to `deployments/staging/addresses.json`.

## 📁 Project Structure

```
contracts/
├── diamond/
│   └── BraveUniverseDiamond.sol    # Main diamond contract
├── facets/
│   ├── DiamondCutFacet.sol         # Facet management
│   ├── DiamondLoupeFacet.sol       # Diamond introspection
│   └── OwnershipFacet.sol          # Ownership management
├── interfaces/
│   ├── IDiamondCut.sol             # Diamond cut interface
│   ├── IDiamondLoupe.sol           # Diamond loupe interface
│   └── IERC173.sol                 # Ownership interface
└── libs/
    └── LibDiamond.sol              # Diamond storage library

test/
├── BraveUniverseDiamond.test.ts    # Comprehensive tests
└── facets/                         # Future facet tests

scripts/
└── deploy.ts                       # Deployment script

deployments/staging/
└── addresses.json                  # Deployed addresses
```

## 🔧 Development Guidelines

Following BraveUniverse development rules:

- **LUKSO Testnet Only** - No mainnet deployments
- **100% Test Coverage** - All functions must be tested
- **Multi-user Testing** - Simulate multiple wallet interactions
- **Gas Regression Control** - <15% increase per version
- **Access Control Testing** - Explicit permission checks
- **Documentation** - English + Turkish docs required

### ⚠️ Function Selector Rules

**CRITICAL**: Always use Hardhat interface for function selectors!

```typescript
// ❌ WRONG - Manual calculation
const crypto = require('crypto');
const hash = crypto.createHash('sha3-256').update('getGreeting()').digest('hex');

// ✅ CORRECT - Hardhat interface
const Contract = await ethers.getContractFactory("TestFacet");
const selector = Contract.interface.getFunction("getGreeting")?.selector;
```

**Helper Script:**
```bash
# Get correct function selectors
npx hardhat run scripts/helpers/get-selectors-helper.ts
```

## 🎮 BraveUniverse Ecosystem

This diamond serves as the foundation for BraveUniverse game mechanics:

- **Game Facets** - Modular game features
- **Shared Storage** - Cross-facet data sharing
- **Upgradeable Logic** - Add new features without migration
- **Player Management** - Universal player profiles

## 📊 Gas Usage

| Function | Gas Cost | Notes |
|----------|----------|-------|
| Diamond Deployment | ~793,255 | One-time cost |
| Add Facet | ~32,730 | Per facet addition |
| Transfer Ownership | ~33,463 | Ownership change |

## 🔒 Security

- **Access Control** - Owner-only facet management
- **Function Collision Prevention** - Unique selectors enforced
- **Immutable Functions** - Core functions cannot be removed
- **Upgrade Safety** - Safe upgrade mechanisms

## 🎲 Gridotto Lottery System

### Draw Types
1. **Platform Weekly Draw** - 30% fees (20% monthly pool, 5% platform, 5% executor)
2. **Platform Monthly Draw** - 10% fees (5% platform, 5% executor)
3. **User LYX Draw** - 12% fees (5% platform, 5% executor, 2% monthly pool)
4. **User Token Draw** - 10% fees (5% platform, 5% executor)
5. **User NFT Draw** - 10% fees, creator receives 90% LYX, winner gets NFT

### Key Features
- **Upfront Fee Deduction** - Fees collected during ticket purchase
- **Prize Claiming** - Winners claim prizes when convenient
- **Executor Fee Claims** - Executors accumulate and claim fees
- **Monthly Tickets** - Reward system for participation
- **Multi-Asset Support** - LYX, LSP7 tokens, and LSP8 NFTs

### Recent Updates (January 2025)
- ✅ Fixed nextDrawId storage inconsistency
- ✅ Implemented complete upfront fee deduction
- ✅ Added claim mechanism for gas optimization
- ✅ Enhanced NFT draw mechanics
- ✅ Consolidated admin functions

## 🌐 Networks

### LUKSO Testnet
- **Chain ID:** 4201
- **RPC:** https://rpc.testnet.lukso.network
- **Explorer:** https://explorer.execution.testnet.lukso.network
- **Faucet:** https://faucet.testnet.lukso.network
- **Diamond Address:** 0x5Ad808FAE645BA3682170467114e5b80A70bF276

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For questions or support, please open an issue in the repository.

---

**Built with ❤️ for the BraveUniverse ecosystem on LUKSO** 🚀
