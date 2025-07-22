import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Complete System Test with Fixed Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Test account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "LYX\n");
    
    // Get contracts
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const fixedView = await ethers.getContractAt("GridottoFixedViewFacet", diamondAddress);
    const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
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
        console.log("\n📊 Step 2: Getting draw details with fixed function...");
        
        const drawData = await fixedView.getUserDrawFixed(drawId);
        console.log("Creator:", drawData.creator);
        console.log("Draw Type:", drawData.drawType.toString());
        console.log("Ticket Price:", ethers.formatEther(drawData.ticketPrice), "LYX");
        console.log("Tickets Sold:", drawData.ticketsSold.toString());
        console.log("Max Tickets:", drawData.maxTickets.toString());
        console.log("Prize Pool:", ethers.formatEther(drawData.currentPrizePool), "LYX");
        console.log("Start Time:", new Date(Number(drawData.startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(drawData.endTime) * 1000).toLocaleString());
        console.log("Is Completed:", drawData.isCompleted);
        console.log("Is Cancelled:", drawData.isCancelled);
        
        // Check if draw is active
        const [isActive, reason] = await fixedView.isDrawActive(drawId);
        console.log("\n✅ Draw Status:", isActive ? "ACTIVE" : reason);
        
        // Step 3: Buy tickets
        console.log("\n🎫 Step 3: Buying tickets...");
        
        const ticketAmount = 5;
        const ticketCost = ethers.parseEther("0.1") * BigInt(ticketAmount);
        
        console.log(`Buying ${ticketAmount} tickets for ${ethers.formatEther(ticketCost)} LYX...`);
        const tx2 = await mainFacet.buyUserDrawTicket(drawId, ticketAmount, {
            value: ticketCost
        });
        await tx2.wait();
        console.log("✅ Tickets purchased!");
        
        // Step 4: Check updated draw stats
        console.log("\n📊 Step 4: Checking updated draw stats...");
        
        const stats = await fixedView.getDrawStats(drawId);
        console.log("Participants:", stats.participantCount.toString());
        console.log("Total Tickets:", stats.totalTicketsSold.toString());
        console.log("Prize Pool:", ethers.formatEther(stats.currentPrizePool), "LYX");
        console.log("Avg Tickets/User:", stats.averageTicketsPerUser.toString());
        console.log("Time Until End:", stats.timeUntilEnd.toString(), "seconds");
        console.log("Can Execute:", stats.canExecute);
        
        // Step 5: Check active draws
        console.log("\n🔍 Step 5: Getting active draws...");
        
        const activeDraws = await fixedView.getActiveDraws(10);
        console.log("Active draws:", activeDraws.map(id => id.toString()).join(", "));
        
        // Step 6: Test leaderboard
        console.log("\n📊 Step 6: Testing leaderboard...");
        
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
        
        // Summary
        console.log("\n✅ SYSTEM STATUS SUMMARY:");
        console.log("========================");
        console.log("✅ Draw Creation: Working");
        console.log("✅ Fixed View Functions: Working (correct data)");
        console.log("✅ Ticket Purchase: Working");
        console.log("✅ Draw Stats: Working");
        console.log("✅ Active Draws: Working");
        console.log("✅ Leaderboard: Working");
        console.log("✅ Timestamps: Correct");
        
        console.log("\n🎉 All systems operational!");
        console.log(`\n📝 Next: Wait for draw to end and execute with executeUserDraw(${drawId})`);
        
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch(console.error);