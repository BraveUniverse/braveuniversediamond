import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Testing UI Functions\n");

    // Use the combined Diamond ABI
    const Diamond = await ethers.getContractAt("GridottoDiamond", DIAMOND_ADDRESS);
    
    console.log("1. Testing getNextDrawId()...");
    try {
        const nextDrawId = await Diamond.getNextDrawId();
        console.log("✅ Next Draw ID:", nextDrawId.toString());
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }

    console.log("\n2. Testing getPlatformStatistics()...");
    try {
        const stats = await Diamond.getPlatformStatistics();
        console.log("✅ Platform Statistics:");
        console.log("   - Total Draws:", stats.totalDrawsCreated.toString());
        console.log("   - Total Tickets:", stats.totalTicketsSold.toString());
        console.log("   - Total Prizes:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("   - Total Executions:", stats.totalExecutions.toString());
        console.log("   - Platform Fees:", ethers.formatEther(stats.platformFeesLYX), "LYX");
        console.log("   - Monthly Pool:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
        console.log("   - Current Weekly Draw:", stats.currentWeeklyDrawId.toString());
        console.log("   - Current Monthly Draw:", stats.currentMonthlyDrawId.toString());
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }

    console.log("\n3. Testing getSystemStats()...");
    try {
        const sysStats = await Diamond.getSystemStats();
        console.log("✅ System Stats:");
        console.log("   - Total Draws:", sysStats.totalDrawsCreated.toString());
        console.log("   - Total Tickets:", sysStats.totalTicketsSold.toString());
        console.log("   - Total Prizes:", ethers.formatEther(sysStats.totalPrizesDistributed), "LYX");
        console.log("   - Total Executions:", sysStats.totalExecutions.toString());
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }

    console.log("\n📋 For UI Integration:");
    console.log("```javascript");
    console.log("// Using ethers.js v6");
    console.log("import { ethers } from 'ethers';");
    console.log("import GridottoDiamondABI from './abis/GridottoDiamond.json';");
    console.log("");
    console.log("const DIAMOND_ADDRESS = '0x5Ad808FAE645BA3682170467114e5b80A70bF276';");
    console.log("");
    console.log("// Initialize contract");
    console.log("const provider = new ethers.BrowserProvider(window.ethereum);");
    console.log("const signer = await provider.getSigner();");
    console.log("const diamond = new ethers.Contract(DIAMOND_ADDRESS, GridottoDiamondABI, signer);");
    console.log("");
    console.log("// Call functions");
    console.log("const nextDrawId = await diamond.getNextDrawId();");
    console.log("const stats = await diamond.getPlatformStatistics();");
    console.log("```");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });