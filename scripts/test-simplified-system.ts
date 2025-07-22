import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Test accounts
const TEST_ACCOUNTS = [
    "0x38e456661bc6e95A3aCf3B4673844Cb389b60243", // Account 1
    "0x666eA581Ab742695373bF63cCc885968fFDB966c", // Account 2
    "0x5B3a69C5a7617E0096e0113E2399c9dBe1893bE6"  // Account 3
];

async function main() {
    console.log("🧪 Testing Simplified Gridotto System...\n");

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionFacetSimple", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacetSimple", DIAMOND_ADDRESS);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacetSimple", DIAMOND_ADDRESS);

    // Test 1: Check system status
    console.log("\n📊 Test 1: System Status");
    try {
        const isPaused = await admin.isPaused();
        console.log(`System paused: ${isPaused}`);
        
        const stats = await admin.getSystemStats();
        console.log(`Total draws: ${stats.totalDrawsCreated}`);
        console.log(`Total tickets: ${stats.totalTicketsSold}`);
        console.log(`Total prizes: ${ethers.formatEther(stats.totalPrizesDistributed)} LYX`);
        console.log(`Total executions: ${stats.totalExecutions}`);
    } catch (error: any) {
        console.error("❌ System status check failed:", error.message);
    }

    // Test 2: Create a LYX draw
    console.log("\n📊 Test 2: Create LYX Draw");
    let drawId;
    try {
        const ticketPrice = ethers.parseEther("0.1"); // 0.1 LYX per ticket
        const maxTickets = 100;
        const duration = 60; // 60 seconds for testing
        const minParticipants = 2;
        const platformFeePercent = 500; // 5%
        const initialPrize = ethers.parseEther("1"); // 1 LYX initial prize

        const tx = await core.createLYXDraw(
            ticketPrice,
            maxTickets,
            duration,
            minParticipants,
            platformFeePercent,
            { value: initialPrize }
        );
        
        const receipt = await tx.wait();
        console.log(`✅ Draw created! Tx: ${tx.hash}`);
        
        // Extract drawId from events
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            drawId = parsed?.args.drawId;
            console.log(`Draw ID: ${drawId}`);
        }
    } catch (error: any) {
        console.error("❌ Draw creation failed:", error.message);
        return;
    }

    // Test 3: Get draw details
    console.log("\n📊 Test 3: Get Draw Details");
    try {
        const details = await core.getDrawDetails(drawId);
        console.log(`Creator: ${details.creator}`);
        console.log(`Ticket price: ${ethers.formatEther(details.ticketPrice)} LYX`);
        console.log(`Max tickets: ${details.maxTickets}`);
        console.log(`Prize pool: ${ethers.formatEther(details.prizePool)} LYX`);
        console.log(`End time: ${new Date(Number(details.endTime) * 1000).toLocaleString()}`);
    } catch (error: any) {
        console.error("❌ Get draw details failed:", error.message);
    }

    // Test 4: Buy tickets from multiple accounts
    console.log("\n📊 Test 4: Buy Tickets");
    
    // Buy from account 1 (current signer)
    try {
        const ticketAmount = 5;
        const ticketCost = await core.getTicketCost(drawId, ticketAmount);
        console.log(`Buying ${ticketAmount} tickets for ${ethers.formatEther(ticketCost)} LYX`);
        
        const tx = await core.buyTickets(drawId, ticketAmount, { value: ticketCost });
        await tx.wait();
        console.log(`✅ Account 1 bought ${ticketAmount} tickets`);
    } catch (error: any) {
        console.error("❌ Ticket purchase failed:", error.message);
    }

    // Buy from account 2
    try {
        const signer2 = await ethers.getImpersonatedSigner(TEST_ACCOUNTS[1]);
        await signer.sendTransaction({
            to: TEST_ACCOUNTS[1],
            value: ethers.parseEther("2")
        });
        
        const core2 = core.connect(signer2);
        const ticketAmount = 3;
        const ticketCost = await core2.getTicketCost(drawId, ticketAmount);
        
        const tx = await core2.buyTickets(drawId, ticketAmount, { value: ticketCost });
        await tx.wait();
        console.log(`✅ Account 2 bought ${ticketAmount} tickets`);
    } catch (error: any) {
        console.error("❌ Account 2 ticket purchase failed:", error.message);
    }

    // Test 5: Check active draws
    console.log("\n📊 Test 5: Check Active Draws");
    try {
        const activeDraws = await core.getActiveDraws();
        console.log(`Active draws: ${activeDraws.length}`);
        activeDraws.forEach((id: any) => {
            console.log(`  - Draw #${id}`);
        });
    } catch (error: any) {
        console.error("❌ Get active draws failed:", error.message);
    }

    // Test 6: Wait for draw to end and execute
    console.log("\n📊 Test 6: Wait for draw to end...");
    console.log("Waiting 65 seconds for draw to end...");
    await new Promise(resolve => setTimeout(resolve, 65000));

    console.log("Executing draw...");
    try {
        const canExecute = await execution.canExecuteDraw(drawId);
        console.log(`Can execute: ${canExecute}`);
        
        if (canExecute) {
            const tx = await execution.executeDraw(drawId);
            const receipt = await tx.wait();
            console.log(`✅ Draw executed! Tx: ${tx.hash}`);
            
            // Get winners
            const [winners, amounts] = await execution.getDrawWinners(drawId);
            console.log(`Winner: ${winners[0]}`);
            console.log(`Prize: ${ethers.formatEther(amounts[0])} LYX`);
        }
    } catch (error: any) {
        console.error("❌ Draw execution failed:", error.message);
    }

    // Test 7: Claim prize
    console.log("\n📊 Test 7: Claim Prize");
    try {
        const [winners] = await execution.getDrawWinners(drawId);
        if (winners.length > 0) {
            const winner = winners[0];
            console.log(`Winner ${winner} claiming prize...`);
            
            // If winner is not current signer, impersonate
            if (winner.toLowerCase() !== signer.address.toLowerCase()) {
                const winnerSigner = await ethers.getImpersonatedSigner(winner);
                const executionWinner = execution.connect(winnerSigner);
                const tx = await executionWinner.claimPrize(drawId);
                await tx.wait();
            } else {
                const tx = await execution.claimPrize(drawId);
                await tx.wait();
            }
            console.log("✅ Prize claimed!");
        }
    } catch (error: any) {
        console.error("❌ Prize claim failed:", error.message);
    }

    // Test 8: Check leaderboards
    console.log("\n📊 Test 8: Check Leaderboards");
    try {
        console.log("\n🏆 Top Winners:");
        const topWinners = await leaderboard.getTopWinners(5);
        topWinners.forEach((winner: any, i: number) => {
            console.log(`${i + 1}. ${winner.player}: ${winner.totalWins} wins, ${ethers.formatEther(winner.totalWinnings)} LYX`);
        });

        console.log("\n🎫 Top Ticket Buyers:");
        const topBuyers = await leaderboard.getTopTicketBuyers(5);
        topBuyers.forEach((buyer: any, i: number) => {
            console.log(`${i + 1}. ${buyer.player}: ${buyer.totalTickets} tickets, ${ethers.formatEther(buyer.totalSpent)} LYX spent`);
        });

        console.log("\n🎨 Top Draw Creators:");
        const topCreators = await leaderboard.getTopDrawCreators(5);
        topCreators.forEach((creator: any, i: number) => {
            console.log(`${i + 1}. ${creator.creator}: ${creator.drawsCreated} draws, ${ethers.formatEther(creator.totalRevenue)} LYX revenue`);
        });

        console.log("\n⚡ Top Executors:");
        const topExecutors = await leaderboard.getTopExecutors(5);
        topExecutors.forEach((executor: any, i: number) => {
            console.log(`${i + 1}. ${executor.executor}: ${executor.executionCount} executions, ${ethers.formatEther(executor.totalFeesEarned)} LYX earned`);
        });

        console.log("\n📈 Platform Stats:");
        const platformStats = await leaderboard.getPlatformStats();
        console.log(`Total prizes distributed: ${ethers.formatEther(platformStats.totalPrizesDistributed)} LYX`);
        console.log(`Total tickets sold: ${platformStats.totalTicketsSold}`);
        console.log(`Total draws created: ${platformStats.totalDrawsCreated}`);
        console.log(`Total executions: ${platformStats.totalExecutions}`);
    } catch (error: any) {
        console.error("❌ Leaderboard check failed:", error.message);
    }

    // Test 9: Admin functions
    console.log("\n📊 Test 9: Admin Functions");
    try {
        // Check platform fees
        const lyxFees = await admin.getPlatformFeesLYX();
        console.log(`Platform fees (LYX): ${ethers.formatEther(lyxFees)}`);
        
        // Try to withdraw fees (will fail if not owner)
        try {
            await admin.withdrawPlatformFees();
            console.log("✅ Platform fees withdrawn");
        } catch {
            console.log("⚠️  Cannot withdraw fees (not owner)");
        }
    } catch (error: any) {
        console.error("❌ Admin function check failed:", error.message);
    }

    console.log("\n✅ All tests completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });