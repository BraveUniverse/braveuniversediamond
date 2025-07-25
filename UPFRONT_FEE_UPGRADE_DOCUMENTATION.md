# 🎯 Gridotto Upfront Fee Deduction Upgrade Documentation

## 📅 Deployment Date: January 25, 2025

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
- **0% fees** - Users receive 100% of ticket sales
- No platform fee, executor fee, or monthly contribution

### 3. **New Storage Field**
```solidity
// In Draw struct
uint256 executorFeeCollected; // Stores executor fee collected during ticket sales
```

### 4. **Claim Mechanism Integration**
- **GridottoPrizeClaimFacet** (`0x9d00fa1F4BBBCcE5AFE72443CA5DdC380e45606f`)
  - `claimPrize(drawId)` - Winners claim their prizes
  - `claimExecutorFees()` - Executors claim accumulated fees
  - `getClaimableExecutorFees(address)` - Check claimable balance

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
- Example for weekly draw:
  ```
  You are buying: 10 tickets
  Total Cost: 10 LYX
  
  Fee Breakdown:
  - To Prize Pool: 7 LYX (70%)
  - To Monthly Pool: 2 LYX (20%)
  - Platform Fee: 0.5 LYX (5%)
  - Executor Fee: 0.5 LYX (5%)
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

### User Draw - 100 LYX in ticket sales:
- **Before**: Prize Pool = 100 LYX, platform takes cut at execution
- **After**: Prize Pool = 100 LYX, no fees for user draws!

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