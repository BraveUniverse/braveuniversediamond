import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking newly created draw...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const txHash = "0x8e3dc819ac93456755b39f155d65e8703c52e6ca3291b2a8fd3cc0b6dd431196";
    
    // Get contract
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    const provider = ethers.provider;
    
    try {
        // Get transaction receipt
        console.log("Getting transaction receipt...");
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
            console.log("Transaction status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
            console.log("Gas used:", receipt.gasUsed.toString());
            console.log("Logs:", receipt.logs.length);
            
            // Try to find draw ID from logs
            for (const log of receipt.logs) {
                console.log("\nLog:");
                console.log("- Address:", log.address);
                console.log("- Topics:", log.topics);
                
                // Check if it's a DrawCreated event
                if (log.topics[0] === ethers.id("DrawCreated(uint256,address,uint8)")) {
                    const drawId = parseInt(log.topics[1], 16);
                    console.log("\n🎉 Found DrawCreated event!");
                    console.log("Draw ID:", drawId);
                    
                    // Get draw details
                    const draw = await gridotto.getUserDraw(drawId);
                    console.log("\n📊 Draw Details:");
                    console.log("- Creator:", draw.creator);
                    console.log("- Ticket Price:", ethers.formatEther(draw.ticketPrice), "LYX");
                    console.log("- Max Tickets:", draw.maxTickets.toString());
                    console.log("- Tickets Sold:", draw.ticketsSold?.toString() || "0");
                    console.log("- Start Time:", new Date(Number(draw.startTime) * 1000).toLocaleString());
                    console.log("- End Time:", new Date(Number(draw.endTime) * 1000).toLocaleString());
                    
                    console.log("\n✅ Draw is ready for ticket purchases!");
                    console.log(`Use: buyUserDrawTicket(${drawId}, amount)`);
                    
                    return;
                }
            }
        }
        
        // If no event found, try checking recent draws
        console.log("\n📋 Checking recent draws...");
        for (let i = 1; i <= 20; i++) {
            try {
                const draw = await gridotto.getUserDraw(i);
                if (draw.creator === "0x38e456661bc6e95A3aCf3B4673844Cb389b60243") {
                    const startTime = Number(draw.startTime);
                    const now = Math.floor(Date.now() / 1000);
                    
                    // Check if created recently (within last 5 minutes)
                    if (now - startTime < 300) {
                        console.log(`\n✅ Found recently created draw: #${i}`);
                        console.log("- Ticket Price:", ethers.formatEther(draw.ticketPrice), "LYX");
                        console.log("- Created:", new Date(startTime * 1000).toLocaleString());
                        console.log(`Use: buyUserDrawTicket(${i}, amount)`);
                    }
                }
            } catch (e) {
                // Continue
            }
        }
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);