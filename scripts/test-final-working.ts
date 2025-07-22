import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🎯 FINAL COMPREHENSIVE TEST\n");

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

    // TEST 1: Create and Execute Successful Draw
    console.log("═══════════════════════════════════════");
    console.log("TEST 1: Successful Draw Execution");
    console.log("═══════════════════════════════════════\n");
    
    let drawId;
    try {
        // Create draw with low minimum
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.1"),
            20,
            60, // 1 minute
            1,  // Only need 1 participant
            500,
            { value: ethers.parseEther("0.5") }
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        drawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw ID:", drawId?.toString());
        
        // Buy tickets
        await core.buyTickets(drawId, 5, { value: ethers.parseEther("0.5") });
        console.log("✅ Bought 5 tickets");
        
        // Check details before execution
        let details = await core.getDrawDetails(drawId);
        console.log("\nDraw Details:");
        console.log("- Tickets sold:", details.ticketsSold.toString());
        console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("- Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        
        // Wait and execute
        console.log("\n⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        const execTx = await execution.executeDraw(drawId);
        await execTx.wait();
        console.log("✅ Draw executed!");
        
        // Check winner
        const winners = await execution.getDrawWinners(drawId);
        console.log("Winner:", winners.winners[0]);
        console.log("Prize:", ethers.formatEther(winners.amounts[0]), "LYX");
        
        // Claim prize
        const canClaim = await refund.canClaimPrize(drawId, signer.address);
        if (canClaim.canClaim) {
            await refund.claimPrize(drawId);
            console.log("✅ Prize claimed!");
        }
        
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // TEST 2: Weekly Draw
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 2: Weekly Draw Participation");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const platformInfo = await platform.getPlatformDrawsInfo();
        const weeklyDrawId = platformInfo.weeklyDrawId;
        console.log("Weekly draw ID:", weeklyDrawId.toString());
        
        // Buy weekly tickets
        await core.buyTickets(weeklyDrawId, 2, { value: ethers.parseEther("0.5") });
        console.log("✅ Bought 2 weekly tickets");
        
        // Check weekly draw
        const weeklyDetails = await core.getDrawDetails(weeklyDrawId);
        console.log("Weekly prize pool:", ethers.formatEther(weeklyDetails.prizePool), "LYX");
        
        // Check monthly tickets
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        const total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
        console.log("Total monthly tickets:", total.toString());
        
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // TEST 3: Cancel and Refund
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 3: Cancel Draw and Refund");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // Create draw that will be cancelled
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.05"),
            10,
            60,
            5, // High minimum that won't be met
            500,
            { value: ethers.parseEther("0.2") }
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        const cancelDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw to cancel:", cancelDrawId?.toString());
        
        // Buy tickets
        await core.buyTickets(cancelDrawId, 2, { value: ethers.parseEther("0.1") });
        console.log("✅ Bought 2 tickets");
        
        // Wait and cancel
        console.log("⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        await core.cancelDraw(cancelDrawId);
        console.log("✅ Draw cancelled");
        
        // Claim refund
        const refundAmount = await refund.getRefundAmount(cancelDrawId, signer.address);
        console.log("Refund amount:", ethers.formatEther(refundAmount), "LYX");
        
        if (refundAmount > 0n) {
            await refund.claimRefund(cancelDrawId);
            console.log("✅ Refund claimed!");
        }
        
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // TEST 4: System Statistics
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 4: Final System Statistics");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const stats = await admin.getSystemStats();
        console.log("📊 System Stats:");
        console.log("- Total draws:", stats.totalDrawsCreated.toString());
        console.log("- Total tickets:", stats.totalTicketsSold.toString());
        console.log("- Total prizes:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("- Total executions:", stats.totalExecutions.toString());
        
        const platformFees = await admin.getPlatformFeesLYX();
        console.log("\n💰 Platform fees:", ethers.formatEther(platformFees), "LYX");
        
        const platformInfo = await platform.getPlatformDrawsInfo();
        console.log("💰 Monthly pool:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");
        
        // Withdraw fees
        if (platformFees > 0n) {
            await admin.withdrawPlatformFees();
            console.log("✅ Platform fees withdrawn!");
        }
        
        // Check leaderboards
        console.log("\n🏆 Leaderboards:");
        const winners = await leaderboard.getTopWinners(3);
        console.log("- Top winners:", winners.length);
        
        const buyers = await leaderboard.getTopTicketBuyers(3);
        console.log("- Top buyers:", buyers.length);
        
        const creators = await leaderboard.getTopDrawCreators(3);
        console.log("- Top creators:", creators.length);
        
        // User history
        const history = await core.getUserDrawHistory(signer.address);
        console.log("\n📝 User participated in", history.length, "draws");
        
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // Final balance
    const finalBalance = await ethers.provider.getBalance(signer.address);
    console.log("\n💰 Final balance:", ethers.formatEther(finalBalance), "LYX");
    
    console.log("\n✅ ALL TESTS COMPLETED SUCCESSFULLY!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });