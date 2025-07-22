# Gridotto Leaderboard System 🏆

## Overview

The Gridotto Leaderboard system provides comprehensive statistics and rankings for all participants in the lottery platform. It tracks winners, ticket buyers, draw creators, and executors across four distinct categories.

## Categories

### 🏆 Top Winners - Lucky Players
Tracks players who have won draws, sorted by total winnings.

**Data Tracked:**
- Total winnings in LYX
- Number of draws won
- Last win timestamp

**Theme:** Yellow gradient

### 🎫 Top Ticket Buyers - Most Active Players
Tracks players who purchase tickets, sorted by total tickets bought.

**Data Tracked:**
- Total tickets purchased
- Total LYX spent
- Last purchase timestamp

**Theme:** Blue gradient

### 🎁 Top Draw Creators - Business Minds
Tracks users who create draws, sorted by number of draws created.

**Data Tracked:**
- Number of draws created
- Total revenue earned (creator fees)
- Successful draws count
- Success rate percentage

**Theme:** Purple gradient

### ⚡ Top Executors - Speed Demons
Tracks users who execute draws after they end, sorted by execution count.

**Data Tracked:**
- Number of draws executed
- Total fees earned (5% execution fee)
- Total execution time
- Average execution time

**Theme:** Green gradient

## Smart Contract Functions

### Deployed Contract
- **Facet Address:** `0x3Ce5Be0C8E6159CA140f767a6185C9938DbE2ABa`
- **Diamond Address:** `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

### Available Functions

#### 1. `getTopWinners(uint256 limit)`
Returns the top N winners sorted by total winnings.

```solidity
struct WinnerStats {
    address player;
    uint256 totalWinnings;
    uint256 drawsWon;
    uint256 lastWinTime;
}
```

**Example Usage:**
```javascript
const topWinners = await leaderboard.getTopWinners(10);
```

#### 2. `getTopTicketBuyers(uint256 limit)`
Returns the top N ticket buyers sorted by total tickets purchased.

```solidity
struct TicketBuyerStats {
    address player;
    uint256 totalTickets;
    uint256 totalSpent;
    uint256 lastPurchaseTime;
}
```

**Example Usage:**
```javascript
const topBuyers = await leaderboard.getTopTicketBuyers(10);
```

#### 3. `getTopDrawCreators(uint256 limit)`
Returns the top N draw creators sorted by draws created.

```solidity
struct DrawCreatorStats {
    address creator;
    uint256 drawsCreated;
    uint256 totalRevenue;
    uint256 successfulDraws;
    uint256 successRate;
}
```

**Example Usage:**
```javascript
const topCreators = await leaderboard.getTopDrawCreators(10);
```

#### 4. `getTopExecutors(uint256 limit)`
Returns the top N executors sorted by execution count.

```solidity
struct ExecutorStats {
    address executor;
    uint256 executionsCount;
    uint256 totalFeesEarned;
    uint256 totalExecutionTime;
    uint256 avgExecutionTime;
}
```

**Example Usage:**
```javascript
const topExecutors = await leaderboard.getTopExecutors(10);
```

#### 5. `getPlatformStats()`
Returns overall platform statistics.

```solidity
struct PlatformStats {
    uint256 totalPrizesDistributed;
    uint256 totalTicketsSold;
    uint256 totalDrawsCreated;
    uint256 totalExecutions;
}
```

**Example Usage:**
```javascript
const platformStats = await leaderboard.getPlatformStats();
```

## Integration Example

### JavaScript/TypeScript Integration

```javascript
import { ethers } from 'ethers';

// Connect to the contract
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.lukso.network');
const leaderboardAddress = '0x5Ad808FAE645BA3682170467114e5b80A70bF276';
const leaderboardABI = [...]; // Add ABI

const leaderboard = new ethers.Contract(
    leaderboardAddress,
    leaderboardABI,
    provider
);

// Fetch all leaderboard data
async function fetchLeaderboardData() {
    try {
        // Get platform stats
        const platformStats = await leaderboard.getPlatformStats();
        console.log('Platform Stats:', {
            totalPrizes: ethers.formatEther(platformStats.totalPrizesDistributed),
            ticketsSold: platformStats.totalTicketsSold.toString(),
            drawsCreated: platformStats.totalDrawsCreated.toString(),
            executions: platformStats.totalExecutions.toString()
        });

        // Get top winners
        const winners = await leaderboard.getTopWinners(10);
        console.log('Top Winners:', winners.map(w => ({
            address: w.player,
            winnings: ethers.formatEther(w.totalWinnings),
            wins: w.drawsWon.toString()
        })));

        // Get top ticket buyers
        const buyers = await leaderboard.getTopTicketBuyers(10);
        console.log('Top Buyers:', buyers.map(b => ({
            address: b.player,
            tickets: b.totalTickets.toString(),
            spent: ethers.formatEther(b.totalSpent)
        })));

        // Get top creators
        const creators = await leaderboard.getTopDrawCreators(10);
        console.log('Top Creators:', creators.map(c => ({
            address: c.creator,
            draws: c.drawsCreated.toString(),
            revenue: ethers.formatEther(c.totalRevenue),
            successRate: c.successRate.toString() + '%'
        })));

        // Get top executors
        const executors = await leaderboard.getTopExecutors(10);
        console.log('Top Executors:', executors.map(e => ({
            address: e.executor,
            executions: e.executionsCount.toString(),
            fees: ethers.formatEther(e.totalFeesEarned),
            avgTime: e.avgExecutionTime.toString() + 's'
        })));

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function GridottoLeaderboard() {
    const [winners, setWinners] = useState([]);
    const [buyers, setBuyers] = useState([]);
    const [creators, setCreators] = useState([]);
    const [executors, setExecutors] = useState([]);
    const [platformStats, setPlatformStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboardData();
    }, []);

    const fetchLeaderboardData = async () => {
        try {
            // Contract setup
            const provider = new ethers.BrowserProvider(window.ethereum);
            const leaderboard = new ethers.Contract(address, abi, provider);

            // Fetch all data in parallel
            const [winnersData, buyersData, creatorsData, executorsData, stats] = 
                await Promise.all([
                    leaderboard.getTopWinners(10),
                    leaderboard.getTopTicketBuyers(10),
                    leaderboard.getTopDrawCreators(10),
                    leaderboard.getTopExecutors(10),
                    leaderboard.getPlatformStats()
                ]);

            setWinners(winnersData);
            setBuyers(buyersData);
            setCreators(creatorsData);
            setExecutors(executorsData);
            setPlatformStats(stats);
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    if (loading) return <div>Loading leaderboard...</div>;

    return (
        <div className="leaderboard-container">
            {/* Platform Stats */}
            <div className="platform-stats">
                <h2>📈 Platform Statistics</h2>
                <div className="stats-grid">
                    <div>Total Prizes: {ethers.formatEther(platformStats.totalPrizesDistributed)} LYX</div>
                    <div>Tickets Sold: {platformStats.totalTicketsSold.toString()}</div>
                    <div>Draws Created: {platformStats.totalDrawsCreated.toString()}</div>
                    <div>Executions: {platformStats.totalExecutions.toString()}</div>
                </div>
            </div>

            {/* Winners Section */}
            <div className="leaderboard-section winners">
                <h3>🏆 Top Winners</h3>
                {winners.map((winner, i) => (
                    <div key={i} className="leaderboard-item">
                        <span className="rank">#{i + 1}</span>
                        <span className="address">{winner.player}</span>
                        <span className="value">{ethers.formatEther(winner.totalWinnings)} LYX</span>
                        <span className="extra">Won {winner.drawsWon} draws</span>
                    </div>
                ))}
            </div>

            {/* Add similar sections for buyers, creators, and executors */}
        </div>
    );
}
```

## Testing the Leaderboard

### 1. Deploy the Leaderboard Facet
```bash
npx hardhat run scripts/deploy-leaderboard-facet.ts --network luksoTestnet
```

### 2. Create Test Data
```bash
# Create test draws
npx hardhat run scripts/create-test-draws.ts --network luksoTestnet

# Test leaderboard functions
npx hardhat run scripts/test-leaderboard.ts --network luksoTestnet
```

### 3. Verify Deployment
```javascript
// Check if functions are available
const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
const selector = ethers.id("getTopWinners(uint256)").slice(0, 10);
const facetAddress = await diamondLoupe.facetAddress(selector);
console.log("Leaderboard facet:", facetAddress);
```

## Gas Optimization

The leaderboard functions are view-only and don't consume gas when called. However, they iterate through all draws which could be expensive for large datasets. Consider:

1. **Pagination**: Implement off-chain caching for large datasets
2. **Indexing**: Use events and off-chain indexing for better performance
3. **Limits**: Always specify reasonable limits (e.g., top 10-20)

## Future Enhancements

1. **Time-based Leaderboards**: Weekly/Monthly rankings
2. **Category Filters**: Filter by draw type (LYX/Token/NFT)
3. **Achievement System**: Badges for milestones
4. **Referral Tracking**: Track and reward referrals
5. **Historical Data**: Track performance over time
6. **Social Features**: Follow top players
7. **Prize Pool Contributions**: Track biggest contributors

## Security Considerations

1. **View-Only**: All functions are read-only, no state changes
2. **Gas Limits**: Functions may fail with too much data
3. **Privacy**: All data is public on blockchain
4. **Front-running**: Not applicable (view functions)

## Contract Addresses

- **Diamond Proxy**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Leaderboard Facet**: `0x3Ce5Be0C8E6159CA140f767a6185C9938DbE2ABa`
- **Network**: LUKSO Testnet

## Support

For issues or questions:
- GitHub: [Repository Link]
- Discord: [Community Link]
- Documentation: [Docs Link]