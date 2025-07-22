import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🎯 GRIDOTTO V2 SIMPLE TEST\n");

    const [signer] = await ethers.getSigners();
    console.log("Account:", signer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "LYX\n");

    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", DIAMOND_ADDRESS);

    // TEST 1: Create and Complete LYX Draw
    console.log("═══════════════════════════════════════");
    console.log("TEST 1: LYX Draw - Create, Buy, Execute");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // Create draw
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            20,  // Max 20 tickets
            60,  // 1 minute duration
            1,   // Min 1 participant
            500, // 5% platform fee
            { value: ethers.parseEther("0.5") } // 0.5 LYX initial prize
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        const drawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw ID:", drawId?.toString());
        
        // Buy tickets
        await core.buyTickets(drawId, 5, { value: ethers.parseEther("0.25") });
        console.log("✅ Bought 5 tickets for 0.25 LYX");
        
        // Check draw details
        const details = await core.getDrawDetails(drawId);
        console.log("\n📊 Draw Details:");
        console.log("- Creator:", details.creator);
        console.log("- Ticket price:", ethers.formatEther(details.ticketPrice), "LYX");
        console.log("- Tickets sold:", details.ticketsSold.toString());
        console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("- Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        console.log("- Participants:", details.participantCount.toString());
        
        // Wait for draw to end
        console.log("\n⏳ Waiting 65 seconds for draw to end...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        // Execute draw
        const execTx = await execution.executeDraw(drawId);
        await execTx.wait();
        console.log("✅ Draw executed!");
        
        // Check winner
        const winners = await execution.getDrawWinners(drawId);
        console.log("\n🏆 Winner:", winners.winners[0]);
        console.log("💰 Prize:", ethers.formatEther(winners.amounts[0]), "LYX");
        
        // Claim prize
        const canClaim = await refund.canClaimPrize(drawId, signer.address);
        if (canClaim.canClaim) {
            const claimTx = await refund.claimPrize(drawId);
            await claimTx.wait();
            console.log("✅ Prize claimed!");
        }
        
    } catch (error: any) {
        console.error("❌ Test 1 failed:", error.message);
    }

    // TEST 2: Weekly Draw Participation
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 2: Weekly Draw Participation");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const platformInfo = await platform.getPlatformDrawsInfo();
        const weeklyDrawId = platformInfo.weeklyDrawId;
        console.log("Current weekly draw ID:", weeklyDrawId.toString());
        
        // Buy weekly tickets
        await core.buyTickets(weeklyDrawId, 2, { value: ethers.parseEther("0.5") });
        console.log("✅ Bought 2 weekly tickets (0.25 LYX each)");
        
        // Check monthly tickets earned
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        console.log("\n📊 Monthly Tickets:");
        console.log("- From weekly:", monthlyTickets.fromWeekly.toString());
        console.log("- From creating:", monthlyTickets.fromCreating.toString());
        console.log("- From participating:", monthlyTickets.fromParticipating.toString());
        const total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
        console.log("- Total:", total.toString());
        
        // Check platform info
        console.log("\n💰 Platform Info:");
        console.log("- Monthly pool:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");
        
    } catch (error: any) {
        console.error("❌ Test 2 failed:", error.message);
    }

    // TEST 3: System Statistics
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 3: System Statistics & Leaderboards");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // System stats
        const stats = await admin.getSystemStats();
        console.log("📊 System Statistics:");
        console.log("- Total draws created:", stats.totalDrawsCreated.toString());
        console.log("- Total tickets sold:", stats.totalTicketsSold.toString());
        console.log("- Total prizes distributed:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("- Total executions:", stats.totalExecutions.toString());
        
        // Platform fees
        const platformFees = await admin.getPlatformFeesLYX();
        console.log("\n💰 Platform fees collected:", ethers.formatEther(platformFees), "LYX");
        
        // Leaderboards
        console.log("\n🏆 Leaderboards:");
        
        const winners = await leaderboard.getTopWinners(3);
        if (winners.length > 0) {
            console.log("\nTop Winners:");
            for (let i = 0; i < winners.length; i++) {
                console.log(`${i+1}. ${winners[i].player.slice(0,6)}...${winners[i].player.slice(-4)} - ${winners[i].totalWins} wins, ${ethers.formatEther(winners[i].totalWinnings)} LYX`);
            }
        }
        
        const buyers = await leaderboard.getTopTicketBuyers(3);
        if (buyers.length > 0) {
            console.log("\nTop Ticket Buyers:");
            for (let i = 0; i < buyers.length; i++) {
                console.log(`${i+1}. ${buyers[i].player.slice(0,6)}...${buyers[i].player.slice(-4)} - ${buyers[i].totalTickets} tickets`);
            }
        }
        
        // User history
        const history = await core.getUserDrawHistory(signer.address);
        console.log("\n📝 Your draw history:", history.length, "draws");
        
    } catch (error: any) {
        console.error("❌ Test 3 failed:", error.message);
    }

    // Final balance
    const finalBalance = await ethers.provider.getBalance(signer.address);
    console.log("\n💰 Final balance:", ethers.formatEther(finalBalance), "LYX");
    
    console.log("\n✅ V2 TEST COMPLETED!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });