# 🎯 Gridotto Upfront Fee Deduction Upgrade Documentation

## 📅 Deployment Date: January 25, 2025
## 📅 Final Update: January 25, 2025 - Complete Fee Structure

## 🔄 Overview

This document describes the major upgrade to Gridotto's fee collection mechanism, transitioning from **post-execution fee deduction** to **upfront fee deduction** during ticket purchases.

## 🎯 Key Changes

### 1. **buyTickets Function Updated**
- **Facet**: `GridottoCoreV2UpgradeFacet`
- **Address**: `0xb7a4E6394CeAc285cc9d93D94e54c77a99a8D0F3`
- **Function**: `buyTickets(uint256 drawId, uint256 amount)`
- **Change**: Fees are now deducted immediately when tickets are purchased

### 2. **Fee Structure**

#### Platform Draws:
- **Weekly Draw**: 30% total deduction
  - 20% → Monthly Pool (`monthlyPoolBalance`)
  - 5% → Platform Fee (`platformFeesLYX`)
  - 5% → Executor Fee (`draw.executorFeeCollected`)
  - **70% → Prize Pool**

- **Monthly Draw**: 10% total deduction
  - 5% → Platform Fee (`platformFeesLYX`)
  - 5% → Executor Fee (`draw.executorFeeCollected`)
  - **90% → Prize Pool**

#### User Draws:
- **LYX Draw**: 12% total deduction
  - 5% → Platform Fee (`platformFeesLYX`)
  - 5% → Executor Fee (`draw.executorFeeCollected`)
  - 2% → Monthly Pool (`monthlyPoolBalance`)
  - **88% → Prize Pool**

- **Token Draw**: 10% total deduction
  - 5% → Platform Fee (`platformFeesToken[tokenAddress]`)
  - 5% → Executor Fee (`draw.executorFeeCollected`)
  - **90% → Prize Pool**

- **NFT Draw**: 10% total deduction
  - 5% → Platform Fee (`platformFeesLYX`)
  - 5% → Executor Fee (`draw.executorFeeCollected`)
  - **90% → Creator (as LYX)**
  - **NFT → Winner**

### 3. **New Storage Fields**
```solidity
// In Draw struct
uint256 executorFeeCollected; // Stores executor fee collected during ticket sales

// In Layout struct
mapping(address => uint256) claimableExecutorFees; // Executor fees ready to claim
```

### 4. **Updated Facets & Functions**

#### GridottoCoreV2UpgradeFacet (`0x074C7E973aaf1fA6581e84E94d0fc00eBEE18307`)
- `buyTickets()` - Now deducts fees upfront for ALL draw types

#### GridottoExecutionV2UpgradeFacet (`0x5DA06fcb37E973C06112A2089d92a140653Af18B`)
- `executeDraw()` - No fee deduction, adds executor fee to claimable

#### GridottoPrizeClaimFacet (`0xF6847262fb0634365d3bE9CF079aD9Ed21dE4ff7`)
- `claimPrize()` - Winners claim prizes, NFT creators receive LYX
- `claimExecutorFees()` - Executors claim accumulated fees
- `getClaimableExecutorFees()` - Check claimable balance

## 🔧 Technical Details

### Modified Functions

#### buyTickets (Updated)
```solidity
// Before: All funds went to prize pool
draw.prizePool += totalCost;

// After: Fees deducted first
uint256 platformFee = (totalCost * feePercent) / 10000;
uint256 executorFee = (totalCost * executorPercent) / 10000;
uint256 monthlyContribution = (totalCost * monthlyPercent) / 10000;
uint256 netAmount = totalCost - platformFee - executorFee - monthlyContribution;

draw.prizePool += netAmount; // Only net amount goes to prize pool
s.platformFeesLYX += platformFee;
draw.executorFeeCollected += executorFee;
s.monthlyPoolBalance += monthlyContribution;
```

#### executeDraw (No Changes Needed)
- Already updated to use claim mechanism
- Executor fees added to `claimableExecutorFees` mapping
- No fee deduction during execution (already done during ticket sales)

## 🖥️ UI Updates Required

### 1. **Draw Display**
- **Prize Pool**: Now shows NET amount (after fees)
- Add tooltip/info: "Prize pool shows amount after platform fees"
- Consider showing breakdown:
  ```
  Ticket Price: 1 LYX
  Platform Fee: 0.05 LYX (5%)
  Executor Fee: 0.05 LYX (5%)
  Monthly Pool: 0.20 LYX (20%)
  → Prize Pool: 0.70 LYX per ticket
  ```

### 2. **Ticket Purchase**
- Update confirmation dialog to show fee breakdown
- Examples:

  **Weekly Draw (10 tickets @ 1 LYX):**
  ```
  Total Cost: 10 LYX
  
  Fee Breakdown:
  - To Prize Pool: 7 LYX (70%)
  - To Monthly Pool: 2 LYX (20%)
  - Platform Fee: 0.5 LYX (5%)
  - Executor Fee: 0.5 LYX (5%)
  ```

  **User LYX Draw (10 tickets @ 1 LYX):**
  ```
  Total Cost: 10 LYX
  
  Fee Breakdown:
  - To Prize Pool: 8.8 LYX (88%)
  - To Monthly Pool: 0.2 LYX (2%)
  - Platform Fee: 0.5 LYX (5%)
  - Executor Fee: 0.5 LYX (5%)
  ```

  **NFT Draw (10 tickets @ 1 LYX):**
  ```
  Total Cost: 10 LYX
  
  Fee Breakdown:
  - To Creator: 9 LYX (90%)
  - Platform Fee: 0.5 LYX (5%)
  - Executor Fee: 0.5 LYX (5%)
  
  Winner receives: [NFT Name]
  ```

### 3. **Executor Dashboard**
- Add "Claimable Fees" section
- Show total claimable: `getClaimableExecutorFees(executorAddress)`
- Add "Claim Fees" button → calls `claimExecutorFees()`

### 4. **Winner Dashboard**
- Add "Unclaimed Prizes" section
- Use `getUnclaimedPrizes(userAddress)` to list prizes
- Add "Claim Prize" button for each draw

### 5. **Refund Calculations**
- **Important**: Refunds only return the NET amount (after fees)
- Update refund display to show: "Refund Amount: X LYX (fees non-refundable)"

## 🚨 Breaking Changes

### For Existing Draws:
- ✅ **No impact** - Old draws continue with old mechanism
- Only new ticket purchases use upfront deduction

### For New Draws:
- ⚠️ **Prize pool shows different amount** than ticket sales
- ⚠️ **Refunds are smaller** (only net amount refunded)
- ⚠️ **Executor fees must be claimed** (not auto-transferred)

## 📊 Example Scenarios

### Weekly Draw - 100 LYX in ticket sales:
- **Before**: Prize Pool = 100 LYX, fees deducted at execution
- **After**: Prize Pool = 70 LYX, fees already deducted
  - 20 LYX → Monthly Pool
  - 5 LYX → Platform
  - 5 LYX → Executor (claimable)

### LYX User Draw - 100 LYX in ticket sales:
- **Before**: Prize Pool = 100 LYX, fees deducted at execution
- **After**: Prize Pool = 88 LYX, fees already deducted
  - 5 LYX → Platform
  - 5 LYX → Executor (claimable)
  - 2 LYX → Monthly Pool

### NFT User Draw - 100 LYX in ticket sales:
- **Before**: Complex fee distribution at execution
- **After**: 
  - Creator receives: 90 LYX (when winner claims)
  - Winner receives: NFT
  - Platform: 5 LYX
  - Executor: 5 LYX (claimable)

## 🔐 Security Considerations

1. **Claim Security**: 
   - Only winners can claim their specific prizes
   - Only executors can claim their earned fees
   - Double-claim prevention via `hasClaimed` mapping

2. **Refund Security**:
   - Platform fees are non-refundable
   - Only net amounts are refunded
   - Prevents platform loss on cancellations

## 📋 Deployment Checklist

- [x] Deploy `GridottoCoreV2UpgradeFacet`
- [x] Replace `buyTickets` function
- [x] Deploy `GridottoPrizeClaimFacet`
- [x] Update `ExecutionV2Facet` to use claim mechanism
- [ ] Update UI to show net prize pools
- [ ] Add fee breakdown in ticket purchase flow
- [ ] Add claim interfaces for executors and winners
- [ ] Update refund displays
- [ ] Test with new draws

## 🛠️ Rollback Plan

If issues arise:
1. Deploy original `GridottoCoreV2Facet`
2. Replace `buyTickets` with original version
3. Remove claim requirements from `ExecutionV2Facet`

## 📞 Support

For questions about this upgrade:
- Check draw type for fee structure
- Use `getDrawDetails(drawId)` to see current state
- Monitor `FeesDeducted` events for fee tracking

---

**Note**: This is a major upgrade that fundamentally changes how fees are collected. Ensure all team members understand these changes before proceeding with UI updates.