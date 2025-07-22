// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageSimple.sol";

contract GridottoLeaderboardFacetSimple {
    using LibGridottoStorageSimple for LibGridottoStorageSimple.Layout;
    
    // ============ Leaderboard Structs ============
    
    struct TopWinner {
        address player;
        uint256 totalWins;
        uint256 totalWinnings;
        uint256 lastWinTime;
    }
    
    struct TopTicketBuyer {
        address player;
        uint256 totalTickets;
        uint256 totalSpent;
        uint256 lastPurchaseTime;
    }
    
    struct TopDrawCreator {
        address creator;
        uint256 drawsCreated;
        uint256 totalRevenue;
        uint256 successfulDraws;
        uint256 successRate;
    }
    
    struct TopExecutor {
        address executor;
        uint256 executionCount;
        uint256 totalFeesEarned;
        uint256 averageExecutionTime;
    }
    
    struct PlatformStats {
        uint256 totalPrizesDistributed;
        uint256 totalTicketsSold;
        uint256 totalDrawsCreated;
        uint256 totalExecutions;
    }
    
    // ============ View Functions ============
    
    function getTopWinners(uint256 limit) external view returns (TopWinner[] memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        // Collect all winners
        address[] memory winners = new address[](100);
        uint256 winnerCount = 0;
        
        for (uint256 drawId = 1; drawId <= s.nextDrawId && winnerCount < 100; drawId++) {
            LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
            if (draw.isCompleted) {
                for (uint256 i = 0; i < draw.winners.length; i++) {
                    address winner = draw.winners[i];
                    bool found = false;
                    for (uint256 j = 0; j < winnerCount; j++) {
                        if (winners[j] == winner) {
                            found = true;
                            break;
                        }
                    }
                    if (!found && winnerCount < 100) {
                        winners[winnerCount++] = winner;
                    }
                }
            }
        }
        
        // Create result array
        TopWinner[] memory topWinners = new TopWinner[](limit < winnerCount ? limit : winnerCount);
        
        // Fill winner data
        for (uint256 i = 0; i < winnerCount && i < limit; i++) {
            address winner = winners[i];
            uint256 lastWinTime = 0;
            
            // Find last win time
            for (uint256 drawId = s.nextDrawId; drawId >= 1; drawId--) {
                LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
                if (draw.isCompleted) {
                    for (uint256 j = 0; j < draw.winners.length; j++) {
                        if (draw.winners[j] == winner) {
                            lastWinTime = draw.executedAt;
                            break;
                        }
                    }
                    if (lastWinTime > 0) break;
                }
            }
            
            topWinners[i] = TopWinner({
                player: winner,
                totalWins: s.userTotalWins[winner],
                totalWinnings: s.userTotalWinnings[winner],
                lastWinTime: lastWinTime
            });
        }
        
        // Sort by total winnings (bubble sort for simplicity)
        for (uint256 i = 0; i < topWinners.length; i++) {
            for (uint256 j = i + 1; j < topWinners.length; j++) {
                if (topWinners[j].totalWinnings > topWinners[i].totalWinnings) {
                    TopWinner memory temp = topWinners[i];
                    topWinners[i] = topWinners[j];
                    topWinners[j] = temp;
                }
            }
        }
        
        return topWinners;
    }
    
    function getTopTicketBuyers(uint256 limit) external view returns (TopTicketBuyer[] memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        // Collect all buyers
        address[] memory buyers = new address[](100);
        uint256 buyerCount = 0;
        
        for (uint256 drawId = 1; drawId <= s.nextDrawId && buyerCount < 100; drawId++) {
            LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
            for (uint256 i = 0; i < draw.participants.length && buyerCount < 100; i++) {
                address buyer = draw.participants[i];
                bool found = false;
                for (uint256 j = 0; j < buyerCount; j++) {
                    if (buyers[j] == buyer) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    buyers[buyerCount++] = buyer;
                }
            }
        }
        
        // Create result array
        TopTicketBuyer[] memory topBuyers = new TopTicketBuyer[](limit < buyerCount ? limit : buyerCount);
        
        // Fill buyer data
        for (uint256 i = 0; i < buyerCount && i < limit; i++) {
            address buyer = buyers[i];
            uint256 lastPurchaseTime = 0;
            
            // Find last purchase time
            for (uint256 drawId = s.nextDrawId; drawId >= 1; drawId--) {
                LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
                if (draw.hasParticipated[buyer]) {
                    lastPurchaseTime = draw.startTime; // Approximate
                    break;
                }
            }
            
            topBuyers[i] = TopTicketBuyer({
                player: buyer,
                totalTickets: s.userTotalTickets[buyer],
                totalSpent: s.userTotalSpent[buyer],
                lastPurchaseTime: lastPurchaseTime
            });
        }
        
        // Sort by total spent
        for (uint256 i = 0; i < topBuyers.length; i++) {
            for (uint256 j = i + 1; j < topBuyers.length; j++) {
                if (topBuyers[j].totalSpent > topBuyers[i].totalSpent) {
                    TopTicketBuyer memory temp = topBuyers[i];
                    topBuyers[i] = topBuyers[j];
                    topBuyers[j] = temp;
                }
            }
        }
        
        return topBuyers;
    }
    
    function getTopDrawCreators(uint256 limit) external view returns (TopDrawCreator[] memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        // Collect all creators
        address[] memory creators = new address[](50);
        uint256 creatorCount = 0;
        
        for (uint256 drawId = 1; drawId <= s.nextDrawId && creatorCount < 50; drawId++) {
            address creator = s.draws[drawId].creator;
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
        
        // Create result array
        TopDrawCreator[] memory topCreators = new TopDrawCreator[](limit < creatorCount ? limit : creatorCount);
        
        // Calculate stats for each creator
        for (uint256 i = 0; i < creatorCount && i < limit; i++) {
            address creator = creators[i];
            uint256 successfulDraws = 0;
            uint256 totalRevenue = 0;
            
            for (uint256 drawId = 1; drawId <= s.nextDrawId; drawId++) {
                LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
                if (draw.creator == creator) {
                    if (draw.isCompleted) {
                        successfulDraws++;
                        totalRevenue += draw.prizePool;
                    }
                }
            }
            
            uint256 drawsCreated = s.userDrawsCreated[creator];
            uint256 successRate = drawsCreated > 0 ? (successfulDraws * 100) / drawsCreated : 0;
            
            topCreators[i] = TopDrawCreator({
                creator: creator,
                drawsCreated: drawsCreated,
                totalRevenue: totalRevenue,
                successfulDraws: successfulDraws,
                successRate: successRate
            });
        }
        
        // Sort by total revenue
        for (uint256 i = 0; i < topCreators.length; i++) {
            for (uint256 j = i + 1; j < topCreators.length; j++) {
                if (topCreators[j].totalRevenue > topCreators[i].totalRevenue) {
                    TopDrawCreator memory temp = topCreators[i];
                    topCreators[i] = topCreators[j];
                    topCreators[j] = temp;
                }
            }
        }
        
        return topCreators;
    }
    
    function getTopExecutors(uint256 limit) external view returns (TopExecutor[] memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        // Collect all executors
        address[] memory executors = new address[](50);
        uint256 executorCount = 0;
        
        for (uint256 drawId = 1; drawId <= s.nextDrawId && executorCount < 50; drawId++) {
            LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
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
        
        // Create result array
        TopExecutor[] memory topExecutors = new TopExecutor[](limit < executorCount ? limit : executorCount);
        
        // Fill executor data
        for (uint256 i = 0; i < executorCount && i < limit; i++) {
            address executor = executors[i];
            
            topExecutors[i] = TopExecutor({
                executor: executor,
                executionCount: s.userDrawsExecuted[executor],
                totalFeesEarned: s.userExecutionFees[executor],
                averageExecutionTime: 0 // Not tracked in simplified version
            });
        }
        
        // Sort by fees earned
        for (uint256 i = 0; i < topExecutors.length; i++) {
            for (uint256 j = i + 1; j < topExecutors.length; j++) {
                if (topExecutors[j].totalFeesEarned > topExecutors[i].totalFeesEarned) {
                    TopExecutor memory temp = topExecutors[i];
                    topExecutors[i] = topExecutors[j];
                    topExecutors[j] = temp;
                }
            }
        }
        
        return topExecutors;
    }
    
    function getPlatformStats() external view returns (PlatformStats memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        
        return PlatformStats({
            totalPrizesDistributed: s.totalPrizesDistributed,
            totalTicketsSold: s.totalTicketsSold,
            totalDrawsCreated: s.totalDrawsCreated,
            totalExecutions: s.totalExecutions
        });
    }
}