import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 DEBUGGING STORAGE MAPPING ISSUE\n");

    const [signer] = await ethers.getSigners();
    
    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const debug = await ethers.getContractAt("GridottoDebugFacet", DIAMOND_ADDRESS);

    // Create a test draw
    console.log("Creating test draw...");
    const tx = await core.createLYXDraw(
        ethers.parseEther("0.1"), // 0.1 LYX per ticket
        50,
        300, // 5 minutes
        1,
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
    
    const drawId = core.interface.parseLog(event!)?.args.drawId;
    console.log("✅ Created draw ID:", drawId?.toString());

    // Buy tickets
    console.log("\nBuying 5 tickets...");
    await core.buyTickets(drawId, 5, { value: ethers.parseEther("0.5") });
    console.log("✅ Tickets purchased");

    // Get draw details using original function
    console.log("\n📊 Original getDrawDetails:");
    const details = await core.getDrawDetails(drawId);
    console.log("- Tickets sold:", details.ticketsSold.toString());
    console.log("- Participants:", details.participantCount.toString());
    console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");

    // Get debug info
    console.log("\n🔍 Debug Info:");
    const debugInfo = await debug.getDrawDebugInfo(drawId);
    console.log("- Creator:", debugInfo.creator);
    console.log("- Draw type:", debugInfo.drawType);
    console.log("- Config ticket price:", ethers.formatEther(debugInfo.configTicketPrice));
    console.log("- Config max tickets:", debugInfo.configMaxTickets.toString());
    console.log("- Tickets sold (direct):", debugInfo.ticketsSold.toString());
    console.log("- Prize pool:", ethers.formatEther(debugInfo.prizePool));
    console.log("- Participant count:", debugInfo.participantCount.toString());

    // Additional checks
    console.log("\n🔍 Additional Checks:");
    const ticketsSoldDirect = await debug.getTicketsSoldDirectly(drawId);
    console.log("- Tickets sold (direct access):", ticketsSoldDirect.toString());
    
    const calculatedTickets = await debug.calculateTotalTickets(drawId);
    console.log("- Calculated total tickets:", calculatedTickets.toString());
    
    const userTickets = await debug.getUserTicketCount(drawId, signer.address);
    console.log("- User ticket count:", userTickets.toString());
    
    const participants = await debug.getDrawParticipants(drawId);
    console.log("- Participants array:", participants);

    // Check if it's a storage slot issue
    console.log("\n🔍 Checking different draw IDs:");
    for (let i = 1; i <= 3; i++) {
        try {
            const info = await core.getDrawDetails(i);
            console.log(`Draw ${i}: ticketsSold=${info.ticketsSold}, participants=${info.participantCount}`);
        } catch (e) {
            console.log(`Draw ${i}: Not found or error`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });