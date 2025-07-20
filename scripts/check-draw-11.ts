import { ethers } from "hardhat";

async function main() {
    console.log("Checking Draw ID 11 status...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract
    const gridotto = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    
    try {
        // Get draw details
        const draw = await gridotto.getUserDraw(11);
        
        console.log("Draw #11 Details:");
        console.log("Creator:", draw.creator);
        console.log("Draw Type:", draw.drawType);
        console.log("Start Time:", new Date(Number(draw.startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(draw.endTime) * 1000).toLocaleString());
        console.log("Ticket Price:", ethers.formatEther(draw.ticketPrice), "LYX");
        console.log("Max Tickets:", draw.maxTickets.toString());
        console.log("Tickets Sold:", draw.ticketsSold?.toString() || "0");
        console.log("Is Completed:", draw.isCompleted);
        console.log("Current Prize Pool:", ethers.formatEther(draw.currentPrizePool || 0), "LYX");
        
        // Check if draw exists
        if (draw.creator === ethers.ZeroAddress) {
            console.log("\n❌ Draw #11 does not exist!");
            return;
        }
        
        // Check if draw is active
        const now = Math.floor(Date.now() / 1000);
        if (now < Number(draw.startTime)) {
            console.log("\n❌ Draw has not started yet!");
        } else if (now > Number(draw.endTime)) {
            console.log("\n❌ Draw has ended!");
        } else if (draw.isCompleted) {
            console.log("\n❌ Draw is already completed!");
        } else {
            console.log("\n✅ Draw is active and accepting tickets!");
            
            // Calculate cost for 2 tickets
            const ticketCost = BigInt(draw.ticketPrice) * 2n;
            console.log(`\nCost for 2 tickets: ${ethers.formatEther(ticketCost)} LYX`);
        }
        
    } catch (error: any) {
        console.log("Error getting draw details:", error.message);
        
        // Try alternative method
        try {
            const drawInfo = await gridotto.getDrawInfo(11);
            console.log("\nAlternative draw info:", drawInfo);
        } catch (e) {
            console.log("Alternative method also failed");
        }
    }
}

main().catch(console.error);