import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 TESTING NEW DRAW CREATION WITH V2\n");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);
    
    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const debug = await ethers.getContractAt("GridottoDebugFacet", DIAMOND_ADDRESS);

    // Create a new draw
    console.log("Creating new draw...");
    const tx = await core.createLYXDraw(
        ethers.parseEther("0.05"), // 0.05 LYX per ticket
        100,
        600, // 10 minutes
        1,
        500,
        { value: ethers.parseEther("1.0") }
    );
    const receipt = await tx.wait();
    
    // Extract draw ID from event
    let drawId;
    for (const log of receipt.logs) {
        try {
            const parsed = core.interface.parseLog(log);
            if (parsed?.name === "DrawCreated") {
                drawId = parsed.args.drawId;
                console.log("✅ Created draw ID:", drawId.toString());
                break;
            }
        } catch {}
    }

    if (!drawId) {
        console.error("❌ Could not find draw ID from events");
        return;
    }

    // Check initial state
    console.log("\n📊 Initial State After Creation:");
    let details = await core.getDrawDetails(drawId);
    console.log("- Creator:", details.creator);
    console.log("- Ticket price:", ethers.formatEther(details.ticketPrice), "LYX");
    console.log("- Max tickets:", details.maxTickets.toString());
    console.log("- Tickets sold:", details.ticketsSold.toString());
    console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");
    console.log("- Start time:", new Date(Number(details.startTime) * 1000).toLocaleString());
    console.log("- End time:", new Date(Number(details.endTime) * 1000).toLocaleString());

    // Get debug info
    console.log("\n🔍 Debug Info After Creation:");
    const debugInfo = await debug.getDrawDebugInfo(drawId);
    console.log("- Draw type:", debugInfo.drawType);
    console.log("- Config ticket price:", ethers.formatEther(debugInfo.configTicketPrice));
    console.log("- Config max tickets:", debugInfo.configMaxTickets.toString());
    console.log("- Tickets sold (storage):", debugInfo.ticketsSold.toString());
    console.log("- Participant count:", debugInfo.participantCount.toString());

    // Buy tickets
    console.log("\n💰 Buying 10 tickets...");
    try {
        const buyTx = await core.buyTickets(drawId, 10, { 
            value: ethers.parseEther("0.5"), // 10 * 0.05
            gasLimit: 500000
        });
        console.log("- Transaction sent:", buyTx.hash);
        
        const buyReceipt = await buyTx.wait();
        console.log("- Transaction confirmed!");
        
        // Check events
        for (const log of buyReceipt.logs) {
            try {
                const parsed = core.interface.parseLog(log);
                if (parsed?.name === "TicketsPurchased") {
                    console.log("- TicketsPurchased event:", parsed.args);
                }
            } catch {}
        }
    } catch (error: any) {
        console.error("❌ Error buying tickets:", error.message);
    }

    // Check final state
    console.log("\n📊 Final State After Purchase:");
    details = await core.getDrawDetails(drawId);
    console.log("- Tickets sold:", details.ticketsSold.toString());
    console.log("- Participants:", details.participantCount.toString());
    console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");

    // Debug checks
    const participants = await debug.getDrawParticipants(drawId);
    console.log("- Participants array:", participants);
    
    const userTickets = await debug.getUserTicketCount(drawId, signer.address);
    console.log("- User tickets:", userTickets.toString());
    
    const calculatedTickets = await debug.calculateTotalTickets(drawId);
    console.log("- Calculated total tickets:", calculatedTickets.toString());

    // Check storage directly
    console.log("\n🔍 Direct Storage Checks:");
    const ticketsSoldDirect = await debug.getTicketsSoldDirectly(drawId);
    console.log("- Tickets sold (direct):", ticketsSoldDirect.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });