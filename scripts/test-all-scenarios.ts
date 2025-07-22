import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Test accounts (you'll need to fund these)
const TEST_ACCOUNTS = [
    { address: "0x38e456661bc6e95A3aCf3B4673844Cb389b60243", pk: process.env.PRIVATE_KEY! }, // Main
    { address: "0x5b7F3e8b7D2c1A8e9F6a4C3d2B1a0E9f8D7c6B5a", pk: "0x..." }, // Test 2
    { address: "0xC8e1F5b4A3d2B1a0E9f8D7c6B5a4C3d2B1a0E9f8", pk: "0x..." }  // Test 3
];

async function main() {
    console.log("🧪 COMPREHENSIVE SCENARIO TEST\n");

    const [signer] = await ethers.getSigners();
    console.log("Main account:", signer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "LYX\n");

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);

    // Store initial stats
    const initialStats = await admin.getSystemStats();
    const initialPlatformFees = await admin.getPlatformFeesLYX();
    const initialMonthlyPool = (await platform.getPlatformDrawsInfo()).monthlyPoolBalance;

    console.log("📊 Initial System State:");
    console.log("Total draws:", initialStats.totalDrawsCreated.toString());
    console.log("Platform fees:", ethers.formatEther(initialPlatformFees), "LYX");
    console.log("Monthly pool:", ethers.formatEther(initialMonthlyPool), "LYX\n");

    // SCENARIO 1: Successful Draw with Multiple Participants
    console.log("═══════════════════════════════════════");
    console.log("📌 SCENARIO 1: Successful Multi-User Draw");
    console.log("═══════════════════════════════════════\n");
    
    let successDrawId;
    try {
        // Create draw
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.001"), // 0.001 LYX per ticket
            100,
            60, // 1 minute
            2,  // Min 2 participants
            500, // 5% platform fee
            { value: ethers.parseEther("0.01") } // Initial prize
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
        await core.buyTickets(successDrawId, 5, { value: ethers.parseEther("0.005") });
        console.log("✅ Account 1 bought 5 tickets");
        
        // Simulate Account 2 buying (in real test, use different signer)
        await core.buyTickets(successDrawId, 3, { value: ethers.parseEther("0.003") });
        console.log("✅ Account 2 (simulated) bought 3 tickets");
        
        // Check draw details
        const details = await core.getDrawDetails(successDrawId);
        console.log("\n📊 Draw Status:");
        console.log("Participants:", details.participantCount.toString());
        console.log("Tickets sold:", details.ticketsSold.toString());
        console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        
        // Wait for draw to end
        console.log("\n⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        // Execute draw
        const execTx = await execution.executeDraw(successDrawId);
        await execTx.wait();
        console.log("✅ Draw executed!");
        
        // Check winner
        const winners = await execution.getDrawWinners(successDrawId);
        console.log("Winner:", winners.winners[0]);
        console.log("Prize amount:", ethers.formatEther(winners.amounts[0]), "LYX");
        
        // Winner claims prize
        const canClaim = await refund.canClaimPrize(successDrawId, signer.address);
        if (canClaim.canClaim) {
            await refund.claimPrize(successDrawId);
            console.log("✅ Prize claimed by winner!");
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 1 failed:", error.message);
    }

    // SCENARIO 2: Cancelled Draw with Refunds
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 2: Cancelled Draw & Refunds");
    console.log("═══════════════════════════════════════\n");
    
    let cancelDrawId;
    try {
        // Create draw with high min participants
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.01"), // 0.01 LYX per ticket
            50,
            60, // 1 minute
            10, // High min participants (won't be met)
            500,
            { value: ethers.parseEther("0.05") }
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
        await core.buyTickets(cancelDrawId, 3, { value: ethers.parseEther("0.03") });
        console.log("✅ Bought 3 tickets");
        
        const beforeBalance = await ethers.provider.getBalance(signer.address);
        
        // Wait for draw to end
        console.log("⏳ Waiting for draw to expire...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        // Cancel draw (not enough participants)
        await core.cancelDraw(cancelDrawId);
        console.log("✅ Draw cancelled!");
        
        // Check refund amount
        const refundAmount = await refund.getRefundAmount(cancelDrawId, signer.address);
        console.log("Refund available:", ethers.formatEther(refundAmount), "LYX");
        
        // Claim refund
        await refund.claimRefund(cancelDrawId);
        console.log("✅ Refund claimed!");
        
        const afterBalance = await ethers.provider.getBalance(signer.address);
        console.log("Balance recovered (approx):", ethers.formatEther(afterBalance - beforeBalance), "LYX");
        
    } catch (error: any) {
        console.error("❌ Scenario 2 failed:", error.message);
    }

    // SCENARIO 3: Weekly Draw Participation
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 3: Weekly Draw & Monthly Tickets");
    console.log("═══════════════════════════════════════\n");
    
    try {
        const platformInfo = await platform.getPlatformDrawsInfo();
        const weeklyDrawId = platformInfo.weeklyDrawId;
        console.log("Current weekly draw ID:", weeklyDrawId.toString());
        
        // Buy weekly tickets
        await core.buyTickets(weeklyDrawId, 2, { value: ethers.parseEther("0.5") });
        console.log("✅ Bought 2 weekly tickets (0.25 LYX each)");
        
        // Check monthly tickets
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        console.log("\n📊 Monthly Tickets Status:");
        console.log("From weekly:", monthlyTickets.fromWeekly.toString());
        console.log("From creating:", monthlyTickets.fromCreating.toString());
        console.log("From participating:", monthlyTickets.fromParticipating.toString());
        const total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
        console.log("Total monthly tickets:", total.toString());
        
    } catch (error: any) {
        console.error("❌ Scenario 3 failed:", error.message);
    }

    // SCENARIO 4: Platform Fee Distribution
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 4: Fee Distribution Check");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // Create and execute a draw to generate fees
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.002"),
            20,
            60,
            1,
            1000, // 10% platform fee
            { value: ethers.parseEther("0.02") }
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        const feeDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw for fee testing:", feeDrawId?.toString());
        
        // Buy tickets
        await core.buyTickets(feeDrawId, 10, { value: ethers.parseEther("0.02") });
        
        const drawDetails = await core.getDrawDetails(feeDrawId);
        const totalPool = drawDetails.prizePool;
        console.log("Total prize pool:", ethers.formatEther(totalPool), "LYX");
        
        // Wait and execute
        await new Promise(resolve => setTimeout(resolve, 65000));
        await execution.executeDraw(feeDrawId);
        console.log("✅ Draw executed");
        
        // Calculate expected fees
        const platformFeePercent = 500n; // 5%
        const executorFeePercent = 500n; // 5%
        const expectedPlatformFee = (totalPool * platformFeePercent) / 10000n;
        const expectedExecutorFee = (totalPool * executorFeePercent) / 10000n;
        const expectedWinnerPrize = totalPool - expectedPlatformFee - expectedExecutorFee;
        
        console.log("\n📊 Fee Distribution:");
        console.log("Platform fee (5%):", ethers.formatEther(expectedPlatformFee), "LYX");
        console.log("Executor fee (5%):", ethers.formatEther(expectedExecutorFee), "LYX");
        console.log("Winner prize (90%):", ethers.formatEther(expectedWinnerPrize), "LYX");
        
    } catch (error: any) {
        console.error("❌ Scenario 4 failed:", error.message);
    }

    // SCENARIO 5: Admin Functions
    console.log("\n═══════════════════════════════════════");
    console.log("📌 SCENARIO 5: Admin Functions");
    console.log("═══════════════════════════════════════\n");
    
    try {
        // Check if we're the owner
        const owner = await admin.owner();
        console.log("Contract owner:", owner);
        console.log("Are we owner?", owner.toLowerCase() === signer.address.toLowerCase());
        
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
            // Test pause/unpause
            await admin.pauseSystem();
            console.log("✅ System paused");
            
            // Try to create draw while paused (should fail)
            try {
                await core.createLYXDraw(
                    ethers.parseEther("0.001"),
                    10,
                    60,
                    1,
                    500,
                    { value: ethers.parseEther("0.01") }
                );
                console.log("❌ ERROR: Created draw while paused!");
            } catch {
                console.log("✅ Correctly prevented draw creation while paused");
            }
            
            // Unpause
            await admin.unpauseSystem();
            console.log("✅ System unpaused");
            
            // Check platform fees
            const platformFees = await admin.getPlatformFeesLYX();
            console.log("Platform fees available:", ethers.formatEther(platformFees), "LYX");
            
            // Withdraw fees (if any)
            if (platformFees > 0n) {
                await admin.withdrawPlatformFees();
                console.log("✅ Platform fees withdrawn");
            }
        }
        
    } catch (error: any) {
        console.error("❌ Scenario 5 failed:", error.message);
    }

    // FINAL STATS
    console.log("\n═══════════════════════════════════════");
    console.log("📊 FINAL SYSTEM STATISTICS");
    console.log("═══════════════════════════════════════\n");
    
    const finalStats = await admin.getSystemStats();
    const finalPlatformFees = await admin.getPlatformFeesLYX();
    const finalMonthlyPool = (await platform.getPlatformDrawsInfo()).monthlyPoolBalance;
    
    console.log("Total draws created:", finalStats.totalDrawsCreated.toString());
    console.log("Total tickets sold:", finalStats.totalTicketsSold.toString());
    console.log("Total prizes distributed:", ethers.formatEther(finalStats.totalPrizesDistributed), "LYX");
    console.log("Total executions:", finalStats.totalExecutions.toString());
    console.log("Platform fees:", ethers.formatEther(finalPlatformFees), "LYX");
    console.log("Monthly pool:", ethers.formatEther(finalMonthlyPool), "LYX");
    
    console.log("\n📈 Changes during test:");
    console.log("New draws:", (finalStats.totalDrawsCreated - initialStats.totalDrawsCreated).toString());
    console.log("New tickets:", (finalStats.totalTicketsSold - initialStats.totalTicketsSold).toString());
    console.log("Prizes paid:", ethers.formatEther(finalStats.totalPrizesDistributed - initialStats.totalPrizesDistributed), "LYX");
    console.log("Fees collected:", ethers.formatEther(finalPlatformFees - initialPlatformFees), "LYX");
    console.log("Monthly pool growth:", ethers.formatEther(finalMonthlyPool - initialMonthlyPool), "LYX");
    
    console.log("\n✅ All scenarios tested!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });