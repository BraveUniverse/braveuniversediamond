// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/ILSP7DigitalAsset.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title GridottoCoreV3Facet
 * @notice Enhanced version with upfront fee deduction during ticket sales
 * @dev Fees are deducted immediately on ticket purchase, not at draw execution
 */
contract GridottoCoreV3Facet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event DrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorageV2.DrawType drawType);
    event TicketsPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount, uint256 totalCost);
    event MonthlyTicketsAwarded(address indexed user, uint256 amount);
    event FeesDeducted(uint256 indexed drawId, uint256 platformFee, uint256 executorFee, uint256 monthlyContribution);
    
    modifier notPaused() {
        require(!LibGridottoStorageV2.layout().paused, "System paused");
        _;
    }
    
    // Create LYX Draw
    function createLYXDraw(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 platformFeePercent
    ) external payable notPaused returns (uint256) {
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 3600 && duration <= 2592000, "Duration 1h-30d");
        require(minParticipants > 0 && minParticipants <= maxTickets, "Invalid min participants");
        require(platformFeePercent <= 2000, "Fee too high");
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 drawId = s.nextDrawId++;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageV2.DrawType.USER_LYX;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.prizePool = msg.value;
        draw.initialPrize = msg.value;
        
        s.totalDrawsCreated++;
        s.userDrawHistory[msg.sender].push(drawId);
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageV2.DrawType.USER_LYX);
        return drawId;
    }
    
    // Create Token Draw (LSP7)
    function createTokenDraw(
        address tokenAddress,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 initialPrize,
        uint256 platformFeePercent
    ) external notPaused returns (uint256) {
        require(tokenAddress != address(0), "Invalid token");
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 3600 && duration <= 2592000, "Duration 1h-30d");
        require(minParticipants > 0 && minParticipants <= maxTickets, "Invalid min participants");
        require(platformFeePercent <= 2000, "Fee too high");
        
        ILSP7(tokenAddress).transfer(msg.sender, address(this), initialPrize, true, "");
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 drawId = s.nextDrawId++;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageV2.DrawType.USER_LSP7;
        draw.tokenAddress = tokenAddress;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.prizePool = initialPrize;
        draw.initialPrize = initialPrize;
        
        s.totalDrawsCreated++;
        s.userDrawHistory[msg.sender].push(drawId);
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageV2.DrawType.USER_LSP7);
        return drawId;
    }
    
    // Create NFT Draw (LSP8)
    function createNFTDraw(
        address nftAddress,
        bytes32 tokenId,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 platformFeePercent
    ) external payable notPaused returns (uint256) {
        require(nftAddress != address(0), "Invalid NFT");
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 3600 && duration <= 2592000, "Duration 1h-30d");
        require(minParticipants > 0 && minParticipants <= maxTickets, "Invalid min participants");
        require(platformFeePercent <= 2000, "Fee too high");
        
        ILSP8(nftAddress).transfer(msg.sender, address(this), tokenId, true, "");
        
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        uint256 drawId = s.nextDrawId++;
        
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageV2.DrawType.USER_LSP8;
        draw.tokenAddress = nftAddress;
        draw.nftTokenId = tokenId;
        draw.config = LibGridottoStorageV2.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.prizePool = msg.value;
        draw.initialPrize = msg.value;
        
        s.totalDrawsCreated++;
        s.userDrawHistory[msg.sender].push(drawId);
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageV2.DrawType.USER_LSP8);
        return drawId;
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
            // User draws: use custom platform fee + executor fee + monthly contribution
            platformFee = (totalCost * draw.config.platformFeePercent) / 10000;
            executorFee = (totalCost * s.executorFeePercent) / 10000; // 5%
            monthlyContribution = (totalCost * s.monthlyPoolPercent) / 10000; // 2%
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
                // Store executor fee to be paid when draw is executed
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
            
            // Add net amount to prize pool
            draw.prizePool += netAmount;
            
            // Distribute token fees
            if (platformFee > 0) {
                s.platformFeesToken[draw.tokenAddress] += platformFee;
            }
            if (executorFee > 0) {
                draw.executorFeeCollected += executorFee;
            }
            if (monthlyContribution > 0) {
                // For token draws, monthly contribution stays in token form
                draw.monthlyPoolContribution += monthlyContribution;
            }
        }
        
        // Update participant data
        if (!draw.hasParticipated[msg.sender]) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
            s.userDrawHistory[msg.sender].push(drawId);
            
            // Award monthly tickets for participating
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
        emit FeesDeducted(drawId, platformFee, executorFee, monthlyContribution);
    }
    
    // Award monthly tickets for participating in draws
    function _awardMonthlyTicketsForParticipating(address user, uint256 drawId) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 currentMonth = block.timestamp / 2592000; // 30 days
        
        if (s.userMonthlyTickets[user].lastResetMonth < currentMonth) {
            s.userMonthlyTickets[user].ticketsEarnedThisMonth = 0;
            s.userMonthlyTickets[user].participatedDraws = 0;
            s.userMonthlyTickets[user].lastResetMonth = currentMonth;
        }
        
        if (s.userMonthlyTickets[user].participatedDraws < 15 && 
            !s.userMonthlyTickets[user].hasParticipatedInDraw[drawId]) {
            
            s.userMonthlyTickets[user].participatedDraws++;
            s.userMonthlyTickets[user].ticketsEarnedThisMonth++;
            s.userMonthlyTickets[user].totalTickets++;
            s.userMonthlyTickets[user].hasParticipatedInDraw[drawId] = true;
            
            emit MonthlyTicketsAwarded(user, 1);
        }
    }
    
    // Award monthly tickets for weekly draw participation
    function _awardMonthlyTicketsForWeekly(address user, uint256 ticketAmount) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 currentMonth = block.timestamp / 2592000;
        
        if (s.userMonthlyTickets[user].lastResetMonth < currentMonth) {
            s.userMonthlyTickets[user].ticketsEarnedThisMonth = 0;
            s.userMonthlyTickets[user].participatedDraws = 0;
            s.userMonthlyTickets[user].lastResetMonth = currentMonth;
        }
        
        uint256 monthlyTicketsToAward = ticketAmount / 10;
        if (monthlyTicketsToAward > 0) {
            s.userMonthlyTickets[user].ticketsEarnedThisMonth += monthlyTicketsToAward;
            s.userMonthlyTickets[user].totalTickets += monthlyTicketsToAward;
            
            emit MonthlyTicketsAwarded(user, monthlyTicketsToAward);
        }
    }
    
    // Get draw details
    function getDrawDetails(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorageV2.DrawType drawType,
        address tokenAddress,
        bytes32 nftTokenId,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 ticketsSold,
        uint256 prizePool,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted,
        bool isCancelled,
        address winner,
        uint256 platformFeePercent,
        uint256 minParticipants,
        uint256 participantCount
    ) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        return (
            draw.creator,
            draw.drawType,
            draw.tokenAddress,
            draw.nftTokenId,
            draw.config.ticketPrice,
            draw.config.maxTickets,
            draw.ticketsSold,
            draw.prizePool,
            draw.startTime,
            draw.endTime,
            draw.isCompleted,
            draw.isCancelled,
            draw.winner,
            draw.config.platformFeePercent,
            draw.config.minParticipants,
            draw.participants.length
        );
    }
}