import { ethers } from "hardhat";

async function main() {
    console.log("📊 Testing Leaderboard Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
    
    try {
        // 1. Get Platform Stats
        console.log("📈 Platform Statistics:");
        console.log("=" + "=".repeat(50));
        
        const platformStats = await leaderboard.getPlatformStats();
        console.log("Total Prizes Distributed:", ethers.formatEther(platformStats.totalPrizesDistributed), "LYX");
        console.log("Total Tickets Sold:", platformStats.totalTicketsSold.toString());
        console.log("Total Draws Created:", platformStats.totalDrawsCreated.toString());
        console.log("Total Executions:", platformStats.totalExecutions.toString());
        
        // 2. Get Top Winners
        console.log("\n\n🏆 Top Winners - Lucky Players:");
        console.log("=" + "=".repeat(50));
        
        try {
            const topWinners = await leaderboard.getTopWinners(5);
            
            if (topWinners.length === 0) {
                console.log("No winners yet");
            } else {
                for (let i = 0; i < topWinners.length; i++) {
                    const winner = topWinners[i];
                    console.log(`\n#${i + 1} ${winner.player}`);
                    console.log(`   Total Winnings: ${ethers.formatEther(winner.totalWinnings)} LYX`);
                    console.log(`   Draws Won: ${winner.drawsWon}`);
                    console.log(`   Last Win: ${new Date(Number(winner.lastWinTime) * 1000).toLocaleString()}`);
                }
            }
        } catch (e) {
            console.log("Error getting winners:", e);
        }
        
        // 3. Get Top Ticket Buyers
        console.log("\n\n🎫 Top Ticket Buyers - Most Active Players:");
        console.log("=" + "=".repeat(50));
        
        try {
            const topBuyers = await leaderboard.getTopTicketBuyers(5);
            
            if (topBuyers.length === 0) {
                console.log("No ticket buyers yet");
            } else {
                for (let i = 0; i < topBuyers.length; i++) {
                    const buyer = topBuyers[i];
                    console.log(`\n#${i + 1} ${buyer.player}`);
                    console.log(`   Total Tickets: ${buyer.totalTickets}`);
                    console.log(`   Total Spent: ${ethers.formatEther(buyer.totalSpent)} LYX`);
                    console.log(`   Last Purchase: ${new Date(Number(buyer.lastPurchaseTime) * 1000).toLocaleString()}`);
                }
            }
        } catch (e) {
            console.log("Error getting buyers:", e);
        }
        
        // 4. Get Top Draw Creators
        console.log("\n\n🎁 Top Draw Creators - Business Minds:");
        console.log("=" + "=".repeat(50));
        
        try {
            const topCreators = await leaderboard.getTopDrawCreators(5);
            
            if (topCreators.length === 0) {
                console.log("No draw creators yet");
            } else {
                for (let i = 0; i < topCreators.length; i++) {
                    const creator = topCreators[i];
                    console.log(`\n#${i + 1} ${creator.creator}`);
                    console.log(`   Draws Created: ${creator.drawsCreated}`);
                    console.log(`   Total Revenue: ${ethers.formatEther(creator.totalRevenue)} LYX`);
                    console.log(`   Successful Draws: ${creator.successfulDraws}`);
                    console.log(`   Success Rate: ${creator.successRate}%`);
                }
            }
        } catch (e) {
            console.log("Error getting creators:", e);
        }
        
        // 5. Get Top Executors
        console.log("\n\n⚡ Top Executors - Speed Demons:");
        console.log("=" + "=".repeat(50));
        
        try {
            const topExecutors = await leaderboard.getTopExecutors(5);
            
            if (topExecutors.length === 0) {
                console.log("No executors yet");
            } else {
                for (let i = 0; i < topExecutors.length; i++) {
                    const executor = topExecutors[i];
                    console.log(`\n#${i + 1} ${executor.executor}`);
                    console.log(`   Executions: ${executor.executionsCount}`);
                    console.log(`   Total Fees Earned: ${ethers.formatEther(executor.totalFeesEarned)} LYX`);
                    console.log(`   Avg Execution Time: ${executor.avgExecutionTime} seconds`);
                }
            }
        } catch (e) {
            console.log("Error getting executors:", e);
        }
        
        console.log("\n\n✅ Leaderboard test completed!");
        
    } catch (error: any) {
        console.error("Error testing leaderboard:", error.message);
    }
}

main().catch(console.error);