import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying Latest Facets to Correct Diamond");
  console.log("=============================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX");

  // CORRECT DIAMOND ADDRESS
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  console.log("Diamond Address:", DIAMOND_ADDRESS);

  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", DIAMOND_ADDRESS);

  // Get existing facets
  console.log("\n📋 Current facets:");
  const existingFacets = await diamondLoupe.facets();
  console.log(`Found ${existingFacets.length} facets`);

  // Deploy GridottoPlatformDrawsFacet with latest changes
  console.log("\n🔧 Deploying GridottoPlatformDrawsFacet (with monthly draw fix)...");
  try {
    const PlatformDrawsFacet = await ethers.getContractFactory("GridottoPlatformDrawsFacet");
    const platformFacet = await PlatformDrawsFacet.deploy();
    await platformFacet.waitForDeployment();
    const platformAddress = await platformFacet.getAddress();
    console.log("✅ Deployed at:", platformAddress);

    // Get selectors
    const selectors = [
      platformFacet.interface.getFunction("initializePlatformDraws").selector,
      platformFacet.interface.getFunction("executeWeeklyDraw").selector,
      platformFacet.interface.getFunction("executeMonthlyDraw").selector,
      platformFacet.interface.getFunction("getPlatformDrawsInfo").selector,
      platformFacet.interface.getFunction("getUserMonthlyTickets").selector
    ];

    // Replace existing facet
    const diamondCut = [{
      facetAddress: platformAddress,
      action: 1, // Replace
      functionSelectors: selectors
    }];

    console.log("💎 Replacing platform draws facet...");
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ Platform draws facet updated!");
  } catch (error: any) {
    console.error("❌ Error deploying platform draws:", error.message);
  }

  // Check if system is paused and unpause if needed
  console.log("\n🔓 Checking system status...");
  try {
    const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
    const status = await adminFacet.getSystemStatus();
    
    if (status.paused) {
      console.log("System is paused, unpausing...");
      const unpauseTx = await adminFacet.unpauseSystem();
      await unpauseTx.wait();
      console.log("✅ System unpaused!");
    } else {
      console.log("✅ System already active");
    }
  } catch (error: any) {
    console.error("❌ Error checking system status:", error.message);
  }

  // Initialize platform draws with new code
  console.log("\n🎮 Initializing platform draws...");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    // Check current status
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("\nCurrent status:");
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    
    if (info.weeklyDrawId > 0 && info.monthlyDrawId == 0) {
      console.log("\n📅 Monthly draw missing, re-initializing...");
      try {
        const initTx = await platformFacet.initializePlatformDraws();
        await initTx.wait();
        console.log("✅ Platform draws re-initialized!");
      } catch (error: any) {
        console.log("Cannot re-initialize:", error.reason || error.message);
        
        // Try creating monthly draw manually by calling internal function
        // This won't work directly, but the new code should handle it
        console.log("\nThe new deployment should fix this on next weekly execution");
      }
    } else if (info.weeklyDrawId > 0 && info.monthlyDrawId > 0) {
      console.log("✅ Both draws already active!");
    } else {
      console.log("Initializing platform draws...");
      const initTx = await platformFacet.initializePlatformDraws();
      await initTx.wait();
      console.log("✅ Platform draws initialized!");
    }
    
    // Check final status
    const finalInfo = await platformFacet.getPlatformDrawsInfo();
    console.log("\n📊 Final Platform Draws Status:");
    console.log("- Weekly Draw ID:", finalInfo.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", finalInfo.monthlyDrawId.toString());
    console.log("- Weekly End:", new Date(Number(finalInfo.weeklyEndTime) * 1000).toLocaleString());
    console.log("- Monthly End:", finalInfo.monthlyEndTime > 0 ? new Date(Number(finalInfo.monthlyEndTime) * 1000).toLocaleString() : "Not set");
    console.log("- Monthly Pool:", ethers.formatEther(finalInfo.monthlyPoolBalance), "LYX");
    
  } catch (error: any) {
    console.error("❌ Error with platform draws:", error.message);
  }

  // Test functionality
  console.log("\n🧪 Testing functionality...");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    if (info.weeklyDrawId > 0) {
      // Buy a ticket
      const ticketPrice = ethers.parseEther("0.25");
      console.log("Buying 1 weekly ticket...");
      const buyTx = await coreFacet.buyTickets(info.weeklyDrawId, 1, { value: ticketPrice });
      await buyTx.wait();
      console.log("✅ Ticket purchased!");
      
      // Check monthly tickets
      const tickets = await platformFacet.getUserMonthlyTickets(deployer.address);
      console.log("\n🎫 Monthly tickets:");
      console.log("- From weekly:", tickets.fromWeekly.toString());
      console.log("- Total:", tickets.total.toString());
    }
  } catch (error: any) {
    console.error("❌ Test error:", error.message);
  }

  // Update deployment record
  console.log("\n📝 Updating deployment record...");
  const deploymentLog = {
    timestamp: new Date().toISOString(),
    diamond: DIAMOND_ADDRESS,
    deployer: deployer.address,
    action: "Updated GridottoPlatformDrawsFacet with monthly draw fix",
    network: "luksoTestnet"
  };
  
  console.log(JSON.stringify(deploymentLog, null, 2));

  console.log("\n✨ Deployment Complete!");
  console.log("========================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });