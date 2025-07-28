# 🎨 BraveUniverse UI Integration Guide

## 📋 Contract Information

**New Diamond Address**: `0x00102a0aAb6027bB027C0F032583Cf88353E4900`  
**Network**: LUKSO Testnet  
**Deployment Date**: January 28, 2025

## 🔧 Key Changes & New Features

### 1. Fee System Update
All fees are now collected upfront during ticket purchase:
- **Platform Fee**: 5% - Stored in `platformFeesLYX`
- **Executor Fee**: 5% - Stored per draw in `executorFeeCollected`
- **Monthly Pool**: 20% (weekly) or 2% (other draws)
- **Prize Pool**: Receives only the net amount after fees

### 2. Draw Status Information

#### getDrawDetails() Return Values
```typescript
interface DrawDetails {
  creator: string;
  drawType: number; // 0=USER_LYX, 1=USER_LSP7, 2=USER_LSP8, 3=PLATFORM_WEEKLY, 4=PLATFORM_MONTHLY
  tokenAddress: string;
  ticketPrice: bigint;
  maxTickets: bigint;
  ticketsSold: bigint;
  prizePool: bigint; // Net amount after fees
  startTime: bigint;
  endTime: bigint;
  minParticipants: bigint;
  platformFeePercent: bigint;
  isCompleted: boolean;
  isCancelled: boolean;
  participantCount: bigint;
  monthlyPoolContribution: bigint;
  executorFeeCollected: bigint; // NEW: Pre-collected executor fee
}
```

### 3. Real-time Executor Reward Display

To show executor rewards on draw detail pages:

```javascript
// Get draw details
const drawDetails = await coreFacet.getDrawDetails(drawId);

// Calculate executor reward
const executorReward = drawDetails.executorFeeCollected;

// Display in UI
const executorRewardLYX = ethers.formatEther(executorReward);
```

### 4. Platform Draws Information

```typescript
interface PlatformDrawsInfo {
  weeklyDrawId: bigint;
  monthlyDrawId: bigint;
  weeklyEndTime: bigint;
  monthlyEndTime: bigint;
  monthlyPoolBalance: bigint;
  weeklyCount: bigint;
}
```

### 5. User Monthly Tickets

```typescript
interface MonthlyTickets {
  fromWeekly: bigint;      // Tickets from weekly participation
  fromCreating: bigint;    // Tickets from creating draws (max 5/month)
  fromParticipating: bigint; // Tickets from participating (max 15/month)
  total: bigint;           // Total tickets (calculated)
}
```

## 📊 UI Components to Update

### 1. Draw Detail Page

```javascript
// Component: DrawDetail.jsx
const DrawDetail = ({ drawId }) => {
  const [drawData, setDrawData] = useState(null);
  
  useEffect(() => {
    const fetchDrawData = async () => {
      const details = await coreFacet.getDrawDetails(drawId);
      
      // Calculate percentages
      const totalTicketRevenue = details.ticketPrice * details.ticketsSold;
      const platformFee = (totalTicketRevenue * 500n) / 10000n; // 5%
      const executorFee = details.executorFeeCollected;
      const monthlyContribution = details.monthlyPoolContribution;
      
      setDrawData({
        ...details,
        executorRewardLYX: ethers.formatEther(executorFee),
        prizePoolLYX: ethers.formatEther(details.prizePool),
        platformFeeLYX: ethers.formatEther(platformFee),
        monthlyContributionLYX: ethers.formatEther(monthlyContribution)
      });
    };
    
    fetchDrawData();
  }, [drawId]);
  
  return (
    <div>
      <h2>Draw #{drawId}</h2>
      {drawData && (
        <>
          <div className="prize-info">
            <h3>Prize Pool: {drawData.prizePoolLYX} LYX</h3>
            <p>Tickets Sold: {drawData.ticketsSold.toString()}</p>
          </div>
          
          <div className="executor-reward">
            <h4>🎯 Executor Reward</h4>
            <p className="reward-amount">{drawData.executorRewardLYX} LYX</p>
            <p className="reward-hint">Execute this draw to earn this reward!</p>
          </div>
          
          <div className="fee-breakdown">
            <h4>Fee Breakdown</h4>
            <ul>
              <li>Platform Fee: {drawData.platformFeeLYX} LYX</li>
              <li>Executor Fee: {drawData.executorRewardLYX} LYX</li>
              <li>Monthly Pool: {drawData.monthlyContributionLYX} LYX</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
```

### 2. Buy Tickets Component

```javascript
// Component: BuyTickets.jsx
const BuyTickets = ({ drawId, ticketPrice }) => {
  const [ticketCount, setTicketCount] = useState(1);
  const [breakdown, setBreakdown] = useState(null);
  
  useEffect(() => {
    const calculateBreakdown = () => {
      const totalCost = ticketPrice * BigInt(ticketCount);
      const platformFee = (totalCost * 500n) / 10000n; // 5%
      const executorFee = (totalCost * 500n) / 10000n; // 5%
      const monthlyPool = (totalCost * 2000n) / 10000n; // 20% for weekly
      const netPrize = totalCost - platformFee - executorFee - monthlyPool;
      
      setBreakdown({
        totalCost: ethers.formatEther(totalCost),
        platformFee: ethers.formatEther(platformFee),
        executorFee: ethers.formatEther(executorFee),
        monthlyPool: ethers.formatEther(monthlyPool),
        netPrize: ethers.formatEther(netPrize)
      });
    };
    
    calculateBreakdown();
  }, [ticketCount, ticketPrice]);
  
  const buyTickets = async () => {
    const totalCost = ticketPrice * BigInt(ticketCount);
    await coreFacet.buyTickets(drawId, ticketCount, { value: totalCost });
  };
  
  return (
    <div className="buy-tickets">
      <input 
        type="number" 
        value={ticketCount}
        onChange={(e) => setTicketCount(e.target.value)}
        min="1"
      />
      
      {breakdown && (
        <div className="cost-breakdown">
          <h4>Cost Breakdown</h4>
          <p>Total: {breakdown.totalCost} LYX</p>
          <ul>
            <li>To Prize Pool: {breakdown.netPrize} LYX (70%)</li>
            <li>Platform Fee: {breakdown.platformFee} LYX (5%)</li>
            <li>Executor Reward: {breakdown.executorFee} LYX (5%)</li>
            <li>Monthly Pool: {breakdown.monthlyPool} LYX (20%)</li>
          </ul>
        </div>
      )}
      
      <button onClick={buyTickets}>Buy {ticketCount} Tickets</button>
    </div>
  );
};
```

### 3. Execute Draw Component

```javascript
// Component: ExecuteDraw.jsx
const ExecuteDraw = ({ drawId }) => {
  const [canExecute, setCanExecute] = useState(false);
  const [executorReward, setExecutorReward] = useState('0');
  
  useEffect(() => {
    const checkExecutability = async () => {
      const executable = await executionFacet.canExecuteDraw(drawId);
      setCanExecute(executable);
      
      if (executable) {
        const details = await coreFacet.getDrawDetails(drawId);
        setExecutorReward(ethers.formatEther(details.executorFeeCollected));
      }
    };
    
    checkExecutability();
  }, [drawId]);
  
  const executeDraw = async () => {
    const tx = await executionFacet.executeDraw(drawId);
    await tx.wait();
    alert(`Draw executed! You earned ${executorReward} LYX`);
  };
  
  return (
    <div className="execute-draw">
      {canExecute ? (
        <>
          <h3>Execute Draw & Earn {executorReward} LYX</h3>
          <button onClick={executeDraw} className="execute-btn">
            Execute Draw
          </button>
        </>
      ) : (
        <p>This draw cannot be executed yet</p>
      )}
    </div>
  );
};
```

### 4. Platform Draws Dashboard

```javascript
// Component: PlatformDraws.jsx
const PlatformDraws = () => {
  const [platformInfo, setPlatformInfo] = useState(null);
  
  useEffect(() => {
    const fetchPlatformInfo = async () => {
      const info = await platformFacet.getPlatformDrawsInfo();
      const weeklyDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
      const monthlyDraw = await coreFacet.getDrawDetails(info.monthlyDrawId);
      
      setPlatformInfo({
        weekly: {
          id: info.weeklyDrawId.toString(),
          endTime: new Date(Number(info.weeklyEndTime) * 1000),
          prizePool: ethers.formatEther(weeklyDraw.prizePool),
          executorReward: ethers.formatEther(weeklyDraw.executorFeeCollected),
          ticketsSold: weeklyDraw.ticketsSold.toString()
        },
        monthly: {
          id: info.monthlyDrawId.toString(),
          endTime: new Date(Number(info.monthlyEndTime) * 1000),
          prizePool: ethers.formatEther(monthlyDraw.prizePool),
          executorReward: ethers.formatEther(monthlyDraw.executorFeeCollected),
          ticketsSold: monthlyDraw.ticketsSold.toString(),
          poolBalance: ethers.formatEther(info.monthlyPoolBalance)
        }
      });
    };
    
    fetchPlatformInfo();
  }, []);
  
  return (
    <div className="platform-draws">
      <h2>Platform Draws</h2>
      
      {platformInfo && (
        <>
          <div className="weekly-draw">
            <h3>Weekly Draw #{platformInfo.weekly.id}</h3>
            <p>Prize Pool: {platformInfo.weekly.prizePool} LYX</p>
            <p>Executor Reward: {platformInfo.weekly.executorReward} LYX</p>
            <p>Ends: {platformInfo.weekly.endTime.toLocaleString()}</p>
            <p>Tickets Sold: {platformInfo.weekly.ticketsSold}</p>
          </div>
          
          <div className="monthly-draw">
            <h3>Monthly Draw #{platformInfo.monthly.id}</h3>
            <p>Current Pool: {platformInfo.monthly.prizePool} LYX</p>
            <p>Accumulating: {platformInfo.monthly.poolBalance} LYX</p>
            <p>Executor Reward: {platformInfo.monthly.executorReward} LYX</p>
            <p>Ends: {platformInfo.monthly.endTime.toLocaleString()}</p>
          </div>
        </>
      )}
    </div>
  );
};
```

## 🔌 Contract ABIs

### Core Functions
```javascript
const CORE_ABI = [
  "function buyTickets(uint256 drawId, uint256 amount) payable",
  "function getDrawDetails(uint256 drawId) view returns (address creator, uint8 drawType, address tokenAddress, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 prizePool, uint256 startTime, uint256 endTime, uint256 minParticipants, uint256 platformFeePercent, bool isCompleted, bool isCancelled, uint256 participantCount, uint256 monthlyPoolContribution, uint256 executorFeeCollected)",
  "function createLYXDraw(uint256 ticketPrice, uint256 maxTickets, uint256 duration, uint256 minParticipants, uint256 platformFeePercent, uint256 creatorContribution) payable"
];

const PLATFORM_ABI = [
  "function getPlatformDrawsInfo() view returns (uint256 weeklyDrawId, uint256 monthlyDrawId, uint256 weeklyEndTime, uint256 monthlyEndTime, uint256 monthlyPoolBalance, uint256 weeklyCount)",
  "function getUserMonthlyTickets(address user) view returns (uint256 fromWeekly, uint256 fromCreating, uint256 fromParticipating, uint256 total)",
  "function executeWeeklyDraw()",
  "function executeMonthlyDraw()"
];

const EXECUTION_ABI = [
  "function executeDraw(uint256 drawId)",
  "function canExecuteDraw(uint256 drawId) view returns (bool)",
  "function getDrawWinners(uint256 drawId) view returns (address[] winners, uint256[] amounts)"
];
```

## 🎯 Key UI/UX Recommendations

1. **Real-time Updates**: Show live executor rewards on draw cards
2. **Fee Transparency**: Display complete fee breakdown before ticket purchase
3. **Executor Incentive**: Highlight potential executor earnings prominently
4. **Countdown Timers**: Show time remaining for each draw
5. **Monthly Ticket Tracker**: Display user's monthly ticket balance and sources
6. **Platform Stats**: Show total platform fees collected, total prizes distributed

## 📱 Mobile Considerations

- Use responsive design for fee breakdowns
- Make executor reward buttons prominent and touch-friendly
- Show simplified views on mobile with expandable details
- Cache draw data to reduce RPC calls

## 🔐 Security Notes

- Always validate user inputs
- Check allowances before token operations
- Handle transaction failures gracefully
- Show loading states during blockchain operations
- Implement retry mechanisms for failed transactions

---

**Diamond Address**: `0x00102a0aAb6027bB027C0F032583Cf88353E4900`  
**Last Updated**: January 28, 2025