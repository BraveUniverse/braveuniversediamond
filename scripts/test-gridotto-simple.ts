import { ethers } from "hardhat";

async function main() {
    console.log("Testing GridottoFacet on LUKSO Testnet (Simple Test)...\n");
    
    // Diamond address on testnet
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with deployer account:", deployer.address);
    
    // Get GridottoFacet instance
    const gridotto = await ethers.getContractAt("GridottoFacet", DIAMOND_ADDRESS);
    
    // Get initial state
    console.log("\n=== Initial State ===");
    let drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("Current Draw Number:", drawInfo.drawNumber.toString());
    console.log("Current Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    console.log("Total Tickets Sold:", drawInfo.ticketsSold.toString());
    console.log("Next Draw Time:", new Date(Number(drawInfo.drawTime) * 1000).toLocaleString());
    
    // Default ticket price is 0.1 LYX
    const ticketPrice = ethers.parseEther("0.1");
    
    // Test 1: Buy tickets
    console.log("\n=== Test 1: Buying 5 tickets ===");
    try {
        const buyTx = await gridotto.buyTicket(deployer.address, 5, {
            value: ticketPrice * 5n
        });
        const receipt = await buyTx.wait();
        console.log("✓ Bought 5 tickets - Tx:", receipt.hash);
        
        // Check updated draw info
        drawInfo = await gridotto.getCurrentDrawInfo();
        console.log("Tickets sold after purchase:", drawInfo.ticketsSold.toString());
    } catch (error: any) {
        console.log("Error buying tickets:", error.message);
    }
    
    // Check updated state
    console.log("\n=== Updated State ===");
    drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("Total Tickets Sold:", drawInfo.ticketsSold.toString());
    console.log("Updated Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    
    // Note: getDrawParticipants is for user draws, not official draws
    console.log("\n=== Draw Status ===");
    console.log("Draw is active with", drawInfo.ticketsSold.toString(), "tickets sold");
    
    // Check pending prize
    console.log("\n=== Checking Pending Prize ===");
    const pendingPrize = await gridotto.getPendingPrize(deployer.address);
    console.log("Deployer pending prize:", ethers.formatEther(pendingPrize), "LYX");
    
    // Test manual draw (if owner)
    console.log("\n=== Test Manual Draw ===");
    try {
        console.log("Attempting manual draw...");
        const drawTx = await gridotto.manualDraw();
        const receipt = await drawTx.wait();
        console.log("✓ Draw executed - Tx:", receipt.hash);
        
        // Find DrawCompleted event
        const drawCompletedEvent = receipt.logs.find(
            (log: any) => log.fragment?.name === "DrawCompleted"
        );
        
        if (drawCompletedEvent) {
            console.log("Winner:", drawCompletedEvent.args[1]);
            console.log("Prize Amount:", ethers.formatEther(drawCompletedEvent.args[2]), "LYX");
        }
    } catch (error: any) {
        console.log("Manual draw failed:", error.message);
        console.log("This is expected if draw time hasn't passed");
    }
    
    // Final state
    console.log("\n=== Final State ===");
    drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("Draw Number:", drawInfo.drawNumber.toString());
    console.log("Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    console.log("Next Draw Time:", new Date(Number(drawInfo.drawTime) * 1000).toLocaleString());
    
    // Contract info
    console.log("\n=== Contract Info ===");
    console.log("Diamond Address:", DIAMOND_ADDRESS);
    console.log("Explorer:", `https://explorer.execution.testnet.lukso.network/address/${DIAMOND_ADDRESS}`);
    
    console.log("\n✅ Test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });