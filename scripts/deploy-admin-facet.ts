import { ethers } from "hardhat";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🛠️  Deploying AdminFacet\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("💎 Diamond:", addresses.diamond);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX\n");
    
    // Deploy AdminFacet
    console.log("=== Deploying AdminFacet ===");
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const adminFacet = await AdminFacet.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("✅ AdminFacet deployed:", adminFacetAddress);
    
    // Get function selectors
    const adminSelectors = [
        // Platform Management
        adminFacet.interface.getFunction("setPlatformFeePercent").selector,
        adminFacet.interface.getFunction("setMaxTicketsPerDraw").selector,
        adminFacet.interface.getFunction("setMinDrawDuration").selector,
        adminFacet.interface.getFunction("setLSP26Address").selector,
        adminFacet.interface.getFunction("setExecutorRewardConfig").selector,
        
        // Financial Management
        adminFacet.interface.getFunction("getPlatformStats").selector,
        adminFacet.interface.getFunction("getTokenStats").selector,
        
        // Draw Management
        adminFacet.interface.getFunction("cancelDrawAsAdmin").selector,
        adminFacet.interface.getFunction("extendDrawDuration").selector,
        adminFacet.interface.getFunction("setMinParticipants").selector,
        
        // Access Control
        adminFacet.interface.getFunction("blacklistAddress").selector,
        adminFacet.interface.getFunction("whitelistAddress").selector,
        adminFacet.interface.getFunction("isBlacklisted").selector,
        adminFacet.interface.getFunction("banUser").selector,
        adminFacet.interface.getFunction("unbanUser").selector,
        adminFacet.interface.getFunction("isBanned").selector,
        
        // User Management
        adminFacet.interface.getFunction("setUserDrawLimit").selector,
        adminFacet.interface.getFunction("setGlobalDrawLimit").selector,
        adminFacet.interface.getFunction("getUserActivity").selector,
        
        // VIP Management
        adminFacet.interface.getFunction("setVIPTierDiscounts").selector,
        adminFacet.interface.getFunction("setVIPTierBonusTickets").selector,
        
        // Feature Toggles
        adminFacet.interface.getFunction("enableFeature").selector,
        adminFacet.interface.getFunction("disableFeature").selector,
        adminFacet.interface.getFunction("isFeatureEnabled").selector,
        
        // Emergency Functions
        adminFacet.interface.getFunction("emergencyPauseAllDraws").selector,
        adminFacet.interface.getFunction("emergencyResumeAllDraws").selector,
        adminFacet.interface.getFunction("emergencyWithdrawToken").selector
    ];
    
    console.log(`\n✅ Found ${adminSelectors.length} admin functions`);
    
    // Add AdminFacet to Diamond
    console.log("\n=== Adding AdminFacet to Diamond ===");
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", addresses.diamond);
    
    const diamondCut = [{
        facetAddress: adminFacetAddress,
        action: 0, // Add
        functionSelectors: adminSelectors
    }];
    
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ AdminFacet added to Diamond");
    
    // Test basic admin functions
    console.log("\n=== Testing Admin Functions ===");
    const adminContract = await ethers.getContractAt("AdminFacet", addresses.diamond);
    
    // Set platform fee to 3%
    await adminContract.setPlatformFeePercent(3);
    console.log("✅ Set platform fee to 3%");
    
    // Set executor reward to 3% max 3 LYX
    await adminContract.setExecutorRewardConfig(3, ethers.parseEther("3"));
    console.log("✅ Set executor reward: 3% max 3 LYX");
    
    // Get platform stats
    const stats = await adminContract.getPlatformStats();
    console.log("\n📊 Platform Stats:");
    console.log("Total Volume:", ethers.formatEther(stats.totalVolume), "LYX");
    console.log("Total Profit:", ethers.formatEther(stats.totalProfit), "LYX");
    console.log("Active Draws:", stats.activeDraws.toString());
    console.log("Completed Draws:", stats.completedDraws.toString());
    console.log("Total Users:", stats.totalUsers.toString());
    
    // Update addresses.json
    const fs = require("fs");
    const updatedAddresses = {
        ...addresses,
        adminFacet: adminFacetAddress
    };
    
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(updatedAddresses, null, 2)
    );
    
    console.log("\n✅ AdminFacet deployment complete!");
    console.log("📝 Updated addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });