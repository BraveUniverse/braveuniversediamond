// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";

contract GridottoLeaderboardFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Structs for leaderboard data
    struct WinnerStats {
        address player;
        uint256 totalWinnings;
        uint256 drawsWon;
        uint256 lastWinTime;
    }
    
    struct TicketBuyerStats {
        address player;
        uint256 totalTickets;
        uint256 totalSpent;
        uint256 lastPurchaseTime;
    }
    
    struct DrawCreatorStats {
        address creator;
        uint256 drawsCreated;
        uint256 totalRevenue;
        uint256 successfulDraws;
        uint256 successRate; // percentage
    }
    
    struct ExecutorStats {
        address executor;
        uint256 executionsCount;
        uint256 totalFeesEarned;
        uint256 totalExecutionTime;
        uint256 avgExecutionTime;
    }
    
    struct PlatformStats {
        uint256 totalPrizesDistributed;
        uint256 totalTicketsSold;
        uint256 totalDrawsCreated;
        uint256 totalExecutions;
    }
    
    // Get top winners
    function getTopWinners(uint256 limit) external view returns (WinnerStats[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Create array to store all players with wins
        address[] memory players = new address[](1000); // Max 1000 players
        uint256 playerCount = 0;
        
        // Iterate through all draws to find winners
        for (uint256 i = 1; i < l.nextDrawId && playerCount < 1000; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            if (draw.isCompleted && draw.winners.length > 0) {
                for (uint256 j = 0; j < draw.winners.length; j++) {
                    address winner = draw.winners[j];
                    
                    // Check if player already in list
                    bool found = false;
                    for (uint256 k = 0; k < playerCount; k++) {
                        if (players[k] == winner) {
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found && playerCount < 1000) {
                        players[playerCount++] = winner;
                    }
                }
            }
        }
        
        // Calculate stats for each player
        WinnerStats[] memory stats = new WinnerStats[](playerCount);
        
        for (uint256 i = 0; i < playerCount; i++) {
            address player = players[i];
            uint256 totalWinnings = 0;
            uint256 drawsWon = 0;
            uint256 lastWinTime = 0;
            
            // Calculate winnings across all draws
            for (uint256 j = 1; j < l.nextDrawId; j++) {
                LibGridottoStorage.UserDraw storage draw = l.userDraws[j];
                if (draw.isCompleted) {
                    for (uint256 k = 0; k < draw.winners.length; k++) {
                        if (draw.winners[k] == player) {
                            totalWinnings += draw.winnerPrizes[k];
                            drawsWon++;
                            if (draw.endTime > lastWinTime) {
                                lastWinTime = draw.endTime;
                            }
                        }
                    }
                }
            }
            
            stats[i] = WinnerStats({
                player: player,
                totalWinnings: totalWinnings,
                drawsWon: drawsWon,
                lastWinTime: lastWinTime
            });
        }
        
        // Sort by total winnings (bubble sort for simplicity)
        for (uint256 i = 0; i < stats.length; i++) {
            for (uint256 j = i + 1; j < stats.length; j++) {
                if (stats[j].totalWinnings > stats[i].totalWinnings) {
                    WinnerStats memory temp = stats[i];
                    stats[i] = stats[j];
                    stats[j] = temp;
                }
            }
        }
        
        // Return top N
        uint256 resultSize = limit < stats.length ? limit : stats.length;
        WinnerStats[] memory result = new WinnerStats[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = stats[i];
        }
        
        return result;
    }
    
    // Get top ticket buyers
    function getTopTicketBuyers(uint256 limit) external view returns (TicketBuyerStats[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Create mapping to track buyers
        address[] memory buyers = new address[](1000);
        uint256 buyerCount = 0;
        
        // Iterate through all draws to find ticket buyers
        for (uint256 i = 1; i < l.nextDrawId && buyerCount < 1000; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            
            // Get participants for this draw
            address[] memory participants = draw.participants;
            
            for (uint256 j = 0; j < participants.length; j++) {
                address buyer = participants[j];
                
                // Check if buyer already in list
                bool found = false;
                for (uint256 k = 0; k < buyerCount; k++) {
                    if (buyers[k] == buyer) {
                        found = true;
                        break;
                    }
                }
                
                if (!found && buyerCount < 1000) {
                    buyers[buyerCount++] = buyer;
                }
            }
        }
        
        // Calculate stats for each buyer
        TicketBuyerStats[] memory stats = new TicketBuyerStats[](buyerCount);
        
        for (uint256 i = 0; i < buyerCount; i++) {
            address buyer = buyers[i];
            uint256 totalTickets = 0;
            uint256 totalSpent = 0;
            uint256 lastPurchase = 0;
            
            // Calculate tickets and spending across all draws
            for (uint256 j = 1; j < l.nextDrawId; j++) {
                LibGridottoStorage.UserDraw storage draw = l.userDraws[j];
                uint256 tickets = draw.userTickets[buyer];
                if (tickets > 0) {
                    totalTickets += tickets;
                    totalSpent += tickets * draw.ticketPrice;
                    
                    if (draw.startTime > lastPurchase) {
                        lastPurchase = draw.startTime;
                    }
                }
            }
            
            stats[i] = TicketBuyerStats({
                player: buyer,
                totalTickets: totalTickets,
                totalSpent: totalSpent,
                lastPurchaseTime: lastPurchase
            });
        }
        
        // Sort by total tickets (bubble sort)
        for (uint256 i = 0; i < stats.length; i++) {
            for (uint256 j = i + 1; j < stats.length; j++) {
                if (stats[j].totalTickets > stats[i].totalTickets) {
                    TicketBuyerStats memory temp = stats[i];
                    stats[i] = stats[j];
                    stats[j] = temp;
                }
            }
        }
        
        // Return top N
        uint256 resultSize = limit < stats.length ? limit : stats.length;
        TicketBuyerStats[] memory result = new TicketBuyerStats[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = stats[i];
        }
        
        return result;
    }
    
    // Get top draw creators
    function getTopDrawCreators(uint256 limit) external view returns (DrawCreatorStats[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Create mapping to track creators
        address[] memory creators = new address[](1000);
        uint256 creatorCount = 0;
        
        // Find all unique creators
        for (uint256 i = 1; i < l.nextDrawId && creatorCount < 1000; i++) {
            address creator = l.userDraws[i].creator;
            if (creator != address(0)) {
                bool found = false;
                for (uint256 j = 0; j < creatorCount; j++) {
                    if (creators[j] == creator) {
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    creators[creatorCount++] = creator;
                }
            }
        }
        
        // Calculate stats for each creator
        DrawCreatorStats[] memory stats = new DrawCreatorStats[](creatorCount);
        
        for (uint256 i = 0; i < creatorCount; i++) {
            address creator = creators[i];
            uint256 drawsCreated = 0;
            uint256 totalRevenue = 0;
            uint256 successfulDraws = 0;
            
            for (uint256 j = 1; j < l.nextDrawId; j++) {
                LibGridottoStorage.UserDraw storage draw = l.userDraws[j];
                if (draw.creator == creator) {
                    drawsCreated++;
                    
                    if (draw.isCompleted && !draw.isCancelled) {
                        successfulDraws++;
                        // Calculate creator revenue (platform fee portion)
                        uint256 creatorShare = (draw.ticketsSold * draw.ticketPrice * 10) / 100; // Assuming 10% creator fee
                        totalRevenue += creatorShare;
                    }
                }
            }
            
            uint256 successRate = drawsCreated > 0 ? (successfulDraws * 100) / drawsCreated : 0;
            
            stats[i] = DrawCreatorStats({
                creator: creator,
                drawsCreated: drawsCreated,
                totalRevenue: totalRevenue,
                successfulDraws: successfulDraws,
                successRate: successRate
            });
        }
        
        // Sort by draws created
        for (uint256 i = 0; i < stats.length; i++) {
            for (uint256 j = i + 1; j < stats.length; j++) {
                if (stats[j].drawsCreated > stats[i].drawsCreated) {
                    DrawCreatorStats memory temp = stats[i];
                    stats[i] = stats[j];
                    stats[j] = temp;
                }
            }
        }
        
        // Return top N
        uint256 resultSize = limit < stats.length ? limit : stats.length;
        DrawCreatorStats[] memory result = new DrawCreatorStats[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = stats[i];
        }
        
        return result;
    }
    
    // Get top executors
    function getTopExecutors(uint256 limit) external view returns (ExecutorStats[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Track executors
        address[] memory executors = new address[](1000);
        uint256 executorCount = 0;
        
        // Find all executors
        for (uint256 i = 1; i < l.nextDrawId && executorCount < 1000; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            if (draw.isCompleted && draw.executor != address(0)) {
                bool found = false;
                for (uint256 j = 0; j < executorCount; j++) {
                    if (executors[j] == draw.executor) {
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    executors[executorCount++] = draw.executor;
                }
            }
        }
        
        // Calculate stats
        ExecutorStats[] memory stats = new ExecutorStats[](executorCount);
        
        for (uint256 i = 0; i < executorCount; i++) {
            address executor = executors[i];
            uint256 executionsCount = 0;
            uint256 totalFeesEarned = 0;
            uint256 totalExecutionTime = 0;
            
            for (uint256 j = 1; j < l.nextDrawId; j++) {
                LibGridottoStorage.UserDraw storage draw = l.userDraws[j];
                if (draw.executor == executor) {
                    executionsCount++;
                    // Executor gets 5% of ticket sales
                    uint256 executorFee = (draw.ticketsSold * draw.ticketPrice * 5) / 100;
                    totalFeesEarned += executorFee;
                    
                    // Calculate execution time (time between end and execution)
                    if (draw.executedAt > draw.endTime) {
                        totalExecutionTime += (draw.executedAt - draw.endTime);
                    }
                }
            }
            
            uint256 avgExecutionTime = executionsCount > 0 ? totalExecutionTime / executionsCount : 0;
            
            stats[i] = ExecutorStats({
                executor: executor,
                executionsCount: executionsCount,
                totalFeesEarned: totalFeesEarned,
                totalExecutionTime: totalExecutionTime,
                avgExecutionTime: avgExecutionTime
            });
        }
        
        // Sort by executions count
        for (uint256 i = 0; i < stats.length; i++) {
            for (uint256 j = i + 1; j < stats.length; j++) {
                if (stats[j].executionsCount > stats[i].executionsCount) {
                    ExecutorStats memory temp = stats[i];
                    stats[i] = stats[j];
                    stats[j] = temp;
                }
            }
        }
        
        // Return top N
        uint256 resultSize = limit < stats.length ? limit : stats.length;
        ExecutorStats[] memory result = new ExecutorStats[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = stats[i];
        }
        
        return result;
    }
    
    // Get platform statistics
    function getPlatformStats() external view returns (PlatformStats memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256 totalPrizes = 0;
        uint256 totalTickets = 0;
        uint256 totalDraws = l.nextDrawId - 1;
        uint256 totalExecutions = 0;
        
        for (uint256 i = 1; i < l.nextDrawId; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            
            if (draw.creator != address(0)) {
                totalTickets += draw.ticketsSold;
                
                if (draw.isCompleted && !draw.isCancelled) {
                    totalExecutions++;
                    
                    // Sum all winner prizes
                    for (uint256 j = 0; j < draw.winnerPrizes.length; j++) {
                        totalPrizes += draw.winnerPrizes[j];
                    }
                }
            }
        }
        
        return PlatformStats({
            totalPrizesDistributed: totalPrizes,
            totalTicketsSold: totalTickets,
            totalDrawsCreated: totalDraws,
            totalExecutions: totalExecutions
        });
    }
}