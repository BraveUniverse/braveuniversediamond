import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Testing Draw #12...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const drawId = 12;
    
    // Get contract - use main interface
    const gridotto = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    
    try {
        // Get draw details
        const draw = await gridotto.getUserDraw(drawId);
        
        console.log("📊 Draw #12 Details:");
        console.log("- Creator:", draw.creator);
        console.log("- Draw Type:", draw.drawType);
        console.log("- Ticket Price:", ethers.formatEther(draw.ticketPrice), "LYX");
        console.log("- Max Tickets:", draw.maxTickets.toString());
        console.log("- Tickets Sold:", draw.ticketsSold?.toString() || "0");
        console.log("- Start Time:", new Date(Number(draw.startTime) * 1000).toLocaleString());
        console.log("- End Time:", new Date(Number(draw.endTime) * 1000).toLocaleString());
        console.log("- Is Completed:", draw.isCompleted);
        
        // Check if active
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(draw.endTime);
        
        if (now < endTime && !draw.isCompleted) {
            console.log("\n✅ Draw is ACTIVE and accepting tickets!");
            
            // Buy 2 tickets
            console.log("\n🎫 Buying 2 tickets...");
            const ticketCost = BigInt(draw.ticketPrice) * 2n;
            console.log(`Cost: ${ethers.formatEther(ticketCost)} LYX`);
            
            const [buyer] = await ethers.getSigners();
            console.log("Buyer:", buyer.address);
            
            const tx = await gridotto.buyUserDrawTicket(drawId, 2, { 
                value: ticketCost 
            });
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("✅ Tickets purchased successfully!");
            
            // Check updated draw info
            const updatedDraw = await gridotto.getUserDraw(drawId);
            console.log("\n📊 Updated Draw Info:");
            console.log("- Tickets Sold:", updatedDraw.ticketsSold?.toString() || "0");
            console.log("- Current Prize Pool:", ethers.formatEther(updatedDraw.currentPrizePool || 0), "LYX");
            
        } else {
            console.log("\n❌ Draw is not active");
        }
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);