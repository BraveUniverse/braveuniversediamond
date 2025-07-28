// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IOracleFacet.sol";

contract GridottoPlatformDrawsFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event WeeklyDrawCreated(uint256 indexed drawId, uint256 endTime);
    event MonthlyDrawCreated(uint256 indexed drawId, uint256 endTime);
    event MonthlyTicketsAwarded(address indexed user, uint256 tickets, string reason);
    
    modifier onlyOwner() { LibDiamond.enforceIsContractOwner(); _; }
    modifier notPaused() { require(!LibGridottoStorageV2.layout().paused, "System paused"); _; }
    
    // Initialize platform draws (called once after deployment)
    function initializePlatformDraws() external onlyOwner {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        // Set default percentages
        s.defaultPlatformFee = 500; // 5%
        s.executorFeePercent = 500; // 5%
        s.monthlyPoolPercent = 200; // 2%
        s.weeklyMonthlyPercent = 2000; // 20%
        
        // Create first weekly draw
        _createWeeklyDraw();
        
        // Create first monthly draw
        _createMonthlyDraw();
    }
    
    // Create weekly draw (internal)
    function _createWeeklyDraw() internal returns (uint256 drawId) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        drawId = ++s.nextDrawId;
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        draw.creator = address(this);
        draw.drawType = LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: 0.25 ether, // 0.25 LYX
            maxTickets: type(uint256).max, // Unlimited
            duration: 7 days,
            minParticipants: 0, // No minimum for platform draws
            platformFeePercent: 500 // 5%
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + 7 days;
        
        s.currentWeeklyDrawId = drawId;
        s.lastWeeklyDrawTime = block.timestamp;
        s.totalDrawsCreated++;
        
        emit WeeklyDrawCreated(drawId, draw.endTime);
    }
    
    // Create monthly draw (internal)
    function _createMonthlyDraw() internal returns (uint256 drawId) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        drawId = ++s.nextDrawId;
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        draw.creator = address(this);
        draw.drawType = LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: 0, // No direct ticket purchase
            maxTickets: type(uint256).max,
            duration: 28 days,
            minParticipants: 0,
            platformFeePercent: 500
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + 28 days;
        draw.prizePool = s.monthlyPoolBalance; // Transfer accumulated balance to prize pool
        
        s.currentMonthlyDrawId = drawId;
        s.monthlyPoolBalance = 0; // Reset pool after transferring to draw
        s.weeklyDrawCount = 0; // Reset counter
        s.totalDrawsCreated++;
        
        emit MonthlyDrawCreated(drawId, draw.endTime);
    }
    
    // Execute weekly draw and create new one
    function executeWeeklyDraw() external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 drawId = s.currentWeeklyDrawId;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        require(!draw.isCompleted && !draw.isCancelled, "Invalid state");
        require(block.timestamp >= draw.endTime, "Not ended");
        require(draw.participants.length > 0, "No participants");
        
        draw.isCompleted = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // For weekly draws, fees are already collected in buyTickets
        uint256 executorFee = draw.executorFeeCollected;
        uint256 winnerPrize = draw.prizePool; // Prize pool already has fees deducted
        
        // Select winner using Oracle
        uint256 randomNumber = IOracleFacet(address(this)).getRandomNumber();
        uint256 winnerIndex = randomNumber % draw.ticketsSold;
        
        // Find winner
        uint256 ticketCounter = 0;
        address winner;
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.ticketCount[participant];
            if (ticketCounter + userTickets > winnerIndex) {
                winner = participant;
                break;
            }
            ticketCounter += userTickets;
        }
        
        draw.winners.push(winner);
        draw.winnerAmounts.push(winnerPrize);
        
        // Update stats
        s.totalExecutions++;
        s.totalPrizesDistributed += winnerPrize;
        s.userDrawsExecuted[msg.sender]++;
        s.userExecutionFees[msg.sender] += executorFee;
        s.userTotalWins[winner]++;
        s.userTotalWinnings[winner] += winnerPrize;
        
        // Pay executor
        if (executorFee > 0) {
            (bool success, ) = msg.sender.call{value: executorFee}("");
            require(success, "Executor fee failed");
        }
        
        // Increment weekly counter
        s.weeklyDrawCount++;
        
        // Create new weekly draw
        _createWeeklyDraw();
        
        // No need to create monthly here - it's handled in executeMonthlyDraw
    }
    
    // Execute monthly draw
    function executeMonthlyDraw() external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 drawId = s.currentMonthlyDrawId;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        require(!draw.isCompleted && !draw.isCancelled, "Invalid state");
        require(block.timestamp >= draw.endTime, "Not ended");
        
        // Build participant list from monthly tickets
        _buildMonthlyParticipantList(drawId);
        require(draw.participants.length > 0, "No participants");
        
        // Update prize pool with accumulated monthly balance
        draw.prizePool += s.monthlyPoolBalance;
        
        draw.isCompleted = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // For monthly draws, calculate fees from the prize pool since it comes from accumulated balance
        uint256 totalPool = draw.prizePool;
        uint256 platformFee = (totalPool * 500) / 10000; // 5%
        uint256 executorFee = (totalPool * 500) / 10000; // 5%
        uint256 winnerPrize = totalPool - platformFee - executorFee;
        
        // Update balances
        s.platformFeesLYX += platformFee;
        draw.executorFeeCollected = executorFee; // Store for tracking
        
        // Select winner using Oracle
        uint256 randomNumber = IOracleFacet(address(this)).getRandomNumber();
        uint256 winnerIndex = randomNumber % draw.ticketsSold;
        
        // Find winner
        uint256 ticketCounter = 0;
        address winner;
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.ticketCount[participant];
            if (ticketCounter + userTickets > winnerIndex) {
                winner = participant;
                break;
            }
            ticketCounter += userTickets;
        }
        
        draw.winners.push(winner);
        draw.winnerAmounts.push(winnerPrize);
        
        // Update stats
        s.totalExecutions++;
        s.totalPrizesDistributed += winnerPrize;
        s.userDrawsExecuted[msg.sender]++;
        s.userExecutionFees[msg.sender] += executorFee;
        s.userTotalWins[winner]++;
        s.userTotalWinnings[winner] += winnerPrize;
        
        // Pay executor
        if (executorFee > 0) {
            (bool success, ) = msg.sender.call{value: executorFee}("");
            require(success, "Executor fee failed");
        }
        
        // Reset all users' monthly tickets
        _resetAllMonthlyTickets();
        
        // Create new monthly draw immediately
        _createMonthlyDraw();
    }
    
    // Build participant list for monthly draw
    function _buildMonthlyParticipantList(uint256 drawId) internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        uint256 totalTickets = 0;
        
        // Add all monthly participants
        for (uint256 i = 0; i < s.monthlyParticipants.length; i++) {
            address participant = s.monthlyParticipants[i];
            LibGridottoStorageV2.MonthlyTickets storage tickets = s.userMonthlyTickets[participant];
            
            uint256 userTickets = tickets.fromWeekly + tickets.fromCreating + tickets.fromParticipating;
            
            if (userTickets > 0) {
                draw.participants.push(participant);
                draw.ticketCount[participant] = userTickets;
                draw.hasParticipated[participant] = true;
                totalTickets += userTickets;
            }
        }
        
        draw.ticketsSold = totalTickets;
    }
    
    // Reset all monthly tickets
    function _resetAllMonthlyTickets() internal {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        // Reset all participants
        for (uint256 i = 0; i < s.monthlyParticipants.length; i++) {
            address participant = s.monthlyParticipants[i];
            LibGridottoStorageV2.MonthlyTickets storage tickets = s.userMonthlyTickets[participant];
            
            tickets.fromWeekly = 0;
            tickets.fromCreating = 0;
            tickets.fromParticipating = 0;
            tickets.lastResetTime = block.timestamp;
            
            s.isMonthlyParticipant[participant] = false;
        }
        
        // Clear the participants array
        delete s.monthlyParticipants;
    }
    
    // Get current platform draws info
    function getPlatformDrawsInfo() external view returns (
        uint256 weeklyDrawId,
        uint256 monthlyDrawId,
        uint256 weeklyEndTime,
        uint256 monthlyEndTime,
        uint256 monthlyPoolBalance,
        uint256 weeklyCount
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        weeklyDrawId = s.currentWeeklyDrawId;
        monthlyDrawId = s.currentMonthlyDrawId;
        
        if (weeklyDrawId > 0) {
            weeklyEndTime = s.draws[weeklyDrawId].endTime;
        }
        
        if (monthlyDrawId > 0) {
            monthlyEndTime = s.draws[monthlyDrawId].endTime;
        }
        
        monthlyPoolBalance = s.monthlyPoolBalance;
        weeklyCount = s.weeklyDrawCount;
    }
    
    // Get user's monthly tickets
    function getUserMonthlyTickets(address user) external view returns (
        uint256 fromWeekly,
        uint256 fromCreating,
        uint256 fromParticipating,
        uint256 total
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.MonthlyTickets storage tickets = s.userMonthlyTickets[user];
        
        fromWeekly = tickets.fromWeekly;
        fromCreating = tickets.fromCreating;
        fromParticipating = tickets.fromParticipating;
        total = fromWeekly + fromCreating + fromParticipating;
    }
}