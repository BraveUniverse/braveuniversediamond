import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking Draw Status...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract
    const gridotto = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    
    // Check draws 15-20
    for (let i = 15; i <= 20; i++) {
        try {
            const draw = await gridotto.getUserDraw(i);
            
            if (draw.creator !== ethers.ZeroAddress) {
                console.log(`\n📊 Draw #${i}:`);
                console.log(`- Creator: ${draw.creator}`);
                console.log(`- Ticket Price: ${ethers.formatEther(draw.ticketPrice)} LYX`);
                console.log(`- Max Tickets: ${draw.maxTickets}`);
                console.log(`- Start Time: ${new Date(Number(draw.startTime) * 1000).toLocaleString()}`);
                console.log(`- End Time: ${new Date(Number(draw.endTime) * 1000).toLocaleString()}`);
                console.log(`- Is Completed: ${draw.isCompleted}`);
                
                const now = Math.floor(Date.now() / 1000);
                const startTime = Number(draw.startTime);
                const endTime = Number(draw.endTime);
                
                if (now < startTime) {
                    console.log(`- Status: ⏳ NOT STARTED`);
                } else if (now > endTime) {
                    console.log(`- Status: ⏰ ENDED`);
                } else {
                    console.log(`- Status: ✅ ACTIVE`);
                }
            }
        } catch (e) {
            // Skip
        }
    }
}

main().catch(console.error);