// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoCoreV2UpgradeFacet
 * @notice Upgraded buyTickets function with upfront fee deduction
 * @dev Only contains the buyTickets function to replace the existing one
 */
contract GridottoCoreV2UpgradeFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event TicketsPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount, uint256 totalCost);
    event MonthlyTicketsAwarded(address indexed user, uint256 amount);
    event FeesDeducted(uint256 indexed drawId, uint256 platformFee, uint256 executorFee, uint256 monthlyContribution);
    
    modifier notPaused() {
        require(!LibGridottoStorageV2.layout().paused, "System paused");
        _;
    }
    
    /**
     * @notice Buy tickets with upfront fee deduction
     * @dev Fees are deducted immediately and distributed to appropriate pools
     */
    function buyTickets(uint256 drawId, uint256 amount) external payable notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Draw ended");
        require(block.timestamp >= draw.startTime && block.timestamp < draw.endTime, "Not active");
        require(amount > 0 && draw.ticketsSold + amount <= draw.config.maxTickets, "Invalid amount");
        
        uint256 totalCost = draw.config.ticketPrice * amount;
        uint256 netAmount = totalCost; // Amount after all deductions
        uint256 platformFee = 0;
        uint256 executorFee = 0;
        uint256 monthlyContribution = 0;
        
        // Calculate fees based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY) {
            // Weekly draw: 20% to monthly pool, 5% platform fee, 5% executor fee
            monthlyContribution = (totalCost * s.weeklyMonthlyPercent) / 10000; // 20%
            platformFee = (totalCost * s.defaultPlatformFee) / 10000; // 5%
            executorFee = (totalCost * s.executorFeePercent) / 10000; // 5%
            netAmount = totalCost - monthlyContribution - platformFee - executorFee; // 70% to prize pool
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            // Monthly draw: only platform and executor fees
            platformFee = (totalCost * s.defaultPlatformFee) / 10000; // 5%
            executorFee = (totalCost * s.executorFeePercent) / 10000; // 5%
            netAmount = totalCost - platformFee - executorFee; // 90% to prize pool
        } else {
            // User draws: platform fee + executor fee + monthly contribution (LYX only)
            platformFee = (totalCost * s.defaultPlatformFee) / 10000; // 5%
            executorFee = (totalCost * s.executorFeePercent) / 10000; // 5%
            
            // Monthly contribution only for LYX draws (not NFT or token)
            if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX) {
                monthlyContribution = (totalCost * s.monthlyPoolPercent) / 10000; // 2%
            }
            
            netAmount = totalCost - platformFee - executorFee - monthlyContribution;
        }
        
        // Handle payment based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            
            require(msg.value >= totalCost, "Insufficient payment");
            
            // Add net amount to prize pool
            draw.prizePool += netAmount;
            
            // Distribute fees immediately
            if (platformFee > 0) {
                s.platformFeesLYX += platformFee;
            }
            if (executorFee > 0) {
                // Store executor fee to be claimed later
                draw.executorFeeCollected += executorFee;
            }
            if (monthlyContribution > 0) {
                s.monthlyPoolBalance += monthlyContribution;
                draw.monthlyPoolContribution += monthlyContribution;
            }
            
            // Refund excess
            if (msg.value > totalCost) {
                (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
                require(success, "Refund failed");
            }
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            // Handle token payment
            ILSP7(draw.tokenAddress).transfer(msg.sender, address(this), totalCost, true, "");
            
            // Add net amount to prize pool (fees already calculated above)
            draw.prizePool += netAmount;
            
            // Distribute token fees
            if (platformFee > 0) {
                s.platformFeesToken[draw.tokenAddress] += platformFee;
            }
            if (executorFee > 0) {
                draw.executorFeeCollected += executorFee;
            }
            // Note: No monthly contribution for token draws
        }
        
        // Update participant data
        if (!draw.hasParticipated[msg.sender]) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
            s.userDrawHistory[msg.sender].push(drawId);
            
            // Award monthly tickets for participating (max 1 per draw, 15 per month)
            if (draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY &&
                draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
                _awardMonthlyTicketsForParticipating(msg.sender, drawId);
            }
        }
        
        draw.ticketCount[msg.sender] += amount;
        draw.ticketsSold += amount;
        
        // Update global stats
        s.totalTicketsSold += amount;
        s.userTotalTickets[msg.sender] += amount;
        s.userTotalSpent[msg.sender] += totalCost;
        
        // Award monthly tickets for weekly participation
        if (draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY) {
            _awardMonthlyTicketsForWeekly(msg.sender, amount);
        }
        
        emit TicketsPurchased(drawId, msg.sender, amount, totalCost);
        if (platformFee > 0 || executorFee > 0 || monthlyContribution > 0) {
            emit FeesDeducted(drawId, platformFee, executorFee, monthlyContribution);
        }
    }
    
    // Award monthly tickets for participating in draws
    function _awardMonthlyTicketsForParticipating(address user, uint256 drawId) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 currentMonth = block.timestamp / 2592000; // 30 days
        uint256 currentMonthStart = currentMonth * 2592000;
        
        // Reset monthly counters if new month
        if (s.userMonthlyTickets[user].lastResetTime < currentMonthStart) {
            s.userMonthlyTickets[user].fromWeekly = 0;
            s.userMonthlyTickets[user].fromCreating = 0;
            s.userMonthlyTickets[user].fromParticipating = 0;
            s.userMonthlyTickets[user].lastResetTime = currentMonthStart;
        }
        
        // Check if already participated in this draw
        if (!s.userMonthlyTickets[user].participatedDraws[drawId] && 
            s.userMonthlyTickets[user].fromParticipating < 15) {
            
            s.userMonthlyTickets[user].participatedDraws[drawId] = true;
            s.userMonthlyTickets[user].fromParticipating++;
            
            emit MonthlyTicketsAwarded(user, 1);
        }
    }
    
    // Award monthly tickets for weekly draw participation
    function _awardMonthlyTicketsForWeekly(address user, uint256 ticketAmount) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 currentMonth = block.timestamp / 2592000;
        uint256 currentMonthStart = currentMonth * 2592000;
        
        // Reset monthly counters if new month
        if (s.userMonthlyTickets[user].lastResetTime < currentMonthStart) {
            s.userMonthlyTickets[user].fromWeekly = 0;
            s.userMonthlyTickets[user].fromCreating = 0;
            s.userMonthlyTickets[user].fromParticipating = 0;
            s.userMonthlyTickets[user].lastResetTime = currentMonthStart;
        }
        
        // Award 1 monthly ticket per 10 weekly tickets
        uint256 monthlyTicketsToAward = ticketAmount / 10;
        if (monthlyTicketsToAward > 0) {
            s.userMonthlyTickets[user].fromWeekly += monthlyTicketsToAward;
            
            emit MonthlyTicketsAwarded(user, monthlyTicketsToAward);
        }
    }
}

// Minimal interface for LUKSO standards
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}