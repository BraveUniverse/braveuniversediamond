import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Creating New Gridotto Draw...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get signer
    const [creator] = await ethers.getSigners();
    console.log("Creator address:", creator.address);
    
    // Get contract - use GridottoMissingFacet interface
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    
    try {
        // Draw parameters
        const drawType = 0; // USER_LYX = 0
        const ticketPrice = ethers.parseEther("0.1"); // 0.1 LYX per ticket
        const maxTickets = 100; // Maximum 100 tickets
        const duration = 7 * 24 * 60 * 60; // 7 days in seconds
        const participationRequirement = 0; // NONE = 0
        const requiredToken = ethers.ZeroAddress; // No token required
        const minTokenAmount = 0; // No minimum amount
        
        // Prize configuration
        const prizeConfig = {
            model: 0, // PERCENTAGE = 0
            creatorContribution: 0, // No creator contribution
            addParticipationFees: true, // Add ticket fees to prize pool
            participationFeePercent: 8000, // 80% of ticket sales go to prize pool
            totalWinners: 3, // 3 winners
            prizePercentages: [5000, 3000, 2000], // 50%, 30%, 20%
            minParticipants: 5,
            gracePeriod: 24 * 60 * 60 // 24 hours
        };
        
        const nftIds: any[] = []; // Empty array for NFT IDs
        
        console.log("📝 Draw Configuration:");
        console.log("- Draw Type: USER_LYX");
        console.log("- Ticket Price:", ethers.formatEther(ticketPrice), "LYX");
        console.log("- Max Tickets:", maxTickets);
        console.log("- Duration:", duration / (24 * 60 * 60), "days");
        console.log("- Min Participants:", prizeConfig.minParticipants);
        console.log("- Prize Distribution: 50% / 30% / 20%");
        
        // Create the draw
        console.log("\n🚀 Creating draw...");
        const tx = await gridotto.createUserDraw(
            drawType,
            ticketPrice,
            maxTickets,
            duration,
            prizeConfig,
            participationRequirement,
            requiredToken,
            minTokenAmount,
            nftIds,
            { value: 0 } // No initial prize pool
        );
        
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        
        // Get draw ID from events
        const drawCreatedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("DrawCreated(uint256,address,uint8)")
        );
        
        if (drawCreatedEvent) {
            const drawId = parseInt(drawCreatedEvent.topics[1], 16);
            console.log("\n🎉 Draw created successfully!");
            console.log("Draw ID:", drawId);
            
            // Verify draw details
            const draw = await gridotto.getUserDraw(drawId);
            console.log("\n📊 Draw Details:");
            console.log("- Creator:", draw.creator);
            console.log("- Status: Active ✅");
            console.log("- Tickets Sold:", draw.ticketsSold?.toString() || "0");
            
            console.log("\n💡 Next Steps:");
            console.log(`1. Buy tickets: buyUserDrawTicket(${drawId}, amount)`);
            console.log(`2. Check status: getUserDraw(${drawId})`);
            console.log(`3. Execute after end time: executeUserDraw(${drawId})`);
            
            // Example ticket purchase command
            const ticketCost = BigInt(ticketPrice) * 2n;
            console.log(`\n📌 To buy 2 tickets, use:`);
            console.log(`   buyUserDrawTicket(${drawId}, 2) with ${ethers.formatEther(ticketCost)} LYX`);
            
        } else {
            console.log("⚠️  Could not find draw ID in events");
        }
        
    } catch (error: any) {
        console.error("Error creating draw:", error.message);
    }
}

main().catch(console.error);