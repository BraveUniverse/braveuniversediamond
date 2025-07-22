import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging Draw Data...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const drawId = 20; // Last created draw
    
    // Get contracts
    const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
    const viewFacet = await ethers.getContractAt("GridottoViewFacet", diamondAddress);
    
    try {
        // Get draw data
        const draw = await mainFacet.getUserDraw(drawId);
        
        console.log("getUserDraw result:");
        console.log("- creator:", draw.creator);
        console.log("- drawType:", draw.drawType);
        console.log("- ticketPrice:", draw.ticketPrice, "=", ethers.formatEther(draw.ticketPrice), "LYX");
        console.log("- ticketsSold:", draw.ticketsSold);
        console.log("- maxTickets:", draw.maxTickets);
        console.log("- currentPrizePool:", draw.currentPrizePool);
        console.log("- endTime:", draw.endTime);
        console.log("- isCompleted:", draw.isCompleted);
        
        // Get timing info
        const [startTime, endTime, isActive] = await viewFacet.getDrawTiming(drawId);
        console.log("\ngetDrawTiming result:");
        console.log("- startTime:", startTime);
        console.log("- endTime:", endTime);
        console.log("- isActive:", isActive);
        
        // Compare values
        console.log("\n⚠️  Issues found:");
        console.log("- ticketPrice shows as:", ethers.formatEther(draw.ticketPrice), "LYX");
        console.log("- maxTickets shows as:", draw.maxTickets);
        console.log("- These values seem swapped!");
        
        console.log("\n📝 Likely cause: Storage struct field order mismatch");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);