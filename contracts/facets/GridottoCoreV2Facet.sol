// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

contract GridottoCoreV2Facet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event DrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorageV2.DrawType drawType);
    event TicketsPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount);
    event DrawCancelled(uint256 indexed drawId);
    event MonthlyTicketsAwarded(address indexed user, uint256 amount, string reason);
    
    modifier notPaused() { require(!LibGridottoStorageV2.layout().paused, "System paused"); _; }
    
    // Create LYX Draw
    function createLYXDraw(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 platformFeePercent
    ) external payable notPaused returns (uint256 drawId) {
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 60 && duration <= 30 days, "Invalid duration");
        require(platformFeePercent <= 2000, "Fee too high");
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        drawId = ++s.nextDrawId;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageV2.DrawType.USER_LYX;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            duration: duration,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        
        if (msg.value > 0) {
            draw.creatorContribution = msg.value;
            draw.prizePool = msg.value;
        }
        
        s.totalDrawsCreated++;
        s.userDrawsCreated[msg.sender]++;
        s.userDrawHistory[msg.sender].push(drawId);
        
        // Award monthly tickets for creating (max 5/month)
        _awardMonthlyTicketsForCreating(msg.sender);
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageV2.DrawType.USER_LYX);
    }
    
    // Buy Tickets
    function buyTickets(uint256 drawId, uint256 amount) external payable notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Draw ended");
        require(block.timestamp >= draw.startTime && block.timestamp < draw.endTime, "Not active");
        require(amount > 0 && draw.ticketsSold + amount <= draw.config.maxTickets, "Invalid amount");
        
        uint256 totalCost = draw.config.ticketPrice * amount;
        
        // Handle payment based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY) {
            
            require(msg.value >= totalCost, "Insufficient payment");
            
            // For non-weekly LYX draws, deduct 2% for monthly pool
            if (draw.drawType != LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY) {
                uint256 monthlyContribution = (totalCost * s.monthlyPoolPercent) / 10000;
                s.monthlyPoolBalance += monthlyContribution;
                draw.prizePool += (totalCost - monthlyContribution);
                draw.monthlyPoolContribution += monthlyContribution;
            } else {
                // Weekly draws add full amount to prize pool
                draw.prizePool += totalCost;
            }
            
            // Refund excess
            if (msg.value > totalCost) {
                (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
                require(success, "Refund failed");
            }
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            // Handle token payment (implementation needed)
            revert("LSP7 payment not implemented in this example");
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
        
        emit TicketsPurchased(drawId, msg.sender, amount);
    }
    
    // Award monthly tickets for weekly participation
    function _awardMonthlyTicketsForWeekly(address user, uint256 tickets) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.MonthlyTickets storage monthlyTickets = s.userMonthlyTickets[user];
        
        _checkMonthlyReset(user);
        
        monthlyTickets.fromWeekly += tickets;
        _addToMonthlyParticipants(user);
        emit MonthlyTicketsAwarded(user, tickets, "Weekly participation");
    }
    
    // Award monthly tickets for creating draws (max 5/month)
    function _awardMonthlyTicketsForCreating(address user) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.MonthlyTickets storage monthlyTickets = s.userMonthlyTickets[user];
        
        _checkMonthlyReset(user);
        
        if (monthlyTickets.fromCreating < 5) {
            monthlyTickets.fromCreating += 1;
            _addToMonthlyParticipants(user);
            emit MonthlyTicketsAwarded(user, 1, "Draw creation");
        }
    }
    
    // Award monthly tickets for participating (max 1 per draw, 15 total/month)
    function _awardMonthlyTicketsForParticipating(address user, uint256 drawId) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.MonthlyTickets storage monthlyTickets = s.userMonthlyTickets[user];
        
        _checkMonthlyReset(user);
        
        if (monthlyTickets.fromParticipating < 15 && !monthlyTickets.participatedDraws[drawId]) {
            monthlyTickets.fromParticipating += 1;
            monthlyTickets.participatedDraws[drawId] = true;
            _addToMonthlyParticipants(user);
            emit MonthlyTicketsAwarded(user, 1, "Draw participation");
        }
    }
    
    // Add user to monthly participants list if not already there
    function _addToMonthlyParticipants(address user) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        if (!s.isMonthlyParticipant[user]) {
            s.monthlyParticipants.push(user);
            s.isMonthlyParticipant[user] = true;
        }
    }
    
    // Check if monthly tickets need reset
    function _checkMonthlyReset(address user) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.MonthlyTickets storage tickets = s.userMonthlyTickets[user];
        
        if (block.timestamp >= tickets.lastResetTime + 28 days) {
            tickets.fromWeekly = 0;
            tickets.fromCreating = 0;
            tickets.fromParticipating = 0;
            tickets.lastResetTime = block.timestamp;
            // Note: participatedDraws mapping would need manual cleanup in production
        }
    }
    
    // Get user draw history
    function getUserDrawHistory(address user) external view returns (uint256[] memory) {
        return LibGridottoStorageV2.layout().userDrawHistory[user];
    }
    
    // Cancel draw (only creator or owner)
    function cancelDraw(uint256 drawId) external {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted, "Already completed");
        require(!draw.isCancelled, "Already cancelled");
        
        bool isOwner = msg.sender == LibDiamond.contractOwner();
        bool isCreator = msg.sender == draw.creator;
        bool canCancel = draw.participants.length < draw.config.minParticipants && 
                        block.timestamp >= draw.endTime;
        
        require(isOwner || (isCreator && canCancel), "Not authorized");
        
        draw.isCancelled = true;
        
        // Note: Refunds would be handled by manual claims
        
        emit DrawCancelled(drawId);
    }
    
    // View functions (similar to original implementation)
    function getDrawDetails(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorageV2.DrawType drawType,
        address tokenAddress,
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
    ) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        return (
            draw.creator,
            draw.drawType,
            draw.tokenAddress,
            draw.config.ticketPrice,
            draw.config.maxTickets,
            draw.ticketsSold,
            draw.prizePool,
            draw.startTime,
            draw.endTime,
            draw.config.minParticipants,
            draw.config.platformFeePercent,
            draw.isCompleted,
            draw.isCancelled,
            draw.participants.length,
            draw.monthlyPoolContribution
        );
    }
}