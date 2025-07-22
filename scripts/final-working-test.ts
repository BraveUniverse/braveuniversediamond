import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Final Working Test - All Systems...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Test account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "LYX\n");
    
    // Get contracts
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const fixedView = await ethers.getContractAt("GridottoFixedViewFacet", diamondAddress);
    const fixedPurchase = await ethers.getContractAt("GridottoFixedPurchaseFacet", diamondAddress);
    const execution = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
    
    try {
        // Step 1: Create a test draw
        console.log("📝 Step 1: Creating a test draw...");
        
        const prizeConfig = {
            model: 0, // PERCENTAGE
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 8000, // 80% to prize pool
            totalWinners: 1,
            prizePercentages: [10000], // 100% to winner
            minParticipants: 2,
            gracePeriod: 300 // 5 minutes
        };
        
        const tx1 = await gridotto.createUserDraw(
            0, // USER_LYX
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            100, // max tickets
            3600, // 1 hour
            prizeConfig,
            0, // No requirement
            ethers.ZeroAddress,
            0,
            [],
            { value: 0 }
        );
        
        const receipt1 = await tx1.wait();
        console.log("✅ Draw created! TX:", receipt1.hash);
        
        // Get draw ID from event
        let drawId = 0;
        for (const log of receipt1.logs) {
            if (log.topics && log.topics.length >= 2) {
                const id = parseInt(log.topics[1], 16);
                if (id > 0 && id < 1000) {
                    drawId = id;
                    break;
                }
            }
        }
        
        console.log("Draw ID:", drawId);
        
        // Step 2: Get draw details using FIXED view function
        console.log("\n📊 Step 2: Getting draw details...");
        
        const drawData = await fixedView.getUserDrawFixed(drawId);
        console.log("Creator:", drawData.creator);
        console.log("Ticket Price:", ethers.formatEther(drawData.ticketPrice), "LYX");
        console.log("Max Tickets:", drawData.maxTickets.toString());
        console.log("Start Time:", new Date(Number(drawData.startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(drawData.endTime) * 1000).toLocaleString());
        
        // Check if draw is active
        const [isActive, reason] = await fixedView.isDrawActive(drawId);
        console.log("Draw Status:", isActive ? "✅ ACTIVE" : `❌ ${reason}`);
        
        // Step 3: Buy tickets using FIXED purchase function
        console.log("\n🎫 Step 3: Buying tickets with fixed function...");
        
        const ticketAmount = 5;
        const ticketCost = await fixedPurchase.getTicketCost(drawId, ticketAmount);
        console.log(`Cost for ${ticketAmount} tickets: ${ethers.formatEther(ticketCost)} LYX`);
        
        const tx2 = await fixedPurchase.buyTicketsFixed(drawId, ticketAmount, {
            value: ticketCost
        });
        await tx2.wait();
        console.log("✅ Tickets purchased successfully!");
        
        // Step 4: Check updated draw stats
        console.log("\n📊 Step 4: Checking updated draw stats...");
        
        const stats = await fixedView.getDrawStats(drawId);
        console.log("Participants:", stats.participantCount.toString());
        console.log("Total Tickets:", stats.totalTicketsSold.toString());
        console.log("Prize Pool:", ethers.formatEther(stats.currentPrizePool), "LYX");
        console.log("Avg Tickets/User:", stats.averageTicketsPerUser.toString());
        console.log("Time Until End:", Math.floor(Number(stats.timeUntilEnd) / 60), "minutes");
        console.log("Can Execute:", stats.canExecute ? "Yes" : "No");
        
        // Step 5: Buy more tickets from same account
        console.log("\n🎫 Step 5: Buying more tickets...");
        
        const moreTix = 10;
        const moreCost = await fixedPurchase.getTicketCost(drawId, moreTix);
        const tx3 = await fixedPurchase.buyTicketsFixed(drawId, moreTix, {
            value: moreCost
        });
        await tx3.wait();
        console.log(`✅ Bought ${moreTix} more tickets!`);
        
        // Step 6: Check active draws
        console.log("\n🔍 Step 6: Getting active draws...");
        
        const activeDraws = await fixedView.getActiveDraws(10);
        console.log("Active draws:", activeDraws.map(id => id.toString()).join(", "));
        
        // Step 7: Test leaderboard
        console.log("\n📊 Step 7: Testing leaderboard...");
        
        const platformStats = await leaderboard.getPlatformStats();
        console.log("\nPlatform Statistics:");
        console.log("- Total Prizes:", ethers.formatEther(platformStats.totalPrizesDistributed), "LYX");
        console.log("- Total Tickets:", platformStats.totalTicketsSold.toString());
        console.log("- Total Draws:", platformStats.totalDrawsCreated.toString());
        console.log("- Total Executions:", platformStats.totalExecutions.toString());
        
        const topBuyers = await leaderboard.getTopTicketBuyers(5);
        console.log("\nTop Ticket Buyers:");
        for (let i = 0; i < topBuyers.length && i < 3; i++) {
            const buyer = topBuyers[i];
            console.log(`#${i + 1} ${buyer.player}`);
            console.log(`   Tickets: ${buyer.totalTickets}, Spent: ${ethers.formatEther(buyer.totalSpent)} LYX`);
        }
        
        const topCreators = await leaderboard.getTopDrawCreators(5);
        console.log("\nTop Draw Creators:");
        for (let i = 0; i < topCreators.length && i < 3; i++) {
            const creator = topCreators[i];
            console.log(`#${i + 1} ${creator.creator}`);
            console.log(`   Draws: ${creator.drawsCreated}, Success Rate: ${creator.successRate}%`);
        }
        
        // Final stats
        const finalStats = await fixedView.getDrawStats(drawId);
        console.log("\n📊 Final Draw Stats:");
        console.log("- Total participants:", finalStats.participantCount.toString());
        console.log("- Total tickets sold:", finalStats.totalTicketsSold.toString());
        console.log("- Prize pool:", ethers.formatEther(finalStats.currentPrizePool), "LYX");
        
        // Summary
        console.log("\n✅ SYSTEM STATUS SUMMARY:");
        console.log("========================");
        console.log("✅ Draw Creation: Working");
        console.log("✅ Fixed View Functions: Working");
        console.log("✅ Fixed Purchase Functions: Working");
        console.log("✅ Draw Stats: Working");
        console.log("✅ Active Draws: Working");
        console.log("✅ Leaderboard: Working");
        console.log("✅ Multiple Purchases: Working");
        
        console.log("\n🎉 ALL SYSTEMS FULLY OPERATIONAL!");
        console.log(`\n📝 Next: Wait for draw to end and execute with executeUserDraw(${drawId})`);
        console.log(`Time remaining: ${Math.floor(Number(finalStats.timeUntilEnd) / 60)} minutes`);
        
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch(console.error);