# Gridotto UI Integration Guide

## Overview

The Gridotto Diamond Proxy contract is deployed at: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

## Current Facet Structure

### 1. GridottoFacet (Main Operations)
- **Address**: Part of Diamond Proxy
- **Functions**:
  - `getUserDraw(drawId)` - Get draw details (⚠️ Has storage mapping issues)
  - `buyUserDrawTicket(drawId, amount)` - Buy tickets for LYX draws
  - `getUserTickets(drawId, user)` - Get user's ticket count
  - `getActiveDraws()` - Get list of active draws
  - `pause()` / `unpause()` - Admin functions
  - `emergencyWithdraw(to, amount)` - Admin function

### 2. GridottoMissingFacet (Draw Creation)
- **Address**: Part of Diamond Proxy
- **Functions**:
  - `createUserDraw()` - Create LYX draws
  - `createTokenDraw()` - Create token draws

### 3. GridottoExecutionFacet (Execution & Claiming)
- **Address**: Part of Diamond Proxy
- **Functions**:
  - `executeUserDraw(drawId)` - Execute a draw
  - `canExecuteDraw(drawId)` - Check if draw can be executed
  - `claimUserDrawPrize(drawId)` - Claim prizes
  - `executeTokenDraw(drawId)` - Execute token draws
  - `claimTokenDrawPrize(drawId)` - Claim token prizes

### 4. GridottoLeaderboardFacet
- **Address**: Part of Diamond Proxy
- **Functions**:
  - `getTopWinners(limit)` - Get top winners
  - `getTopTicketBuyers(limit)` - Get top ticket buyers
  - `getTopDrawCreators(limit)` - Get top draw creators
  - `getTopExecutors(limit)` - Get top executors
  - `getPlatformStats()` - Get platform statistics

### 5. GridottoUIHelperFacet
- **Address**: Part of Diamond Proxy
- **Functions**:
  - `getActiveUserDraws()` - Get active LYX draws
  - `getUserParticipatedDraws(user)` - Get draws user participated in
  - Various other UI helper functions

### 6. AdminFacet
- **Address**: Part of Diamond Proxy
- **Admin only functions**

## Known Issues

### Storage Mapping Issue
There is a storage mapping issue where `getUserDraw()` returns incorrect field mappings:
- `ticketPrice` and `maxTickets` are swapped
- `endTime` returns 0
- Other fields may be incorrectly mapped

**Workaround**: Use alternative view functions or deploy fixed view facets.

## Integration Examples

### 1. Create a Draw
```javascript
const gridottoMissing = await ethers.getContractAt('GridottoMissingFacet', diamondAddress);

const prizeConfig = {
    model: 1, // PARTICIPANT_FUNDED
    creatorContribution: 0,
    addParticipationFees: true,
    participationFeePercent: 8000, // 80%
    totalWinners: 1,
    prizePercentages: [10000], // 100% to winner
    minParticipants: 2,
    gracePeriod: 300 // 5 minutes
};

const tx = await gridottoMissing.createUserDraw(
    2, // USER_LYX
    ethers.parseEther("0.1"), // ticket price
    100, // max tickets
    3600, // duration in seconds
    prizeConfig,
    0, // no requirement
    ethers.ZeroAddress,
    0,
    [],
    { value: 0 }
);
```

### 2. Buy Tickets
```javascript
const gridotto = await ethers.getContractAt('IGridottoFacet', diamondAddress);

await gridotto.buyUserDrawTicket(drawId, ticketAmount, {
    value: ticketPrice * ticketAmount
});
```

### 3. Get Leaderboard Data
```javascript
const leaderboard = await ethers.getContractAt('GridottoLeaderboardFacet', diamondAddress);

const topWinners = await leaderboard.getTopWinners(10);
const platformStats = await leaderboard.getPlatformStats();
```

### 4. Execute and Claim
```javascript
const execution = await ethers.getContractAt('GridottoExecutionFacet', diamondAddress);

// Check if can execute
const canExecute = await execution.canExecuteDraw(drawId);

// Execute draw
if (canExecute) {
    await execution.executeUserDraw(drawId);
}

// Claim prize
await execution.claimUserDrawPrize(drawId);
```

## Important Notes

1. **Draw IDs**: Start from 1 and increment sequentially
2. **Amounts**: All amounts are in wei (use `ethers.parseEther()`)
3. **Duration**: In seconds (3600 = 1 hour)
4. **Percentages**: In basis points (10000 = 100%)
5. **Draw Types**: 
   - 0 = OFFICIAL_DAILY
   - 1 = OFFICIAL_MONTHLY
   - 2 = USER_LYX
   - 3 = USER_LSP7
   - 4 = USER_LSP8

## Recommendations for UI

1. **Use Fixed View Functions**: Due to storage mapping issues, consider deploying and using fixed view facets
2. **Error Handling**: Implement proper error handling for reverted transactions
3. **Event Listening**: Listen to events for real-time updates
4. **Gas Estimation**: Always estimate gas before transactions
5. **Validation**: Validate inputs on frontend before sending transactions

## Testing on Testnet

The contract is deployed on LUKSO Testnet. Use test LYX from faucets for testing.

## Future Improvements

1. Fix storage mapping issues in main facets
2. Consolidate facets for simpler structure
3. Add more comprehensive view functions
4. Improve gas efficiency