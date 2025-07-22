import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging Ticket Purchase...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const drawId = 23; // Last created draw
    
    // Get contracts
    const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    const fixedView = await ethers.getContractAt("GridottoFixedViewFacet", diamondAddress);
    
    try {
        // Get draw data with fixed view
        const drawData = await fixedView.getUserDrawFixed(drawId);
        console.log("Fixed View Data:");
        console.log("- Start Time:", Number(drawData.startTime));
        console.log("- End Time:", Number(drawData.endTime));
        console.log("- Start Date:", new Date(Number(drawData.startTime) * 1000).toLocaleString());
        console.log("- End Date:", new Date(Number(drawData.endTime) * 1000).toLocaleString());
        
        // Check current time
        const currentTime = Math.floor(Date.now() / 1000);
        console.log("\nCurrent Time:", currentTime);
        console.log("Current Date:", new Date(currentTime * 1000).toLocaleString());
        
        // Check if active
        const [isActive, reason] = await fixedView.isDrawActive(drawId);
        console.log("\nIs Active:", isActive);
        console.log("Reason:", reason);
        
        // Time comparisons
        console.log("\nTime Comparisons:");
        console.log("- Current >= Start:", currentTime >= Number(drawData.startTime));
        console.log("- Current < End:", currentTime < Number(drawData.endTime));
        
        // Try to understand the issue
        const oldDraw = await mainFacet.getUserDraw(drawId);
        console.log("\nOld getUserDraw endTime:", oldDraw.endTime);
        console.log("This is likely 0 or wrong value");
        
        console.log("\n⚠️  ISSUE: buyUserDrawTicket is reading from storage incorrectly");
        console.log("The function checks draw.endTime which might be reading wrong field");
        console.log("Solution: Create a fixed buyTicket function or update the existing one");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);