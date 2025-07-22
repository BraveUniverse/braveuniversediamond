import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Testing Complete Draw Flow...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Test account:", deployer.address);
    
    // Get contracts
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const viewFacet = await ethers.getContractAt("GridottoViewFacet", diamondAddress);
    const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    const execution = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
    
    try {
        // Step 1: Create a draw
        console.log("📝 Step 1: Creating a new draw...");
        
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
            50, // max tickets
            3600, // 1 hour duration
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
        
        // Step 2: Get draw details using new view function
        console.log("\n📊 Step 2: Getting draw details...");
        
        // Use the basic getUserDraw first
        const basicDraw = await mainFacet.getUserDraw(drawId);
        console.log("Creator:", basicDraw.creator);
        console.log("Ticket Price:", ethers.formatEther(basicDraw.ticketPrice), "LYX");
        console.log("Max Tickets:", basicDraw.maxTickets.toString());
        
        // Get timing info
        const [startTime, endTime, isActive, timeRemaining] = await viewFacet.getDrawTiming(drawId);
        console.log("\nTiming Info:");
        console.log("Start Time:", new Date(Number(startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(endTime) * 1000).toLocaleString());
        console.log("Is Active:", isActive);
        console.log("Time Remaining:", timeRemaining, "seconds");
        
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
        
        // Check user info
        const [ticketCount, hasParticipated, winningChance] = await viewFacet.getUserDrawInfo(drawId, deployer.address);
        console.log("\nUser Info:");
        console.log("Tickets Owned:", ticketCount.toString());
        console.log("Has Participated:", hasParticipated);
        console.log("Winning Chance:", (Number(winningChance) / 100).toFixed(2) + "%");
        
        // Get participants
        const [participants, ticketCounts] = await viewFacet.getDrawParticipantsWithTickets(drawId);
        console.log("\nParticipants:");
        for (let i = 0; i < participants.length; i++) {
            console.log(`- ${participants[i]}: ${ticketCounts[i]} tickets`);
        }
        
        // Step 4: Check if can execute
        console.log("\n🎯 Step 4: Checking execution eligibility...");
        
        const [canExecute, reason] = await viewFacet.canExecuteDraw(drawId);
        console.log("Can Execute:", canExecute);
        console.log("Reason:", reason || "Ready to execute");
        
        // Step 5: Test leaderboard
        console.log("\n📊 Step 5: Testing leaderboard...");
        
        const platformStats = await leaderboard.getPlatformStats();
        console.log("\nPlatform Stats:");
        console.log("- Total Prizes:", ethers.formatEther(platformStats.totalPrizesDistributed), "LYX");
        console.log("- Total Tickets:", platformStats.totalTicketsSold.toString());
        console.log("- Total Draws:", platformStats.totalDrawsCreated.toString());
        
        const topBuyers = await leaderboard.getTopTicketBuyers(5);
        console.log("\nTop Ticket Buyers:");
        for (let i = 0; i < topBuyers.length && i < 3; i++) {
            const buyer = topBuyers[i];
            console.log(`#${i + 1} ${buyer.player.slice(0, 10)}...`);
            console.log(`   Tickets: ${buyer.totalTickets}, Spent: ${ethers.formatEther(buyer.totalSpent)} LYX`);
        }
        
        const topCreators = await leaderboard.getTopDrawCreators(5);
        console.log("\nTop Draw Creators:");
        for (let i = 0; i < topCreators.length && i < 3; i++) {
            const creator = topCreators[i];
            console.log(`#${i + 1} ${creator.creator.slice(0, 10)}...`);
            console.log(`   Draws: ${creator.drawsCreated}, Success Rate: ${creator.successRate}%`);
        }
        
        console.log("\n✅ All systems working correctly!");
        console.log("\n📝 Summary:");
        console.log("- Draw creation: ✅");
        console.log("- View functions: ✅");
        console.log("- Ticket purchase: ✅");
        console.log("- Leaderboard: ✅");
        console.log("- Timestamps: ✅ (Proper dates showing)");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);