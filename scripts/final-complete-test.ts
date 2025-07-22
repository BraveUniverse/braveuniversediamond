import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Final Complete System Test...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Test accounts
    const testAccounts = [
        "0x38e456661bc6e95A3aCf3B4673844Cb389b60243",
        "0x666eA581Ab742695373bF63cCc885968fFDB966c",
        "0x8C53973147e0c7C299DB04Ef0dE4e74Cf7D8aFA7"
    ];
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Get contracts
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const viewFacet = await ethers.getContractAt("GridottoViewFacet", diamondAddress);
    const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    const execution = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
    
    try {
        // Step 1: Create multiple draws
        console.log("📝 Step 1: Creating test draws...\n");
        
        const draws = [];
        
        // Draw 1: Quick draw (1 hour)
        console.log("Creating Draw 1 (1 hour draw)...");
        const prizeConfig1 = {
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
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            100, // max tickets
            3600, // 1 hour
            prizeConfig1,
            0, // No requirement
            ethers.ZeroAddress,
            0,
            [],
            { value: 0 }
        );
        
        const receipt1 = await tx1.wait();
        const drawId1 = await getDrawIdFromReceipt(receipt1);
        draws.push(drawId1);
        console.log(`✅ Draw ${drawId1} created!`);
        
        // Draw 2: Multiple winners
        console.log("\nCreating Draw 2 (3 winners)...");
        const prizeConfig2 = {
            model: 0,
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 8000,
            totalWinners: 3,
            prizePercentages: [5000, 3000, 2000], // 50%, 30%, 20%
            minParticipants: 5,
            gracePeriod: 60
        };
        
        const tx2 = await gridotto.createUserDraw(
            0,
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            200,
            7200, // 2 hours
            prizeConfig2,
            0,
            ethers.ZeroAddress,
            0,
            [],
            { value: 0 }
        );
        
        const receipt2 = await tx2.wait();
        const drawId2 = await getDrawIdFromReceipt(receipt2);
        draws.push(drawId2);
        console.log(`✅ Draw ${drawId2} created!`);
        
        // Step 2: Buy tickets
        console.log("\n🎫 Step 2: Buying tickets...\n");
        
        // For Draw 1 - Quick test
        console.log(`Draw ${drawId1} ticket purchases:`);
        await buyTickets(mainFacet, drawId1, 10, "0.05");
        console.log("- Bought 10 tickets");
        
        // For Draw 2 - Multiple participants simulation
        console.log(`\nDraw ${drawId2} ticket purchases:`);
        await buyTickets(mainFacet, drawId2, 20, "0.1");
        console.log("- Account 1: Bought 20 tickets");
        
        // Simulate more purchases (in real scenario, different accounts would buy)
        await buyTickets(mainFacet, drawId2, 15, "0.1");
        console.log("- Account 1: Bought 15 more tickets");
        
        await buyTickets(mainFacet, drawId2, 25, "0.1");
        console.log("- Account 1: Bought 25 more tickets");
        
        // Step 3: Check draw status
        console.log("\n📊 Step 3: Checking draw status...\n");
        
        for (const drawId of draws) {
            const [startTime, endTime, isActive, timeRemaining] = await viewFacet.getDrawTiming(drawId);
            const [canExecute, reason] = await viewFacet.canExecuteDraw(drawId);
            
            console.log(`Draw ${drawId}:`);
            console.log(`- Start: ${new Date(Number(startTime) * 1000).toLocaleTimeString()}`);
            console.log(`- End: ${new Date(Number(endTime) * 1000).toLocaleTimeString()}`);
            console.log(`- Active: ${isActive}`);
            console.log(`- Time remaining: ${timeRemaining} seconds`);
            console.log(`- Can execute: ${canExecute} (${reason || "Ready"})`);
            
            // Get participants
            const [participants, ticketCounts] = await viewFacet.getDrawParticipantsWithTickets(drawId);
            console.log(`- Participants: ${participants.length}`);
            
            let totalTickets = 0n;
            for (const count of ticketCounts) {
                totalTickets += count;
            }
            console.log(`- Total tickets: ${totalTickets}`);
            console.log("");
        }
        
        // Step 4: Wait for draw 1 to end
        console.log("⏰ Waiting for Draw 1 to end (1 hour)...");
        console.log("You can execute it after it ends.\n");
        
        // Step 5: Test leaderboard
        console.log("📊 Step 4: Testing leaderboard...\n");
        
        const platformStats = await leaderboard.getPlatformStats();
        console.log("Platform Statistics:");
        console.log(`- Total Prizes: ${ethers.formatEther(platformStats.totalPrizesDistributed)} LYX`);
        console.log(`- Total Tickets: ${platformStats.totalTicketsSold}`);
        console.log(`- Total Draws: ${platformStats.totalDrawsCreated}`);
        console.log(`- Total Executions: ${platformStats.totalExecutions}`);
        
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
            console.log(`   Draws: ${creator.drawsCreated}, Revenue: ${ethers.formatEther(creator.totalRevenue)} LYX`);
        }
        
        // Instructions for execution
        console.log("\n📝 NEXT STEPS:");
        console.log("================");
        console.log(`1. Wait for draws to end`);
        console.log(`2. Execute Draw ${drawId1}: executeUserDraw(${drawId1})`);
        console.log(`3. Execute Draw ${drawId2}: executeUserDraw(${drawId2})`);
        console.log(`4. Check winners and updated leaderboard`);
        
        console.log("\n✅ SYSTEM STATUS:");
        console.log("- Draw creation: ✅ Working");
        console.log("- Ticket purchase: ✅ Working");
        console.log("- View functions: ✅ Working (proper timestamps)");
        console.log("- Leaderboard: ✅ Working");
        console.log("- Execution: Ready to test after draws end");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

// Helper function to extract draw ID
async function getDrawIdFromReceipt(receipt: any): Promise<number> {
    for (const log of receipt.logs) {
        if (log.topics && log.topics.length >= 2) {
            const id = parseInt(log.topics[1], 16);
            if (id > 0 && id < 1000) {
                return id;
            }
        }
    }
    throw new Error("Could not find draw ID");
}

// Helper function to buy tickets
async function buyTickets(
    mainFacet: any,
    drawId: number,
    amount: number,
    pricePerTicket: string
) {
    const totalCost = ethers.parseEther(pricePerTicket) * BigInt(amount);
    const tx = await mainFacet.buyUserDrawTicket(drawId, amount, {
        value: totalCost
    });
    await tx.wait();
}

main().catch(console.error);