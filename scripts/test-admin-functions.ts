import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🧪 Testing Admin Functions\n");

    const [signer] = await ethers.getSigners();
    
    // Get admin facet
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);

    console.log("Testing getNextDrawId()...");
    try {
        const nextDrawId = await admin.getNextDrawId();
        console.log("✅ Next Draw ID:", nextDrawId.toString());
    } catch (error: any) {
        console.log("❌ getNextDrawId() failed:", error.message);
    }

    console.log("\nTesting getPlatformStatistics()...");
    try {
        const stats = await admin.getPlatformStatistics();
        console.log("✅ Platform Statistics:");
        console.log("   - Total draws created:", stats.totalDrawsCreated.toString());
        console.log("   - Total tickets sold:", stats.totalTicketsSold.toString());
        console.log("   - Total prizes distributed:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("   - Total executions:", stats.totalExecutions.toString());
        console.log("   - Platform fees (LYX):", ethers.formatEther(stats.platformFeesLYX), "LYX");
        console.log("   - Monthly pool balance:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
        console.log("   - Current weekly draw ID:", stats.currentWeeklyDrawId.toString());
        console.log("   - Current monthly draw ID:", stats.currentMonthlyDrawId.toString());
    } catch (error: any) {
        console.log("❌ getPlatformStatistics() failed:", error.message);
    }

    console.log("\nTesting getSystemStats()...");
    try {
        const systemStats = await admin.getSystemStats();
        console.log("✅ System Stats:");
        console.log("   - Total draws:", systemStats.totalDrawsCreated.toString());
        console.log("   - Total tickets:", systemStats.totalTicketsSold.toString());
        console.log("   - Total prizes:", ethers.formatEther(systemStats.totalPrizesDistributed), "LYX");
        console.log("   - Total executions:", systemStats.totalExecutions.toString());
    } catch (error: any) {
        console.log("❌ getSystemStats() failed:", error.message);
    }

    // Check which functions are available
    console.log("\n📋 Checking available functions in Diamond...");
    const loupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    const facets = await loupe.facets();
    
    for (const facet of facets) {
        // Find admin facet
        if (facet.functionSelectors.includes("0xdc1d4fb7")) { // pauseSystem
            console.log("\nAdmin Facet:", facet.facetAddress);
            console.log("Function selectors:");
            
            // Map selectors to function names
            const adminInterface = admin.interface;
            for (const selector of facet.functionSelectors) {
                try {
                    const fragment = adminInterface.getFunction(selector);
                    console.log(`  - ${selector}: ${fragment.name}`);
                } catch {
                    console.log(`  - ${selector}: Unknown function`);
                }
            }
            break;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });