import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 TESTING BUY TICKETS FUNCTION\n");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);
    
    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const debug = await ethers.getContractAt("GridottoDebugFacet", DIAMOND_ADDRESS);

    // Use an existing draw or create new one
    const drawId = 12; // Use the draw we created earlier
    
    console.log("Testing with draw ID:", drawId);
    
    // Check initial state
    console.log("\n📊 Initial State:");
    let details = await core.getDrawDetails(drawId);
    console.log("- Tickets sold:", details.ticketsSold.toString());
    console.log("- Participants:", details.participantCount.toString());
    console.log("- Prize pool:", ethers.formatEther(details.prizePool));
    
    let participants = await debug.getDrawParticipants(drawId);
    console.log("- Participants array:", participants);
    
    let userTickets = await debug.getUserTicketCount(drawId, signer.address);
    console.log("- User tickets:", userTickets.toString());

    // Try to buy tickets with detailed error catching
    console.log("\n💰 Attempting to buy 3 tickets...");
    try {
        const ticketPrice = details.ticketPrice;
        const totalCost = ticketPrice * 3n;
        console.log("- Ticket price:", ethers.formatEther(ticketPrice), "LYX");
        console.log("- Total cost:", ethers.formatEther(totalCost), "LYX");
        
        // Check if draw is active
        const now = Math.floor(Date.now() / 1000);
        console.log("- Current time:", now);
        console.log("- Draw end time:", details.endTime.toString());
        console.log("- Is active:", now < Number(details.endTime));
        
        const tx = await core.buyTickets(drawId, 3, { 
            value: totalCost,
            gasLimit: 500000 // Set explicit gas limit
        });
        console.log("- Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("- Transaction confirmed!");
        console.log("- Gas used:", receipt.gasUsed.toString());
        
        // Check for events
        console.log("\n📡 Events:");
        for (const log of receipt.logs) {
            try {
                const parsed = core.interface.parseLog(log);
                if (parsed) {
                    console.log(`- ${parsed.name}:`, parsed.args);
                }
            } catch {}
        }
        
    } catch (error: any) {
        console.error("❌ Error buying tickets:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }

    // Check final state
    console.log("\n📊 Final State:");
    details = await core.getDrawDetails(drawId);
    console.log("- Tickets sold:", details.ticketsSold.toString());
    console.log("- Participants:", details.participantCount.toString());
    console.log("- Prize pool:", ethers.formatEther(details.prizePool));
    
    participants = await debug.getDrawParticipants(drawId);
    console.log("- Participants array:", participants);
    
    userTickets = await debug.getUserTicketCount(drawId, signer.address);
    console.log("- User tickets:", userTickets.toString());
    
    const calculatedTickets = await debug.calculateTotalTickets(drawId);
    console.log("- Calculated total tickets:", calculatedTickets.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });