import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Checking functions in Diamond...\n");

    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    console.log("Testing getNextDrawId...");
    try {
        const nextDrawId = await admin.getNextDrawId();
        console.log("✅ getNextDrawId works! Result:", nextDrawId.toString());
    } catch (error: any) {
        console.log("❌ getNextDrawId failed:", error.message);
    }
    
    console.log("\nTesting getPlatformStatistics...");
    try {
        const stats = await admin.getPlatformStatistics();
        console.log("✅ getPlatformStatistics works!");
        console.log("- Total Draws:", stats.totalDrawsCreated.toString());
        console.log("- Total Tickets:", stats.totalTicketsSold.toString());
        console.log("- Platform Fees:", ethers.formatEther(stats.platformFeesLYX), "LYX");
        console.log("- Monthly Pool:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
        console.log("- Current Weekly Draw:", stats.currentWeeklyDrawId.toString());
        console.log("- Current Monthly Draw:", stats.currentMonthlyDrawId.toString());
    } catch (error: any) {
        console.log("❌ getPlatformStatistics failed:", error.message);
    }
    
    // Check with DiamondLoupe
    console.log("\n🔍 Checking with DiamondLoupe...");
    const loupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    
    // Get all facets
    const facets = await loupe.facets();
    console.log("\nTotal facets:", facets.length);
    
    // Find admin facet
    for (const facet of facets) {
        const selectors = facet.functionSelectors;
        
        // Check if it has admin functions
        const adminInterface = admin.interface;
        let hasAdminFunctions = false;
        
        for (const selector of selectors) {
            try {
                const func = adminInterface.getFunction(selector);
                if (func.name === "getNextDrawId" || func.name === "getPlatformStatistics") {
                    hasAdminFunctions = true;
                    console.log(`Found ${func.name} in facet ${facet.facetAddress}`);
                }
            } catch {}
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });