# Gridotto Leaderboard System Documentation

## Overview
The Gridotto Leaderboard system provides comprehensive tracking and ranking of platform participants across multiple categories.

## Deployed Contracts

### GridottoLeaderboardFacet
- **Address**: Part of Diamond Proxy at `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Network**: LUKSO Testnet

### GridottoViewFacet  
- **Address**: Part of Diamond Proxy at `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Network**: LUKSO Testnet

### GridottoFixedViewFacet
- **Address**: Part of Diamond Proxy at `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Network**: LUKSO Testnet

### GridottoFixedPurchaseFacet
- **Address**: Part of Diamond Proxy at `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Network**: LUKSO Testnet

## Leaderboard Categories

### 1. Top Winners - Lucky Players 🏆
Tracks players who have won the most prizes.

**Function**: `getTopWinners(uint256 limit)`

**Returns**:
```solidity
struct WinnerInfo {
    address player;
    uint256 totalWinnings;  // Total LYX won
    uint256 drawsWon;       // Number of draws won
    uint256 lastWinTime;    // Timestamp of last win
}
```

### 2. Top Ticket Buyers - Most Active Players 🎫
Tracks players who buy the most tickets.

**Function**: `getTopTicketBuyers(uint256 limit)`

**Returns**:
```solidity
struct BuyerInfo {
    address player;
    uint256 totalTickets;      // Total tickets purchased
    uint256 totalSpent;        // Total LYX spent
    uint256 lastPurchaseTime;  // Last purchase timestamp
}
```

### 3. Top Draw Creators - Business Minds 🎁
Tracks users who create the most draws.

**Function**: `getTopDrawCreators(uint256 limit)`

**Returns**:
```solidity
struct CreatorInfo {
    address creator;
    uint256 drawsCreated;      // Total draws created
    uint256 totalRevenue;      // Total revenue from draws
    uint256 successfulDraws;   // Successfully completed draws
    uint256 successRate;       // Success percentage
}
```

### 4. Top Executors - Speed Demons ⚡
Tracks users who execute draws after they end.

**Function**: `getTopExecutors(uint256 limit)`

**Returns**:
```solidity
struct ExecutorInfo {
    address executor;
    uint256 executionsCount;   // Total executions
    uint256 totalFeesEarned;   // Total fees earned
    uint256 avgExecutionTime;  // Average execution time
}
```

### 5. Platform Statistics 📊
Overall platform metrics.

**Function**: `getPlatformStats()`

**Returns**:
```solidity
struct PlatformStats {
    uint256 totalPrizesDistributed;  // Total LYX distributed
    uint256 totalTicketsSold;        // Total tickets sold
    uint256 totalDrawsCreated;       // Total draws created
    uint256 totalExecutions;         // Total executions
}
```

## View Functions

### Enhanced Draw Information
The GridottoViewFacet provides additional view functions:

#### getDrawTiming
```solidity
function getDrawTiming(uint256 drawId) returns (
    uint256 startTime,
    uint256 endTime,
    bool isActive,
    uint256 timeRemaining
)
```

#### getUserDrawInfo
```solidity
function getUserDrawInfo(uint256 drawId, address user) returns (
    uint256 ticketCount,
    bool hasParticipated,
    uint256 winningChance  // In basis points (100 = 1%)
)
```

#### getDrawParticipantsWithTickets
```solidity
function getDrawParticipantsWithTickets(uint256 drawId) returns (
    address[] participants,
    uint256[] ticketCounts
)
```

#### canExecuteDraw
```solidity
function canExecuteDraw(uint256 drawId) returns (
    bool canExecute,
    string reason
)
```

## Usage Examples

### 1. Get Top Winners
```javascript
const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
const topWinners = await leaderboard.getTopWinners(10);

for (const winner of topWinners) {
    console.log(`${winner.player}: ${ethers.formatEther(winner.totalWinnings)} LYX`);
}
```

### 2. Get Platform Statistics
```javascript
const stats = await leaderboard.getPlatformStats();
console.log(`Total Prizes: ${ethers.formatEther(stats.totalPrizesDistributed)} LYX`);
console.log(`Total Tickets: ${stats.totalTicketsSold}`);
```

### 3. Check Draw Status
```javascript
const viewFacet = await ethers.getContractAt("GridottoViewFacet", diamondAddress);
const [startTime, endTime, isActive, timeRemaining] = await viewFacet.getDrawTiming(drawId);

if (isActive) {
    console.log(`Draw is active, ${timeRemaining} seconds remaining`);
}
```

### 4. Get User's Participation
```javascript
const [tickets, participated, chance] = await viewFacet.getUserDrawInfo(drawId, userAddress);
console.log(`User has ${tickets} tickets (${chance/100}% winning chance)`);
```

## Test Scripts

### Run Complete Working Test
```bash
npx hardhat run scripts/final-working-test.ts --network luksoTestnet
```

### Check Leaderboard Only
```bash
npx hardhat run scripts/simple-leaderboard-test.ts --network luksoTestnet
```

### Debug Draw Data
```bash
npx hardhat run scripts/debug-draw-data.ts --network luksoTestnet
```

## Fixed Functions

### Storage Mapping Issue - RESOLVED
The storage mapping issue has been resolved with new facets:

#### GridottoFixedViewFacet
- ✅ Use `getUserDrawFixed()` for complete draw data
- ✅ Use `isDrawActive()` to check if draw accepts tickets
- ✅ Use `getDrawStats()` for comprehensive statistics
- ✅ Use `getActiveDraws()` to list all active draws

#### GridottoFixedPurchaseFacet
- ✅ Use `buyTicketsFixed()` instead of `buyUserDrawTicket()`
- ✅ Use `getTicketCost()` to calculate purchase cost
- ✅ Use `buyMultipleDrawsFixed()` for batch purchases

## Gas Considerations

Leaderboard functions iterate through historical data and may consume significant gas for large datasets. Consider:
- Limiting query size with the `limit` parameter
- Caching results off-chain for frequent queries
- Using events and indexing for more efficient data retrieval

## Future Improvements

1. **Pagination**: Add pagination support for large result sets
2. **Time Filters**: Add time-based filtering (weekly/monthly leaderboards)
3. **Category Filters**: Filter by draw type or participation requirements
4. **Indexing**: Implement off-chain indexing for better performance
5. **Storage Fix**: Resolve the storage mapping issue in getUserDraw

## Contract Addresses

- **Diamond Proxy**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **GridottoLeaderboardFacet**: Deployed as part of diamond
- **GridottoViewFacet**: Deployed as part of diamond

## Support

For issues or questions:
1. Check the known issues section
2. Review test scripts for usage examples
3. Use the enhanced view functions for accurate data