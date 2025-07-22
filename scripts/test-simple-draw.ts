import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🧪 Testing Draw Creation and Execution...\n");

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionFacetSimple", DIAMOND_ADDRESS);

    // Create a draw
    console.log("\n📊 Creating LYX Draw...");
    let drawId;
    try {
        const ticketPrice = ethers.parseEther("0.01"); // 0.01 LYX per ticket
        const maxTickets = 10;
        const duration = 60; // 60 seconds
        const minParticipants = 1; // Only 1 participant needed
        const platformFeePercent = 500; // 5%
        const initialPrize = ethers.parseEther("0.1"); // 0.1 LYX initial prize

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

    // Get draw details
    console.log("\n📊 Draw Details:");
    try {
        const details = await core.getDrawDetails(drawId);
        console.log(`Creator: ${details.creator}`);
        console.log(`Ticket price: ${ethers.formatEther(details.ticketPrice)} LYX`);
        console.log(`Max tickets: ${details.maxTickets}`);
        console.log(`Prize pool: ${ethers.formatEther(details.prizePool)} LYX`);
        console.log(`End time: ${new Date(Number(details.endTime) * 1000).toLocaleString()}`);
        console.log(`Min participants: ${details.minParticipants}`);
    } catch (error: any) {
        console.error("❌ Get draw details failed:", error.message);
    }

    // Buy tickets
    console.log("\n📊 Buying tickets...");
    try {
        const ticketAmount = 5;
        const ticketCost = await core.getTicketCost(drawId, ticketAmount);
        console.log(`Buying ${ticketAmount} tickets for ${ethers.formatEther(ticketCost)} LYX`);
        
        const tx = await core.buyTickets(drawId, ticketAmount, { value: ticketCost });
        await tx.wait();
        console.log(`✅ Bought ${ticketAmount} tickets`);
        
        // Check user tickets
        const userTickets = await core.getUserTickets(drawId, signer.address);
        console.log(`Your tickets: ${userTickets}`);
    } catch (error: any) {
        console.error("❌ Ticket purchase failed:", error.message);
    }

    // Check draw details after purchase
    console.log("\n📊 Updated Draw Details:");
    try {
        const details = await core.getDrawDetails(drawId);
        console.log(`Tickets sold: ${details.ticketsSold}`);
        console.log(`Prize pool: ${ethers.formatEther(details.prizePool)} LYX`);
        console.log(`Participants: ${details.participantCount}`);
    } catch (error: any) {
        console.error("❌ Get draw details failed:", error.message);
    }

    // Wait for draw to end
    console.log("\n⏳ Waiting for draw to end...");
    console.log("Waiting 65 seconds...");
    await new Promise(resolve => setTimeout(resolve, 65000));

    // Execute draw
    console.log("\n📊 Executing draw...");
    try {
        const canExecute = await execution.canExecuteDraw(drawId);
        console.log(`Can execute: ${canExecute}`);
        
        if (canExecute) {
            const tx = await execution.executeDraw(drawId);
            const receipt = await tx.wait();
            console.log(`✅ Draw executed! Tx: ${tx.hash}`);
            
            // Get winners
            const [winners, amounts] = await execution.getDrawWinners(drawId);
            console.log(`\n🏆 Winner: ${winners[0]}`);
            console.log(`💰 Prize: ${ethers.formatEther(amounts[0])} LYX`);
            
            // Check if we won
            if (winners[0].toLowerCase() === signer.address.toLowerCase()) {
                console.log("\n🎉 Congratulations! You won!");
                
                // Claim prize
                console.log("Claiming prize...");
                const claimTx = await execution.claimPrize(drawId);
                await claimTx.wait();
                console.log("✅ Prize claimed!");
            }
        } else {
            console.log("❌ Cannot execute draw yet");
            
            // Check why
            const details = await core.getDrawDetails(drawId);
            const now = Math.floor(Date.now() / 1000);
            console.log(`Current time: ${now}`);
            console.log(`End time: ${details.endTime}`);
            console.log(`Time remaining: ${Number(details.endTime) - now} seconds`);
            console.log(`Participants: ${details.participantCount}`);
            console.log(`Min participants: ${details.minParticipants}`);
        }
    } catch (error: any) {
        console.error("❌ Draw execution failed:", error.message);
    }

    console.log("\n✅ Test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });