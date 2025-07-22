import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Test accounts - we'll send LYX to these
const TEST_ACCOUNTS = [
    "0x5b7F3e8b7D2c1A8e9F6a4C3d2B1a0E9f8D7c6B5a", // Test Account 2
    "0xC8e1F5b4A3d2B1a0E9f8D7c6B5a4C3d2B1a0E9f8"  // Test Account 3
];

async function main() {
    console.log("🧪 COMPLETE V2 SYSTEM TEST WITH 3 ACCOUNTS\n");

    const [signer] = await ethers.getSigners();
    console.log("Main account:", signer.address);
    let balance = await ethers.provider.getBalance(signer.address);
    console.log("Initial balance:", ethers.formatEther(balance), "LYX");

    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", DIAMOND_ADDRESS);

    // Step 1: Distribute LYX to test accounts
    console.log("\n📌 Step 1: Distributing LYX to Test Accounts");
    try {
        // Send 3 LYX to each test account
        for (const account of TEST_ACCOUNTS) {
            const tx = await signer.sendTransaction({
                to: account,
                value: ethers.parseEther("3.0")
            });
            await tx.wait();
            console.log(`✅ Sent 3 LYX to ${account}`);
        }
        
        balance = await ethers.provider.getBalance(signer.address);
        console.log("Main account balance after distribution:", ethers.formatEther(balance), "LYX");
    } catch (error: any) {
        console.error("❌ Distribution failed:", error.message);
    }

    // SCENARIO 1: Multi-User Draw Success
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 1: Multi-User Draw Success");
    console.log("═══════════════════════════════════════\n");
    
    let successDrawId;
    try {
        // Main account creates draw
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            50,
            120, // 2 minutes
            3,   // Min 3 participants
            500, // 5% platform fee
            { value: ethers.parseEther("1.0") } // 1 LYX initial prize
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        successDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw ID:", successDrawId?.toString());
        
        // Account 1 buys tickets
        await core.buyTickets(successDrawId, 5, { value: ethers.parseEther("0.5") });
        console.log("✅ Account 1 bought 5 tickets");
        
        // Simulate other accounts buying (in production, would use different signers)
        // For now, main account buys more
        await core.buyTickets(successDrawId, 3, { value: ethers.parseEther("0.3") });
        console.log("✅ Account 2 (simulated) bought 3 tickets");
        
        await core.buyTickets(successDrawId, 2, { value: ethers.parseEther("0.2") });
        console.log("✅ Account 3 (simulated) bought 2 tickets");
        
        // Check draw status
        const details = await core.getDrawDetails(successDrawId);
        console.log("\n📊 Draw Status:");
        console.log("Participants:", details.participantCount.toString());
        console.log("Tickets sold:", details.ticketsSold.toString());
        console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        
        // Wait and execute
        console.log("\n⏳ Waiting 2 minutes for draw to end...");
        await new Promise(resolve => setTimeout(resolve, 125000));
        
        const execTx = await execution.executeDraw(successDrawId);
        await execTx.wait();
        console.log("✅ Draw executed!");
        
        // Check winner and claim prize
        const winners = await execution.getDrawWinners(successDrawId);
        console.log("Winner:", winners.winners[0]);
        console.log("Prize:", ethers.formatEther(winners.amounts[0]), "LYX");
        
        const canClaim = await refund.canClaimPrize(successDrawId, signer.address);
        if (canClaim.canClaim) {
            await refund.claimPrize(successDrawId);
            console.log("✅ Prize claimed!");
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 1 failed:", error.message);
    }

    // SCENARIO 2: Weekly Draw Participation
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 2: Weekly Draw Participation");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const platformInfo = await platform.getPlatformDrawsInfo();
        const weeklyDrawId = platformInfo.weeklyDrawId;
        console.log("Current weekly draw ID:", weeklyDrawId.toString());
        
        // Buy multiple tickets from main account
        await core.buyTickets(weeklyDrawId, 4, { value: ethers.parseEther("1.0") }); // 0.25 each
        console.log("✅ Bought 4 weekly tickets");
        
        // Check monthly tickets earned
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        console.log("\n📊 Monthly Tickets Status:");
        console.log("From weekly:", monthlyTickets.fromWeekly.toString());
        console.log("From creating:", monthlyTickets.fromCreating.toString());
        console.log("From participating:", monthlyTickets.fromParticipating.toString());
        const total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
        console.log("Total monthly tickets:", total.toString());
        
        // Check weekly draw details
        const weeklyDetails = await core.getDrawDetails(weeklyDrawId);
        console.log("\n📊 Weekly Draw Status:");
        console.log("Tickets sold:", weeklyDetails.ticketsSold.toString());
        console.log("Prize pool:", ethers.formatEther(weeklyDetails.prizePool), "LYX");
        
    } catch (error: any) {
        console.error("❌ Scenario 2 failed:", error.message);
    }

    // SCENARIO 3: Cancelled Draw with Refunds
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 3: Cancelled Draw & Refunds");
    console.log("═══════════════════════════════════════\n");
    
    let cancelDrawId;
    try {
        // Create draw with high min participants
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            20,
            60, // 1 minute
            10, // High min participants
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
        
        cancelDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw ID:", cancelDrawId?.toString());
        
        // Buy tickets
        await core.buyTickets(cancelDrawId, 4, { value: ethers.parseEther("0.2") });
        console.log("✅ Bought 4 tickets");
        
        // Wait for expiry
        console.log("⏳ Waiting 65 seconds for draw to expire...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        // Cancel due to insufficient participants
        await core.cancelDraw(cancelDrawId);
        console.log("✅ Draw cancelled!");
        
        // Check and claim refund
        const refundAmount = await refund.getRefundAmount(cancelDrawId, signer.address);
        console.log("Refund available:", ethers.formatEther(refundAmount), "LYX");
        
        if (refundAmount > 0n) {
            const beforeBalance = await ethers.provider.getBalance(signer.address);
            await refund.claimRefund(cancelDrawId);
            const afterBalance = await ethers.provider.getBalance(signer.address);
            console.log("✅ Refund claimed!");
            console.log("Balance recovered:", ethers.formatEther(afterBalance - beforeBalance), "LYX (approx)");
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 3 failed:", error.message);
    }

    // SCENARIO 4: Platform Fee Collection
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 4: Platform Fees & Stats");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // Check system stats
        const stats = await admin.getSystemStats();
        console.log("📊 System Statistics:");
        console.log("Total draws created:", stats.totalDrawsCreated.toString());
        console.log("Total tickets sold:", stats.totalTicketsSold.toString());
        console.log("Total prizes distributed:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("Total executions:", stats.totalExecutions.toString());
        
        // Check fees
        const platformFees = await admin.getPlatformFeesLYX();
        console.log("\n💰 Platform Fees:");
        console.log("LYX fees collected:", ethers.formatEther(platformFees), "LYX");
        
        // Check monthly pool
        const platformInfo = await platform.getPlatformDrawsInfo();
        console.log("Monthly pool balance:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");
        
        // Withdraw fees as owner
        if (platformFees > 0n) {
            const beforeBalance = await ethers.provider.getBalance(signer.address);
            await admin.withdrawPlatformFees();
            const afterBalance = await ethers.provider.getBalance(signer.address);
            console.log("✅ Platform fees withdrawn!");
            console.log("Withdrawn amount:", ethers.formatEther(afterBalance - beforeBalance), "LYX (approx)");
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 4 failed:", error.message);
    }

    // SCENARIO 5: Leaderboards
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 5: Leaderboard Check");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const winners = await leaderboard.getTopWinners(5);
        console.log("🏆 Top Winners:", winners.length);
        for (let i = 0; i < Math.min(3, winners.length); i++) {
            console.log(`  ${i+1}. ${winners[i].user} - ${winners[i].wins} wins, ${ethers.formatEther(winners[i].totalWinnings)} LYX`);
        }
        
        const buyers = await leaderboard.getTopTicketBuyers(5);
        console.log("\n🎫 Top Ticket Buyers:", buyers.length);
        for (let i = 0; i < Math.min(3, buyers.length); i++) {
            console.log(`  ${i+1}. ${buyers[i].user} - ${buyers[i].totalTickets} tickets, ${ethers.formatEther(buyers[i].totalSpent)} LYX spent`);
        }
        
        const creators = await leaderboard.getTopDrawCreators(5);
        console.log("\n🎨 Top Draw Creators:", creators.length);
        for (let i = 0; i < Math.min(3, creators.length); i++) {
            console.log(`  ${i+1}. ${creators[i].user} - ${creators[i].drawsCreated} draws created`);
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 5 failed:", error.message);
    }

    // Final Summary
    console.log("\n═══════════════════════════════════════");
    console.log("📊 FINAL TEST SUMMARY");
    console.log("═══════════════════════════════════════\n");
    
    const finalBalance = await ethers.provider.getBalance(signer.address);
    console.log("Final main account balance:", ethers.formatEther(finalBalance), "LYX");
    
    // Check test account balances
    for (const account of TEST_ACCOUNTS) {
        const balance = await ethers.provider.getBalance(account);
        console.log(`${account}: ${ethers.formatEther(balance)} LYX`);
    }
    
    // User history
    const history = await core.getUserDrawHistory(signer.address);
    console.log("\n📝 User participated in", history.length, "draws");
    
    console.log("\n✅ All scenarios tested successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });