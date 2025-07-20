import { ethers } from "hardhat";

async function main() {
    console.log("Checking Active Draws...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract
    const gridotto = await ethers.getContractAt("GridottoUIHelperFacet", diamondAddress);
    
    try {
        // Get active draws
        const activeDraws = await gridotto.getActiveUserDraws(20); // Get first 20
        
        console.log(`Found ${activeDraws.length} active draws:\n`);
        
        const now = Math.floor(Date.now() / 1000);
        
        for (const draw of activeDraws) {
            if (draw.creator !== ethers.ZeroAddress) {
                const endTime = Number(draw.endTime);
                const isActive = endTime > now && !draw.isCompleted;
                
                console.log(`Draw #${draw.drawId || "?"}`);
                console.log(`  Creator: ${draw.creator}`);
                console.log(`  Type: ${draw.drawType}`);
                console.log(`  Ticket Price: ${ethers.formatEther(draw.ticketPrice)} LYX`);
                console.log(`  End Time: ${new Date(endTime * 1000).toLocaleString()}`);
                console.log(`  Status: ${isActive ? "✅ ACTIVE" : "❌ ENDED"}`);
                console.log(`  Tickets Sold: ${draw.ticketsSold || 0}`);
                console.log("");
            }
        }
        
        // Also try to get a specific valid draw for testing
        console.log("\nTrying to find a valid draw for testing...");
        
        for (let i = 1; i <= 20; i++) {
            try {
                const draw = await gridotto.getUserDrawDetails(i);
                if (draw.creator !== ethers.ZeroAddress) {
                    const endTime = Number(draw.endTime);
                    if (endTime > now && !draw.isCompleted) {
                        console.log(`\n✅ Found active draw: #${i}`);
                        console.log(`Ticket Price: ${ethers.formatEther(draw.ticketPrice)} LYX`);
                        console.log(`To buy 2 tickets, send: ${ethers.formatEther(BigInt(draw.ticketPrice) * 2n)} LYX`);
                        break;
                    }
                }
            } catch (e) {
                // Skip
            }
        }
        
    } catch (error: any) {
        console.log("Error:", error.message);
    }
}

main().catch(console.error);