import { ethers } from "hardhat";

async function main() {
  console.log("🚀 GridottoPlatformDrawsFacet Update Deployment");
  console.log("================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Diamond address from deployment
  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  console.log("Diamond Address:", DIAMOND_ADDRESS);

  // Check current state
  console.log("\n📋 Checking current platform draws state...");
  try {
    const platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const info = await platformDrawsFacet.getPlatformDrawsInfo();
    console.log("Platform draws already deployed!");
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    
    // If already initialized, we need to update the facet
    console.log("\n⚠️  Platform draws facet exists, will update it...");
  } catch (error) {
    console.log("Platform draws facet not found, will add it...");
  }

  // Deploy new facet
  console.log("\n📦 Deploying new GridottoPlatformDrawsFacet...");
  const GridottoPlatformDrawsFacet = await ethers.getContractFactory("GridottoPlatformDrawsFacet");
  const newFacet = await GridottoPlatformDrawsFacet.deploy();
  await newFacet.waitForDeployment();
  const newFacetAddress = await newFacet.getAddress();
  console.log("✅ New facet deployed at:", newFacetAddress);

  // Get DiamondCutFacet
  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);

  // Get function selectors
  const selectors = [
    newFacet.interface.getFunction("initializePlatformDraws").selector,
    newFacet.interface.getFunction("executeWeeklyDraw").selector,
    newFacet.interface.getFunction("executeMonthlyDraw").selector,
    newFacet.interface.getFunction("getPlatformDrawsInfo").selector,
    newFacet.interface.getFunction("getUserMonthlyTickets").selector
  ];

  console.log("\n🔧 Function selectors:");
  selectors.forEach((selector, index) => {
    console.log(`  ${index + 1}. ${selector}`);
  });

  // Check if we need to add or replace
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", DIAMOND_ADDRESS);
  const facets = await diamondLoupe.facets();
  
  let action = 0; // Add
  let existingFacetAddress = "";
  
  for (const facet of facets) {
    const facetSelectors = await diamondLoupe.facetFunctionSelectors(facet.facetAddress);
    if (facetSelectors.includes(selectors[0])) {
      action = 1; // Replace
      existingFacetAddress = facet.facetAddress;
      console.log("\n🔄 Found existing facet at:", existingFacetAddress);
      console.log("Will REPLACE with new implementation");
      break;
    }
  }

  // Prepare diamond cut
  const diamondCut = [{
    facetAddress: newFacetAddress,
    action: action,
    functionSelectors: selectors
  }];

  console.log("\n💎 Executing diamond cut...");
  console.log("Action:", action === 0 ? "ADD" : "REPLACE");
  
  try {
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Diamond cut successful!");
  } catch (error: any) {
    console.error("❌ Diamond cut failed:", error.message);
    return;
  }

  // Initialize or check platform draws
  console.log("\n🎮 Checking platform draws initialization...");
  const platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
  
  try {
    const info = await platformDrawsFacet.getPlatformDrawsInfo();
    
    if (info.weeklyDrawId > 0 && info.monthlyDrawId > 0) {
      console.log("✅ Platform draws already initialized!");
      console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
      console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
      console.log("- Weekly End:", new Date(Number(info.weeklyEndTime) * 1000).toLocaleString());
      console.log("- Monthly End:", new Date(Number(info.monthlyEndTime) * 1000).toLocaleString());
    } else if (info.weeklyDrawId > 0 && info.monthlyDrawId == 0) {
      console.log("⚠️  Only weekly draw active, monthly draw missing!");
      console.log("This might be the old system. Consider manual intervention.");
    } else {
      console.log("📝 Platform draws not initialized, initializing now...");
      const initTx = await platformDrawsFacet.initializePlatformDraws();
      await initTx.wait();
      console.log("✅ Platform draws initialized!");
      
      const newInfo = await platformDrawsFacet.getPlatformDrawsInfo();
      console.log("- Weekly Draw ID:", newInfo.weeklyDrawId.toString());
      console.log("- Monthly Draw ID:", newInfo.monthlyDrawId.toString());
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }

  // Update deployment addresses
  console.log("\n📝 Updating deployment addresses...");
  const fs = require('fs');
  const deploymentPath = './deployments/staging/addresses.json';
  
  try {
    const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    addresses.gridottoPlatformDrawsFacet = newFacetAddress;
    addresses.lastUpdated = new Date().toISOString();
    fs.writeFileSync(deploymentPath, JSON.stringify(addresses, null, 2));
    console.log("✅ Deployment addresses updated");
  } catch (error) {
    console.log("⚠️  Could not update deployment addresses");
  }

  console.log("\n✨ Deployment complete!");
  console.log("================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });