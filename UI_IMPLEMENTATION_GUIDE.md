# Gridotto UI Implementation Guide

## 🎯 Overview

This guide provides detailed implementation instructions for the Gridotto UI, with special attention to critical features and sorting mechanisms.

## 📋 Table of Contents

1. [Contract Integration](#contract-integration)
2. [Core Features](#core-features)
3. [Leaderboard Implementation](#leaderboard-implementation)
4. [Important UI Considerations](#important-ui-considerations)
5. [Error Handling](#error-handling)
6. [Real-time Updates](#real-time-updates)

---

## 🔗 Contract Integration

### Contract Address
```javascript
const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
```

### Current Facet Addresses (LUKSO Testnet)
- **GridottoCoreFacet**: `0x1545E17604556B948A89b4fA106e6a4353FEb3D8`
- **GridottoExecutionFacet**: `0x608113F8101390738Ffce468e95A86401c17baFA`
- **GridottoAdminFacet**: `0x67152861a210b82784397021914E2e7E9438c696`
- **GridottoLeaderboardFacet**: `0xF9b3baCd4AeE31BEc0940dd03647Fb9152C176D3`

### Initialize Contracts
```javascript
import { ethers } from 'ethers';
import CoreABI from './abis/GridottoCoreFacet.json';
import ExecutionABI from './abis/GridottoExecutionFacet.json';
import LeaderboardABI from './abis/GridottoLeaderboardFacet.json';
import AdminABI from './abis/GridottoAdminFacet.json';

// Connect to provider
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize contract instances
const core = new ethers.Contract(DIAMOND_ADDRESS, CoreABI, signer);
const execution = new ethers.Contract(DIAMOND_ADDRESS, ExecutionABI, signer);
const leaderboard = new ethers.Contract(DIAMOND_ADDRESS, LeaderboardABI, signer);
const admin = new ethers.Contract(DIAMOND_ADDRESS, AdminABI, signer);
```

---

## 🎮 Core Features

### 1. Create Draw

#### LYX Draw
```javascript
async function createLYXDraw(params) {
    const {
        ticketPrice,      // in wei
        maxTickets,       // number
        duration,         // in seconds (min: 60, max: 2592000)
        minParticipants,  // minimum required
        platformFee,      // in basis points (max: 2000 = 20%)
        initialPrize      // in wei
    } = params;
    
    const tx = await core.createLYXDraw(
        ticketPrice,
        maxTickets,
        duration,
        minParticipants,
        platformFee,
        { value: initialPrize }
    );
    
    const receipt = await tx.wait();
    
    // Extract drawId from events
    const event = receipt.logs.find(log => {
        try {
            const parsed = core.interface.parseLog(log);
            return parsed?.name === "DrawCreated";
        } catch { return false; }
    });
    
    const drawId = event ? core.interface.parseLog(event).args.drawId : null;
    return drawId;
}
```

#### Token Draw (LSP7)
```javascript
async function createTokenDraw(params) {
    const {
        tokenAddress,
        ticketPrice,      // in token units
        maxTickets,
        duration,
        minParticipants,
        platformFee,
        initialPrize      // in token units
    } = params;
    
    // First approve token spending if there's an initial prize
    if (initialPrize > 0) {
        const token = new ethers.Contract(tokenAddress, LSP7_ABI, signer);
        await token.approve(DIAMOND_ADDRESS, initialPrize);
    }
    
    const tx = await core.createTokenDraw(
        tokenAddress,
        ticketPrice,
        maxTickets,
        duration,
        minParticipants,
        platformFee,
        initialPrize
    );
    
    const receipt = await tx.wait();
    // Extract drawId same as above
}
```

#### NFT Draw (LSP8)
```javascript
async function createNFTDraw(params) {
    const {
        nftContract,
        nftTokenIds,      // array of bytes32
        ticketPrice,      // 0 for free draw, otherwise in LYX
        maxTickets,
        duration,
        minParticipants,
        platformFee
    } = params;
    
    // Authorize Diamond to transfer NFTs
    const nft = new ethers.Contract(nftContract, LSP8_ABI, signer);
    for (const tokenId of nftTokenIds) {
        await nft.authorizeOperator(DIAMOND_ADDRESS, tokenId);
    }
    
    const tx = await core.createNFTDraw(
        nftContract,
        nftTokenIds,
        ticketPrice,
        maxTickets,
        duration,
        minParticipants,
        platformFee
    );
    
    const receipt = await tx.wait();
    // Extract drawId
}
```

### 2. Buy Tickets

```javascript
async function buyTickets(drawId, amount) {
    // Get ticket cost
    const totalCost = await core.getTicketCost(drawId, amount);
    
    // Get draw details to check type
    const details = await core.getDrawDetails(drawId);
    
    if (details.drawType === 0n || details.drawType === 2n) { 
        // LYX or NFT draw with LYX payment
        await core.buyTickets(drawId, amount, { value: totalCost });
    } else if (details.drawType === 1n) { 
        // Token draw
        const token = new ethers.Contract(details.tokenAddress, LSP7_ABI, signer);
        await token.approve(DIAMOND_ADDRESS, totalCost);
        await core.buyTickets(drawId, amount);
    }
}
```

### 3. Execute Draw

```javascript
async function executeDraw(drawId) {
    // Check if can execute
    const canExecute = await execution.canExecuteDraw(drawId);
    
    if (!canExecute) {
        throw new Error("Draw cannot be executed yet");
    }
    
    const tx = await execution.executeDraw(drawId);
    await tx.wait();
    
    // Get winners
    const [winners, amounts] = await execution.getDrawWinners(drawId);
    return { winners, amounts };
}
```

### 4. Claim Prize

```javascript
async function claimPrize(drawId) {
    const tx = await execution.claimPrize(drawId);
    await tx.wait();
}
```

---

## 📊 Leaderboard Implementation

### ⚠️ IMPORTANT: Sorting and Display

The leaderboard data comes **pre-sorted** from the smart contract. **DO NOT re-sort the data** on the frontend as it may break the intended ranking logic.

### 1. Top Winners

```javascript
async function getTopWinners(limit = 10) {
    const winners = await leaderboard.getTopWinners(limit);
    
    // ⚠️ IMPORTANT: Data is already sorted by totalWinnings (descending)
    // Just map and display, DO NOT sort again!
    return winners.map((winner, index) => ({
        rank: index + 1,
        address: winner.player,
        totalWins: winner.totalWins.toString(),
        totalWinnings: ethers.formatEther(winner.totalWinnings),
        lastWinTime: new Date(Number(winner.lastWinTime) * 1000)
    }));
}

// UI Display Example
function WinnersLeaderboard({ data }) {
    return (
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Total Wins</th>
                    <th>Total Winnings (LYX)</th>
                    <th>Last Win</th>
                </tr>
            </thead>
            <tbody>
                {data.map(winner => (
                    <tr key={winner.address}>
                        <td>#{winner.rank}</td>
                        <td>{formatAddress(winner.address)}</td>
                        <td>{winner.totalWins}</td>
                        <td>{winner.totalWinnings}</td>
                        <td>{winner.lastWinTime.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

### 2. Top Ticket Buyers

```javascript
async function getTopTicketBuyers(limit = 10) {
    const buyers = await leaderboard.getTopTicketBuyers(limit);
    
    // ⚠️ IMPORTANT: Data is already sorted by totalSpent (descending)
    return buyers.map((buyer, index) => ({
        rank: index + 1,
        address: buyer.player,
        totalTickets: buyer.totalTickets.toString(),
        totalSpent: ethers.formatEther(buyer.totalSpent),
        lastPurchaseTime: new Date(Number(buyer.lastPurchaseTime) * 1000)
    }));
}
```

### 3. Top Draw Creators

```javascript
async function getTopDrawCreators(limit = 10) {
    const creators = await leaderboard.getTopDrawCreators(limit);
    
    // ⚠️ IMPORTANT: Data is already sorted by totalRevenue (descending)
    return creators.map((creator, index) => ({
        rank: index + 1,
        address: creator.creator,
        drawsCreated: creator.drawsCreated.toString(),
        totalRevenue: ethers.formatEther(creator.totalRevenue),
        successfulDraws: creator.successfulDraws.toString(),
        successRate: creator.successRate.toString() + '%'
    }));
}
```

### 4. Top Executors

```javascript
async function getTopExecutors(limit = 10) {
    const executors = await leaderboard.getTopExecutors(limit);
    
    // ⚠️ IMPORTANT: Data is already sorted by totalFeesEarned (descending)
    return executors.map((executor, index) => ({
        rank: index + 1,
        address: executor.executor,
        executionCount: executor.executionCount.toString(),
        totalFeesEarned: ethers.formatEther(executor.totalFeesEarned)
    }));
}
```

### 5. Platform Statistics

```javascript
async function getPlatformStats() {
    const stats = await leaderboard.getPlatformStats();
    
    return {
        totalPrizesDistributed: ethers.formatEther(stats.totalPrizesDistributed),
        totalTicketsSold: stats.totalTicketsSold.toString(),
        totalDrawsCreated: stats.totalDrawsCreated.toString(),
        totalExecutions: stats.totalExecutions.toString()
    };
}
```

---

## 🎨 Important UI Considerations

### 1. Draw Status Display

```javascript
function getDrawStatus(draw) {
    const now = Date.now() / 1000;
    
    if (draw.isCancelled) return { status: 'CANCELLED', color: 'red' };
    if (draw.isCompleted) return { status: 'COMPLETED', color: 'green' };
    if (now < draw.startTime) return { status: 'UPCOMING', color: 'yellow' };
    if (now < draw.endTime) return { status: 'ACTIVE', color: 'blue' };
    if (draw.participants.length < draw.minParticipants) {
        return { status: 'AWAITING_PARTICIPANTS', color: 'orange' };
    }
    return { status: 'READY_TO_EXECUTE', color: 'purple' };
}
```

### 2. Time Display

```javascript
function TimeRemaining({ endTime }) {
    const [timeLeft, setTimeLeft] = useState('');
    
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now() / 1000;
            const remaining = endTime - now;
            
            if (remaining <= 0) {
                setTimeLeft('Ended');
                clearInterval(timer);
            } else {
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                const seconds = Math.floor(remaining % 60);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);
        
        return () => clearInterval(timer);
    }, [endTime]);
    
    return <span>{timeLeft}</span>;
}
```

### 3. Draw Type Icons

```javascript
function DrawTypeIcon({ drawType }) {
    switch(drawType) {
        case 0n: return <LYXIcon title="LYX Draw" />;
        case 1n: return <TokenIcon title="Token Draw" />;
        case 2n: return <NFTIcon title="NFT Draw" />;
        default: return null;
    }
}
```

### 4. Progress Bar

```javascript
function DrawProgress({ ticketsSold, maxTickets }) {
    const percentage = (ticketsSold / maxTickets) * 100;
    
    return (
        <div className="progress-bar">
            <div 
                className="progress-fill" 
                style={{ width: `${percentage}%` }}
            />
            <span>{ticketsSold} / {maxTickets} tickets sold</span>
        </div>
    );
}
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

```javascript
const ERROR_MESSAGES = {
    'Draw not found': 'This draw does not exist',
    'Draw ended': 'This draw has already ended',
    'Not started': 'This draw has not started yet',
    'Exceeds max': 'Cannot buy more tickets than available',
    'Insufficient payment': 'Please send enough LYX to cover ticket cost',
    'Not enough participants': 'Draw needs more participants before execution',
    'Not a winner': 'You did not win this draw',
    'Already claimed': 'You have already claimed your prize',
    'System paused': 'The system is currently paused for maintenance'
};

function handleContractError(error) {
    const message = error.reason || error.message || 'Unknown error';
    
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
        if (message.includes(key)) {
            return value;
        }
    }
    
    return message;
}
```

---

## 🔄 Real-time Updates

### Event Listeners

```javascript
// Listen for new draws
core.on("DrawCreated", (drawId, creator, drawType) => {
    console.log(`New draw created: ${drawId}`);
    // Update UI
});

// Listen for ticket purchases
core.on("TicketsPurchased", (drawId, buyer, amount) => {
    console.log(`${buyer} bought ${amount} tickets for draw ${drawId}`);
    // Update UI
});

// Listen for draw executions
execution.on("DrawExecuted", (drawId, executor, winners) => {
    console.log(`Draw ${drawId} executed with winners:`, winners);
    // Update UI
});

// Clean up listeners
function cleanup() {
    core.removeAllListeners();
    execution.removeAllListeners();
}
```

---

## 📱 Mobile Considerations

1. **Responsive Design**: Ensure all tables and grids are mobile-friendly
2. **Touch Targets**: Make buttons at least 44x44 pixels
3. **Loading States**: Show clear loading indicators for blockchain transactions
4. **Transaction Status**: Display pending/confirmed states clearly

---

## 🔐 Security Best Practices

1. **Input Validation**: Always validate user inputs before sending to contracts
2. **BigNumber Handling**: Use ethers.js BigNumber for all numerical operations
3. **Error Boundaries**: Implement React error boundaries to catch UI errors
4. **Transaction Confirmation**: Always wait for transaction receipts
5. **Allowance Checks**: Check token allowances before attempting transfers

---

## 📈 Performance Optimization

1. **Batch Reads**: Combine multiple contract calls when possible
2. **Caching**: Cache draw details and leaderboard data with appropriate TTL
3. **Pagination**: Implement pagination for large lists
4. **Lazy Loading**: Load draw details only when needed
5. **Debouncing**: Debounce user inputs to reduce contract calls

---

## 🎯 Example: Complete Draw Flow

```javascript
// 1. Create Draw
const drawId = await createLYXDraw({
    ticketPrice: ethers.parseEther("0.1"),
    maxTickets: 100,
    duration: 3600, // 1 hour
    minParticipants: 5,
    platformFee: 500, // 5%
    initialPrize: ethers.parseEther("1")
});

// 2. Monitor Draw
const drawDetails = await core.getDrawDetails(drawId);
const participants = await core.getDrawParticipants(drawId);

// 3. Buy Tickets
await buyTickets(drawId, 5);

// 4. Wait for draw to end
// ... implement countdown timer

// 5. Execute Draw
if (await execution.canExecuteDraw(drawId)) {
    await executeDraw(drawId);
}

// 6. Check Winners
const [winners, amounts] = await execution.getDrawWinners(drawId);

// 7. Claim Prize (if winner)
if (winners.includes(userAddress)) {
    await claimPrize(drawId);
}
```

---

## 📞 Support

For technical questions or issues:
1. Check the main documentation: `GRIDOTTO_COMPLETE_DOCUMENTATION.md`
2. Review test scripts for implementation examples
3. Check contract source code for detailed function behavior

---

Last Updated: July 22, 2025