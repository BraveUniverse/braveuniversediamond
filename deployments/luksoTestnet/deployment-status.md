# Gridotto Deployment Status - LUKSO Testnet

## Current Status: Phase 3 Completed ✅

### Diamond Address: 0x5Ad808FAE645BA3682170467114e5b80A70bF276

## Phase 1: Core Lottery System ✅
- [x] Diamond proxy pattern implementation
- [x] Official draws (daily/weekly)
- [x] Ticket purchasing with LYX
- [x] Random winner selection
- [x] Prize claiming system
- [x] VIP Pass integration

## Phase 2: User-Created Draws ✅
- [x] User draw creation (LYX prizes)
- [x] Multiple funding models (Creator/Participant/Hybrid)
- [x] Participation requirements
- [x] Draw execution and winner selection
- [x] Executor rewards (5% capped at 5 LYX)
- [x] UI support functions
- [x] Owner fee withdrawal
- [x] Ticket price: 0.01 LYX for testing

## Phase 3: LSP7/LSP8 Token Support ✅
- [x] LSP7 Digital Asset interface
- [x] LSP8 Identifiable Digital Asset interface
- [x] Token draw creation and execution
- [x] NFT draw creation and execution
- [x] Token profit tracking and withdrawal
- [x] Mock LSP7/LSP8 contracts for testing
- [x] Executor rewards for token/NFT draws

## Phase 4: Advanced Features (Pending)
- [ ] Social features (follower requirements)
- [ ] Multi-winner draws
- [ ] Advanced prize distribution models
- [ ] Mainnet deployment

## Latest Updates (Phase 3)

### New Features:
1. **LSP7 Token Draws**:
   - Create draws with LSP7 tokens as prizes
   - Support for all funding models
   - Token transfer automation
   - Executor rewards in tokens (5% max 5 tokens)

2. **LSP8 NFT Draws**:
   - Create draws with LSP8 NFTs as prizes
   - Multi-NFT support per draw
   - Automatic NFT transfer to winner
   - Executor gets LYX rewards from ticket sales

3. **Token Profit Management**:
   - Separate profit tracking for each token
   - `withdrawOwnerTokenProfit()` for platform fees
   - `withdrawCreatorTokenProfit()` for creators
   - View functions for checking balances

### Contract Addresses:
- GridottoFacet: 0x19dD5210C8301db68725D4e1e36B6022BB731C3f
- Mock contracts deployed for testing

### Testing:
- Comprehensive test suite for all token/NFT features
- Integration with existing draw system
- Gas optimization with viaIR enabled