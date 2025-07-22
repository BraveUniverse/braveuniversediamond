# Gridotto V2 UI Complete Reference Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Contract Architecture](#contract-architecture)
3. [Function Reference by Facet](#function-reference-by-facet)
4. [UI Integration Guide](#ui-integration-guide)
5. [Event Listeners](#event-listeners)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

Gridotto V2 is a decentralized lottery platform on LUKSO blockchain using Diamond Pattern (EIP-2535).

**Diamond Address**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`  
**Network**: LUKSO Testnet

### Key Features
- Multiple draw types (LYX, LSP7, LSP8)
- Automated weekly/monthly platform draws
- Monthly ticket earning system
- Comprehensive leaderboards
- Refund mechanism for cancelled draws

---

## 🏗️ Contract Architecture

### Facets Overview
1. **GridottoCoreV2Facet** - Draw creation and ticket purchases
2. **GridottoExecutionV2Facet** - Draw execution and winner selection
3. **GridottoPlatformDrawsFacet** - Weekly/monthly platform draws
4. **GridottoRefundFacet** - Prize claims and refunds
5. **GridottoAdminFacet** - Admin controls
6. **GridottoLeaderboardFacet** - Statistics and rankings
7. **OracleFacet** - Random number generation

---

## 📚 Function Reference by Facet

### 1️⃣ GridottoCoreV2Facet

#### createLYXDraw
Creates a new LYX (native token) lottery draw.

```solidity
function createLYXDraw(
    uint256 ticketPrice,      // Price per ticket in LYX (wei)
    uint256 maxTickets,       // Maximum tickets available
    uint256 duration,         // Duration in seconds (60 - 2592000)
    uint256 minParticipants,  // Minimum participants required
    uint256 platformFeePercent // Platform fee in basis points (max 2000 = 20%)
) external payable returns (uint256 drawId)
```

**UI Implementation**:
```javascript
// Example: Create a draw with 0.1 LYX tickets, max 100 tickets, 1 hour duration
const tx = await coreContract.createLYXDraw(
    ethers.parseEther("0.1"),  // 0.1 LYX per ticket
    100,                       // Max 100 tickets
    3600,                      // 1 hour
    5,                         // Min 5 participants
    500,                       // 5% platform fee
    { value: ethers.parseEther("1.0") } // 1 LYX initial prize
);
```

**UI Elements Needed**:
- Ticket price input (LYX)
- Max tickets slider (1-10000)
- Duration selector (dropdown: 1h, 6h, 24h, 7d, 30d)
- Min participants input
- Platform fee slider (0-20%)
- Initial prize input (optional)

---

#### createTokenDraw
Creates an LSP7 token-based lottery draw.

```solidity
function createTokenDraw(
    address tokenAddress,     // LSP7 token contract address
    uint256 ticketPrice,      // Price per ticket in tokens
    uint256 maxTickets,       
    uint256 duration,         
    uint256 minParticipants,  
    uint256 platformFeePercent,
    uint256 initialPrize      // Initial prize pool in tokens
) external returns (uint256 drawId)
```

**UI Elements Needed**:
- Token selector (dropdown of approved LSP7 tokens)
- Token balance display
- Approval button if needed
- Same inputs as LYX draw

---

#### createNFTDraw
Creates an LSP8 NFT-based lottery draw.

```solidity
function createNFTDraw(
    address nftContract,      // LSP8 NFT contract address
    bytes32[] memory nftTokenIds, // NFT token IDs as prizes
    uint256 ticketPrice,      // Price per ticket in LYX
    uint256 maxTickets,
    uint256 duration,
    uint256 minParticipants,
    uint256 platformFeePercent
) external returns (uint256 drawId)
```

**UI Elements Needed**:
- NFT collection selector
- NFT picker (visual grid of user's NFTs)
- Selected NFTs preview
- Ticket price in LYX
- Other standard inputs

---

#### buyTickets
Purchase tickets for any draw type.

```solidity
function buyTickets(
    uint256 drawId,
    uint256 amount
) external payable
```

**UI Implementation**:
```javascript
// For LYX draws
const ticketPrice = drawDetails.ticketPrice;
const totalCost = ticketPrice * amount;
await coreContract.buyTickets(drawId, amount, { value: totalCost });

// For LSP7 draws (no value sent)
await coreContract.buyTickets(drawId, amount);
```

**UI Elements Needed**:
- Ticket amount input/slider
- Total cost display
- Available tickets display
- "Buy Tickets" button with loading state

---

#### getDrawDetails
Get comprehensive details about a draw.

```solidity
function getDrawDetails(uint256 drawId) external view returns (
    address creator,
    DrawType drawType,        // 0=USER_LYX, 1=USER_LSP7, 2=USER_LSP8, 3=PLATFORM_WEEKLY, 4=PLATFORM_MONTHLY
    address tokenAddress,     // Token/NFT contract (if applicable)
    uint256 ticketPrice,
    uint256 maxTickets,
    uint256 ticketsSold,
    uint256 prizePool,
    uint256 startTime,
    uint256 endTime,
    uint256 minParticipants,
    uint256 platformFeePercent,
    bool isCompleted,
    bool isCancelled,
    uint256 participantCount,
    uint256 monthlyPoolContribution
)
```

**UI Display Elements**:
- Draw type badge (LYX/Token/NFT/Weekly/Monthly)
- Progress bar (ticketsSold/maxTickets)
- Countdown timer (endTime - now)
- Prize pool display with currency
- Participant count with min requirement
- Status badges (Active/Completed/Cancelled)

---

#### getUserDrawHistory
Get all draws a user has participated in.

```solidity
function getUserDrawHistory(address user) external view returns (uint256[] memory)
```

**UI Usage**:
- User profile page
- Participation history tab
- Filter by active/completed

---

#### cancelDraw
Cancel a draw (only creator or admin).

```solidity
function cancelDraw(uint256 drawId) external
```

**UI Elements**:
- Cancel button (only shown to creator)
- Confirmation modal
- Reason input (optional)

---

### 2️⃣ GridottoExecutionV2Facet

#### executeDraw
Execute a draw after it ends.

```solidity
function executeDraw(uint256 drawId) external
```

**UI Implementation**:
```javascript
// Check if draw can be executed
const details = await coreContract.getDrawDetails(drawId);
const now = Math.floor(Date.now() / 1000);
if (now >= details.endTime && !details.isCompleted) {
    const tx = await executionContract.executeDraw(drawId);
    // Show success message and executor reward
}
```

**UI Elements**:
- "Execute Draw" button (appears after end time)
- Executor reward display (5% of fees)
- Loading animation during execution
- Success notification with winner announcement

---

#### getDrawWinners
Get winners and their prizes.

```solidity
function getDrawWinners(uint256 drawId) external view returns (
    address[] memory winners,
    uint256[] memory amounts
)
```

**UI Display**:
- Winner announcement banner
- Prize amount for each winner
- Confetti animation
- Share buttons

---

#### canExecuteDraw
Check if a draw can be executed.

```solidity
function canExecuteDraw(uint256 drawId) external view returns (
    bool canExecute,
    string memory reason
)
```

**UI Usage**:
- Enable/disable execute button
- Show reason if cannot execute
- Auto-refresh status

---

### 3️⃣ GridottoPlatformDrawsFacet

#### initializePlatformDraws
Initialize weekly/monthly draws (admin only).

```solidity
function initializePlatformDraws() external
```

---

#### executeWeeklyDraw
Execute the current weekly draw.

```solidity
function executeWeeklyDraw() external
```

**UI Elements**:
- Weekly draw card with special styling
- Auto-execution countdown
- Prize distribution: 70% winner, 20% monthly pool, 5% platform, 5% executor

---

#### executeMonthlyDraw
Execute the current monthly draw.

```solidity
function executeMonthlyDraw() external
```

**UI Elements**:
- Monthly draw special section
- Participant list (ticket holders)
- Large prize pool display
- Special winner announcement

---

#### getPlatformDrawsInfo
Get platform draws information.

```solidity
function getPlatformDrawsInfo() external view returns (
    uint256 weeklyDrawId,
    uint256 monthlyDrawId,
    uint256 monthlyPoolBalance,
    uint256 lastWeeklyDrawTime,
    uint256 nextMonthlyDraw    // Timestamp when monthly draw will be created
)
```

**UI Display**:
- Platform draws dashboard
- Monthly pool accumulation progress
- Next draw countdown

---

#### getUserMonthlyTickets
Get user's monthly ticket balance.

```solidity
function getUserMonthlyTickets(address user) external view returns (
    uint256 fromWeekly,       // Tickets from weekly participation
    uint256 fromCreating,     // Tickets from creating draws (max 5)
    uint256 fromParticipating,// Tickets from participating (max 15)
    uint256 lastResetTime     // When tickets were last reset
)
```

**UI Elements**:
- Monthly ticket counter
- Progress bars for each category
- Time until reset
- Ticket earning tips

---

### 4️⃣ GridottoRefundFacet

#### claimPrize
Claim prize for a won draw.

```solidity
function claimPrize(uint256 drawId) external
```

**UI Flow**:
1. Check if user won: `canClaimPrize()`
2. Show claim button
3. Execute claim
4. Show success with amount

---

#### claimRefund
Claim refund for cancelled draw.

```solidity
function claimRefund(uint256 drawId) external
```

**UI Elements**:
- Refund available banner
- Claim button
- Amount to be refunded
- Transaction confirmation

---

#### canClaimPrize
Check if user can claim prize.

```solidity
function canClaimPrize(uint256 drawId, address user) external view returns (
    bool canClaim,
    string memory reason
)
```

---

#### getRefundAmount
Get refund amount for cancelled draw.

```solidity
function getRefundAmount(uint256 drawId, address user) external view returns (uint256)
```

---

#### batchClaimPrizes
Claim multiple prizes at once.

```solidity
function batchClaimPrizes(uint256[] memory drawIds) external
```

**UI Elements**:
- "Claim All" button
- List of claimable prizes
- Total amount display
- Batch transaction status

---

### 5️⃣ GridottoAdminFacet

#### pauseSystem / unpauseSystem
Pause or unpause the entire system.

```solidity
function pauseSystem() external
function unpauseSystem() external
```

**UI Elements**:
- Emergency pause button (red)
- System status indicator
- Pause reason input

---

#### withdrawPlatformFees
Withdraw accumulated platform fees.

```solidity
function withdrawPlatformFees() external
```

**UI Display**:
- Available fees display
- Withdraw button
- Transaction history

---

#### setFeePercentages
Set various fee percentages.

```solidity
function setFeePercentages(
    uint256 defaultPlatformFee,   // Default platform fee (max 2000 = 20%)
    uint256 executorFeePercent,   // Executor reward (max 1000 = 10%)
    uint256 monthlyPoolPercent,   // Monthly pool contribution (max 500 = 5%)
    uint256 weeklyMonthlyPercent  // Weekly to monthly pool (max 3000 = 30%)
) external
```

**UI Elements**:
- Fee configuration panel
- Sliders for each percentage
- Current vs new comparison
- Save button with confirmation

---

#### getSystemStats
Get overall system statistics.

```solidity
function getSystemStats() external view returns (
    uint256 totalDrawsCreated,
    uint256 totalTicketsSold,
    uint256 totalPrizesDistributed,
    uint256 totalExecutions
)
```

**UI Dashboard**:
- Statistics cards
- Growth charts
- Time period filters

---

### 6️⃣ GridottoLeaderboardFacet

#### getTopWinners
Get top winners by total winnings.

```solidity
function getTopWinners(uint256 limit) external view returns (
    TopWinner[] memory
)

struct TopWinner {
    address player;
    uint256 totalWins;
    uint256 totalWinnings;
    uint256 lastWinTime;
}
```

**UI Leaderboard**:
- Rank badges (#1 gold, #2 silver, #3 bronze)
- Player address (shortened)
- Win count and total winnings
- Last win time ago
- View profile links

---

#### getTopTicketBuyers
Get most active ticket buyers.

```solidity
function getTopTicketBuyers(uint256 limit) external view returns (
    TopBuyer[] memory
)

struct TopBuyer {
    address player;
    uint256 totalTickets;
    uint256 totalSpent;
    uint256 lastPurchaseTime;
}
```

---

#### getTopDrawCreators
Get most successful draw creators.

```solidity
function getTopDrawCreators(uint256 limit) external view returns (
    TopCreator[] memory
)

struct TopCreator {
    address creator;
    uint256 drawsCreated;
    uint256 totalRevenue;
    uint256 successfulDraws;
}
```

---

#### getTopExecutors
Get top draw executors by count.

```solidity
function getTopExecutors(uint256 limit) external view returns (
    TopExecutor[] memory
)

struct TopExecutor {
    address executor;
    uint256 executionCount;
    uint256 totalFeesEarned;
}
```

---

#### getPlatformStatistics
Get overall platform statistics.

```solidity
function getPlatformStatistics() external view returns (
    PlatformStats memory
)

struct PlatformStats {
    uint256 totalPrizesDistributed;
    uint256 totalTicketsSold;
    uint256 totalDrawsCreated;
    uint256 totalExecutions;
}
```

**UI Display**:
- Platform overview dashboard
- Real-time statistics
- Historical charts
- Export functionality

---

## 🎨 UI Integration Guide

### 1. Connect to Diamond Contract

```javascript
import { ethers } from 'ethers';

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Get contract instances
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const coreContract = new ethers.Contract(
    DIAMOND_ADDRESS,
    GridottoCoreV2ABI,
    signer
);

const executionContract = new ethers.Contract(
    DIAMOND_ADDRESS,
    GridottoExecutionV2ABI,
    signer
);

// ... other facets
```

### 2. Draw List Component

```javascript
// Fetch active draws
async function getActiveDraws() {
    const draws = [];
    const nextDrawId = await coreContract.getNextDrawId();
    
    for (let i = 1; i < nextDrawId; i++) {
        const details = await coreContract.getDrawDetails(i);
        if (!details.isCompleted && !details.isCancelled) {
            draws.push({ id: i, ...details });
        }
    }
    
    return draws;
}
```

### 3. Draw Card Component

```javascript
function DrawCard({ draw }) {
    const timeLeft = draw.endTime - Date.now() / 1000;
    const progress = (draw.ticketsSold / draw.maxTickets) * 100;
    
    return (
        <div className="draw-card">
            <DrawTypeBadge type={draw.drawType} />
            <h3>Prize Pool: {formatEther(draw.prizePool)} LYX</h3>
            <ProgressBar value={progress} />
            <p>{draw.ticketsSold} / {draw.maxTickets} tickets sold</p>
            <CountdownTimer seconds={timeLeft} />
            <BuyTicketsButton drawId={draw.id} />
        </div>
    );
}
```

### 4. Create Draw Form

```javascript
function CreateDrawForm() {
    const [drawType, setDrawType] = useState('LYX');
    const [formData, setFormData] = useState({
        ticketPrice: '0.1',
        maxTickets: 100,
        duration: 3600,
        minParticipants: 5,
        platformFee: 500,
        initialPrize: '0'
    });
    
    async function handleSubmit(e) {
        e.preventDefault();
        
        try {
            let tx;
            if (drawType === 'LYX') {
                tx = await coreContract.createLYXDraw(
                    parseEther(formData.ticketPrice),
                    formData.maxTickets,
                    formData.duration,
                    formData.minParticipants,
                    formData.platformFee,
                    { value: parseEther(formData.initialPrize) }
                );
            }
            // ... handle other draw types
            
            const receipt = await tx.wait();
            // Extract drawId from events
            showSuccess('Draw created successfully!');
        } catch (error) {
            showError(error.message);
        }
    }
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
        </form>
    );
}
```

---

## 📡 Event Listeners

### Important Events to Listen

```javascript
// Draw Created
coreContract.on("DrawCreated", (drawId, creator, drawType) => {
    console.log(`New draw #${drawId} created by ${creator}`);
    refreshDrawList();
});

// Tickets Purchased
coreContract.on("TicketsPurchased", (drawId, buyer, amount) => {
    console.log(`${buyer} bought ${amount} tickets for draw #${drawId}`);
    updateDrawCard(drawId);
});

// Draw Executed
executionContract.on("DrawExecuted", (drawId, executor, winners) => {
    console.log(`Draw #${drawId} executed! Winners: ${winners}`);
    showWinnerModal(drawId, winners);
});

// Draw Cancelled
coreContract.on("DrawCancelled", (drawId) => {
    console.log(`Draw #${drawId} cancelled`);
    showRefundNotification(drawId);
});

// Prize Claimed
refundContract.on("PrizeClaimed", (drawId, winner, amount) => {
    console.log(`${winner} claimed ${formatEther(amount)} LYX from draw #${drawId}`);
});
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

```javascript
try {
    await coreContract.buyTickets(drawId, amount, { value });
} catch (error) {
    if (error.message.includes("Draw not found")) {
        showError("This draw does not exist");
    } else if (error.message.includes("Draw ended")) {
        showError("This draw has already ended");
    } else if (error.message.includes("Not active")) {
        showError("This draw is not active yet");
    } else if (error.message.includes("Invalid amount")) {
        showError("Not enough tickets available");
    } else if (error.message.includes("Insufficient payment")) {
        showError("Please send enough LYX to buy tickets");
    } else {
        showError("Transaction failed: " + error.message);
    }
}
```

---

## 💡 Best Practices

### 1. Caching
```javascript
// Cache draw details to reduce RPC calls
const drawCache = new Map();

async function getDrawDetailsWithCache(drawId) {
    if (drawCache.has(drawId)) {
        const cached = drawCache.get(drawId);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
            return cached.data;
        }
    }
    
    const details = await coreContract.getDrawDetails(drawId);
    drawCache.set(drawId, {
        data: details,
        timestamp: Date.now()
    });
    
    return details;
}
```

### 2. Batch Operations
```javascript
// Batch multiple prize claims
async function claimAllPrizes() {
    const claimableDraws = await getClaimableDraws(userAddress);
    if (claimableDraws.length > 0) {
        const tx = await refundContract.batchClaimPrizes(claimableDraws);
        await tx.wait();
    }
}
```

### 3. Real-time Updates
```javascript
// Use WebSocket for real-time updates
const provider = new ethers.WebSocketProvider(WSS_URL);

// Auto-refresh draw status
setInterval(async () => {
    const activeDraws = await getActiveDraws();
    updateUI(activeDraws);
}, 10000); // Every 10 seconds
```

### 4. Gas Estimation
```javascript
// Always estimate gas before transactions
async function buyTicketsWithGasEstimate(drawId, amount) {
    const gasEstimate = await coreContract.estimateGas.buyTickets(
        drawId, 
        amount, 
        { value: ticketPrice * amount }
    );
    
    const tx = await coreContract.buyTickets(
        drawId,
        amount,
        {
            value: ticketPrice * amount,
            gasLimit: gasEstimate * 110n / 100n // 10% buffer
        }
    );
}
```

### 5. User Experience
- Show loading states during transactions
- Implement optimistic updates
- Provide clear error messages
- Add tooltips for complex features
- Use animations for winner announcements
- Implement pull-to-refresh on mobile
- Add sound effects for important events

---

## 📱 Mobile Considerations

1. **Responsive Design**
   - Use flexible grid layouts
   - Touch-friendly button sizes (min 44px)
   - Swipe gestures for navigation

2. **Performance**
   - Lazy load draw lists
   - Virtualize long lists
   - Minimize RPC calls

3. **Wallet Integration**
   - Support WalletConnect
   - Deep linking for transactions
   - QR code scanning

---

## 🔐 Security Considerations

1. **Input Validation**
   - Validate all user inputs client-side
   - Sanitize addresses and amounts
   - Check allowances before token operations

2. **Transaction Safety**
   - Show transaction preview
   - Implement spending limits
   - Add confirmation dialogs

3. **Error Recovery**
   - Handle failed transactions gracefully
   - Provide retry mechanisms
   - Save form state locally

---

## 🚀 Production Checklist

- [ ] All contract addresses configured correctly
- [ ] Error handling for all contract calls
- [ ] Loading states for all async operations
- [ ] Mobile responsive design
- [ ] Gas estimation implemented
- [ ] Event listeners set up
- [ ] Caching strategy implemented
- [ ] Analytics tracking added
- [ ] Security audit completed
- [ ] Performance testing done

---

## 📞 Support

For technical questions or issues:
- GitHub: [Repository Link]
- Documentation: This guide
- Contract Address: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

---

**Last Updated**: December 2024  
**Version**: 2.0.0