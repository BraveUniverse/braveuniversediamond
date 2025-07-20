import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Finding Active Draws...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract
    const gridotto = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    const uiHelper = await ethers.getContractAt("GridottoUIHelperFacet", diamondAddress);
    
    try {
        // Try UI helper first
        console.log("Using UI Helper to find active draws...");
        const activeDraws = await uiHelper.getActiveUserDraws(50);
        
        console.log(`Found ${activeDraws.length} draws from UI Helper\n`);
        
        const now = Math.floor(Date.now() / 1000);
        let foundActive = false;
        
        for (const draw of activeDraws) {
            if (draw && draw.creator && draw.creator !== ethers.ZeroAddress) {
                const endTime = Number(draw.endTime);
                const startTime = Number(draw.startTime);
                const isActive = endTime > now && startTime <= now && !draw.isCompleted;
                
                if (isActive) {
                    foundActive = true;
                    console.log(`\n✅ Active Draw Found!`);
                    console.log(`Draw ID: ${draw.drawId || "?"}`);
                    console.log(`Creator: ${draw.creator}`);
                    console.log(`Ticket Price: ${ethers.formatEther(draw.ticketPrice)} LYX`);
                    console.log(`Tickets Sold: ${draw.ticketsSold || 0}`);
                    console.log(`End Time: ${new Date(endTime * 1000).toLocaleString()}`);
                }
            }
        }
        
        if (!foundActive) {
            console.log("No active draws found via UI Helper\n");
            
            // Manual check
            console.log("Manually checking draws 1-20...");
            
            for (let i = 1; i <= 20; i++) {
                try {
                    const draw = await gridotto.getUserDraw(i);
                    
                    if (draw.creator !== ethers.ZeroAddress) {
                        const endTime = Number(draw.endTime);
                        const startTime = Number(draw.startTime);
                        
                        // Check if times are reasonable (not 0 or very old)
                        if (endTime > 1000000000 && startTime > 1000000000) {
                            const isActive = endTime > now && startTime <= now && !draw.isCompleted;
                            
                            console.log(`\nDraw #${i}:`);
                            console.log(`- Creator: ${draw.creator}`);
                            console.log(`- Start: ${new Date(startTime * 1000).toLocaleString()}`);
                            console.log(`- End: ${new Date(endTime * 1000).toLocaleString()}`);
                            console.log(`- Status: ${isActive ? "✅ ACTIVE" : "❌ INACTIVE"}`);
                            
                            if (isActive) {
                                console.log(`- Ticket Price: ${ethers.formatEther(draw.ticketPrice)} LYX`);
                                console.log(`- Max Tickets: ${draw.maxTickets}`);
                                console.log(`\n🎯 You can buy tickets for draw #${i}!`);
                                console.log(`Use: buyUserDrawTicket(${i}, amount)`);
                            }
                        }
                    }
                } catch (e) {
                    // Skip
                }
            }
        }
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);