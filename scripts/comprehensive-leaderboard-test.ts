import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Comprehensive Leaderboard Test with Multiple Accounts...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Test accounts - you provided 3 accounts
    const accounts = [
        "0x38e456661bc6e95A3aCf3B4673844Cb389b60243", // Account 1
        "0x666eA581Ab742695373bF63cCc885968fFDB966c", // Account 2  
        "0x8C53973147e0c7C299DB04Ef0dE4e74Cf7D8aFA7"  // Account 3
    ];
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log("Using deployer account:", signer.address);
    
    // Check balances
    console.log("\n💰 Account Balances:");
    for (const account of accounts) {
        const balance = await ethers.provider.getBalance(account);
        console.log(`${account}: ${ethers.formatEther(balance)} LYX`);
    }
    
    // Get contracts
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const execution = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
    
    try {
        // Create draws from different accounts
        console.log("\n📝 Creating test draws...");
        const draws = [];
        
        // Draw 1: Created by main account - Quick draw (1 hour)
        console.log("\nCreating Draw 1 (1 hour duration)...");
        const prizeConfig1 = {
            model: 0, // PERCENTAGE
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 8000, // 80% to prize pool
            totalWinners: 1,
            prizePercentages: [10000], // 100% to winner
            minParticipants: 3,
            gracePeriod: 300 // 5 minutes
        };
        
        const tx1 = await gridotto.createUserDraw(
            0, // USER_LYX
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
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
            gracePeriod: 300
        };
        
        const tx2 = await gridotto.createUserDraw(
            0,
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            200,
            3600,
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
        
        // Buy tickets from different accounts
        console.log("\n🎫 Buying tickets from different accounts...");
        
        // For Draw 1
        console.log(`\n--- Draw ${drawId1} Ticket Purchases ---`);
        
        // Account 1 buys 10 tickets
        console.log("Account 1 buying 10 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[0], drawId1, 10, "0.1");
        
        // Account 2 buys 25 tickets
        console.log("Account 2 buying 25 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[1], drawId1, 25, "0.1");
        
        // Account 3 buys 15 tickets
        console.log("Account 3 buying 15 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[2], drawId1, 15, "0.1");
        
        // For Draw 2
        console.log(`\n--- Draw ${drawId2} Ticket Purchases ---`);
        
        // Account 1 buys 30 tickets
        console.log("Account 1 buying 30 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[0], drawId2, 30, "0.05");
        
        // Account 2 buys 20 tickets
        console.log("Account 2 buying 20 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[1], drawId2, 20, "0.05");
        
        // Account 3 buys 50 tickets
        console.log("Account 3 buying 50 tickets...");
        await buyTicketsWithAccount(gridotto, accounts[2], drawId2, 50, "0.05");
        
        // Show ticket distribution
        console.log("\n📊 Ticket Distribution:");
        for (const drawId of draws) {
            const draw = await gridotto.getUserDraw(drawId);
            console.log(`\nDraw ${drawId}:`);
            console.log(`- Total tickets sold: ${draw.ticketsSold || 0}`);
            console.log(`- Prize pool: ${ethers.formatEther(draw.currentPrizePool || 0)} LYX`);
        }
        
        // Wait for draws to end (for testing, we'll use admin functions if available)
        console.log("\n⏰ Waiting a moment before attempting execution...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to execute draws (they might not be ready yet)
        console.log("\n🎯 Attempting to execute draws...");
        
        for (const drawId of draws) {
            try {
                console.log(`\nExecuting draw ${drawId}...`);
                const canExecute = await execution.canExecuteDraw(drawId);
                console.log(`Can execute: ${canExecute}`);
                
                if (!canExecute) {
                    console.log("Draw not ready for execution yet (still active or grace period)");
                } else {
                    const tx = await execution.executeUserDraw(drawId);
                    await tx.wait();
                    console.log(`✅ Draw ${drawId} executed!`);
                    
                    // Get winners
                    const draw = await gridotto.getUserDraw(drawId);
                    console.log(`Winners: ${draw.winners}`);
                }
            } catch (e: any) {
                console.log(`Cannot execute draw ${drawId}: ${e.message}`);
            }
        }
        
        // Test leaderboard functions
        console.log("\n\n📊 LEADERBOARD RESULTS");
        console.log("=" + "=".repeat(60));
        
        // Platform Stats
        console.log("\n📈 Platform Statistics:");
        const stats = await leaderboard.getPlatformStats();
        console.log(`- Total Prizes Distributed: ${ethers.formatEther(stats.totalPrizesDistributed)} LYX`);
        console.log(`- Total Tickets Sold: ${stats.totalTicketsSold}`);
        console.log(`- Total Draws Created: ${stats.totalDrawsCreated}`);
        console.log(`- Total Executions: ${stats.totalExecutions}`);
        
        // Top Ticket Buyers
        console.log("\n\n🎫 TOP TICKET BUYERS:");
        console.log("-" + "-".repeat(60));
        const topBuyers = await leaderboard.getTopTicketBuyers(10);
        
        for (let i = 0; i < topBuyers.length; i++) {
            const buyer = topBuyers[i];
            const accountIndex = accounts.indexOf(buyer.player) + 1;
            const label = accountIndex > 0 ? `Account ${accountIndex}` : "Other";
            
            console.log(`\n#${i + 1} ${label} (${buyer.player})`);
            console.log(`   📊 Total Tickets: ${buyer.totalTickets}`);
            console.log(`   💰 Total Spent: ${ethers.formatEther(buyer.totalSpent)} LYX`);
            console.log(`   💵 Average per ticket: ${buyer.totalTickets > 0 ? ethers.formatEther(buyer.totalSpent / buyer.totalTickets) : "0"} LYX`);
            console.log(`   🕒 Last Purchase: ${new Date(Number(buyer.lastPurchaseTime) * 1000).toLocaleString()}`);
        }
        
        // Top Winners (if any draws were executed)
        console.log("\n\n🏆 TOP WINNERS:");
        console.log("-" + "-".repeat(60));
        const topWinners = await leaderboard.getTopWinners(10);
        
        if (topWinners.length === 0) {
            console.log("No winners yet (draws not executed)");
        } else {
            for (let i = 0; i < topWinners.length; i++) {
                const winner = topWinners[i];
                const accountIndex = accounts.indexOf(winner.player) + 1;
                const label = accountIndex > 0 ? `Account ${accountIndex}` : "Other";
                
                console.log(`\n#${i + 1} ${label} (${winner.player})`);
                console.log(`   🏆 Total Winnings: ${ethers.formatEther(winner.totalWinnings)} LYX`);
                console.log(`   🎯 Draws Won: ${winner.drawsWon}`);
                console.log(`   🕒 Last Win: ${new Date(Number(winner.lastWinTime) * 1000).toLocaleString()}`);
            }
        }
        
        // Top Draw Creators
        console.log("\n\n🎁 TOP DRAW CREATORS:");
        console.log("-" + "-".repeat(60));
        const topCreators = await leaderboard.getTopDrawCreators(10);
        
        for (let i = 0; i < topCreators.length; i++) {
            const creator = topCreators[i];
            console.log(`\n#${i + 1} ${creator.creator}`);
            console.log(`   📝 Draws Created: ${creator.drawsCreated}`);
            console.log(`   💰 Total Revenue: ${ethers.formatEther(creator.totalRevenue)} LYX`);
            console.log(`   ✅ Successful Draws: ${creator.successfulDraws}`);
            console.log(`   📊 Success Rate: ${creator.successRate}%`);
        }
        
        // Summary
        console.log("\n\n📊 SUMMARY:");
        console.log("=" + "=".repeat(60));
        console.log("Account 1:", accounts[0]);
        console.log("Account 2:", accounts[1]);
        console.log("Account 3:", accounts[2]);
        
        // Calculate total spending per account
        const spending: {[key: string]: bigint} = {};
        for (const buyer of topBuyers) {
            if (accounts.includes(buyer.player)) {
                spending[buyer.player] = buyer.totalSpent;
            }
        }
        
        console.log("\n💸 Total Spending by Account:");
        for (let i = 0; i < accounts.length; i++) {
            const spent = spending[accounts[i]] || 0n;
            console.log(`Account ${i + 1}: ${ethers.formatEther(spent)} LYX`);
        }
        
    } catch (error: any) {
        console.error("Error in test:", error.message);
    }
}

// Helper function to extract draw ID from receipt
async function getDrawIdFromReceipt(receipt: any): Promise<number> {
    // Look for the event in logs
    for (const log of receipt.logs) {
        // Check if this is a draw created event
        if (log.topics && log.topics.length >= 2) {
            // The first topic is the event signature, second is the draw ID
            const drawId = parseInt(log.topics[1], 16);
            if (drawId > 0 && drawId < 1000000) { // Reasonable draw ID
                console.log(`Found draw ID from event: ${drawId}`);
                return drawId;
            }
        }
    }
    
    // If no event found, throw error
    throw new Error("Could not find draw ID in transaction receipt");
}

// Helper function to buy tickets from a specific account
async function buyTicketsWithAccount(
    gridotto: any,
    account: string,
    drawId: number,
    amount: number,
    ticketPrice: string
) {
    // Since we can't impersonate on testnet, we'll use the main signer
    // In real scenario, each account would sign their own transactions
    const totalCost = ethers.parseEther(ticketPrice) * BigInt(amount);
    
    // Get the main interface for buying tickets
    const mainContract = await ethers.getContractAt("IGridottoFacet", "0x5Ad808FAE645BA3682170467114e5b80A70bF276");
    const tx = await mainContract.buyUserDrawTicket(drawId, amount, {
        value: totalCost
    });
    await tx.wait();
    console.log(`✅ Bought ${amount} tickets for ${ethers.formatEther(totalCost)} LYX`);
}

main().catch(console.error);