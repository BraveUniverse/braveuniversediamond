import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 BraveUniverse Diamond - Complete Deployment");
  console.log("==============================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX");

  // CORRECT DIAMOND ADDRESS
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  console.log("Diamond Address (CORRECT):", DIAMOND_ADDRESS);

  // Get DiamondCutFacet and DiamondLoupe
  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", DIAMOND_ADDRESS);

  // Check current facets
  console.log("\n📋 Checking current facets...");
  const existingFacets = await diamondLoupe.facets();
  console.log(`Found ${existingFacets.length} existing facets`);

  // List all facets to deploy
  const facetsToDeployOrUpdate = [
    {
      name: "GridottoCoreV2Facet",
      functions: [
        "createTokenDraw",
        "createNFTDraw", 
        "createLYXDraw",
        "buyTickets",
        "cancelDraw",
        "getDrawDetails",
        "getUserDrawHistory"
      ]
    },
    {
      name: "GridottoExecutionV2Facet",
      functions: [
        "executeDraw",
        "canExecuteDraw",
        "getDrawWinners"
      ]
    },
    {
      name: "GridottoPlatformDrawsFacet",
      functions: [
        "initializePlatformDraws",
        "executeWeeklyDraw",
        "executeMonthlyDraw",
        "getPlatformDrawsInfo",
        "getUserMonthlyTickets"
      ]
    },
    {
      name: "GridottoAdminFacetV2",
      functions: [
        "pauseSystem",
        "unpauseSystem",
        "withdrawPlatformFees",
        "withdrawTokenFees",
        "updateFeePercentages"
      ]
    },
    {
      name: "GridottoRefundFacet",
      functions: [
        "claimRefund"
      ]
    },
    {
      name: "GridottoPrizeClaimFacet",
      functions: [
        "claimPrize",
        "claimMultiplePrizes",
        "claimExecutorFees"
      ]
    }
  ];

  const deployedFacets: any = {};

  // Deploy each facet
  for (const facetInfo of facetsToDeployOrUpdate) {
    console.log(`\n🔧 Processing ${facetInfo.name}...`);
    
    try {
      // Deploy the facet
      console.log(`📦 Deploying ${facetInfo.name}...`);
      const Facet = await ethers.getContractFactory(facetInfo.name);
      const facet = await Facet.deploy();
      await facet.waitForDeployment();
      const facetAddress = await facet.getAddress();
      console.log(`✅ Deployed at: ${facetAddress}`);
      
      // Get selectors
      const selectors: string[] = [];
      for (const funcName of facetInfo.functions) {
        const selector = facet.interface.getFunction(funcName)?.selector;
        if (selector) {
          selectors.push(selector);
        }
      }
      
      console.log(`📍 Found ${selectors.length} selectors`);
      
      // Check if we need to replace or add
      let action = 0; // Add
      let existingAddress = "";
      
      // Check if any selector already exists
      for (const existingFacet of existingFacets) {
        for (const selector of selectors) {
          if (existingFacet.functionSelectors.includes(selector)) {
            action = 1; // Replace
            existingAddress = existingFacet.facetAddress;
            console.log(`🔄 Will REPLACE existing facet at ${existingAddress}`);
            break;
          }
        }
        if (action === 1) break;
      }
      
      // Prepare diamond cut
      const diamondCut = [{
        facetAddress: facetAddress,
        action: action,
        functionSelectors: selectors
      }];
      
      console.log(`💎 Executing diamond cut (${action === 0 ? 'ADD' : 'REPLACE'})...`);
      const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
      await tx.wait();
      console.log(`✅ Diamond cut successful!`);
      
      deployedFacets[facetInfo.name] = facetAddress;
      
    } catch (error: any) {
      console.error(`❌ Error with ${facetInfo.name}:`, error.message);
    }
  }

  // Initialize platform draws
  console.log("\n🎮 Initializing Platform Draws...");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    // Check if already initialized
    const info = await platformFacet.getPlatformDrawsInfo();
    if (info.weeklyDrawId > 0 || info.monthlyDrawId > 0) {
      console.log("✅ Platform draws already initialized!");
      console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
      console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    } else {
      console.log("📝 Initializing platform draws...");
      const initTx = await platformFacet.initializePlatformDraws();
      await initTx.wait();
      console.log("✅ Platform draws initialized!");
      
      const newInfo = await platformFacet.getPlatformDrawsInfo();
      console.log("- Weekly Draw ID:", newInfo.weeklyDrawId.toString());
      console.log("- Monthly Draw ID:", newInfo.monthlyDrawId.toString());
    }
  } catch (error: any) {
    console.error("❌ Error initializing platform draws:", error.message);
  }

  // Update deployment addresses
  console.log("\n📝 Updating deployment addresses...");
  const addressesPath = './deployments/staging/addresses.json';
  try {
    let addresses: any = {};
    if (fs.existsSync(addressesPath)) {
      addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    }
    
    addresses.diamond = DIAMOND_ADDRESS;
    Object.assign(addresses, deployedFacets);
    addresses.lastUpdated = new Date().toISOString();
    addresses.network = "luksoTestnet";
    
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("✅ Addresses updated");
  } catch (error) {
    console.log("⚠️  Could not update addresses file");
  }

  // Final verification
  console.log("\n🔍 Final Verification:");
  console.log("======================");
  
  // List all facets
  const finalFacets = await diamondLoupe.facets();
  console.log(`Total facets: ${finalFacets.length}`);
  
  // Test core functionality
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    console.log("✅ GridottoCoreV2Facet accessible");
  } catch (error) {
    console.log("❌ GridottoCoreV2Facet not accessible");
  }
  
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("✅ Platform Draws - Weekly:", info.weeklyDrawId.toString(), "Monthly:", info.monthlyDrawId.toString());
  } catch (error) {
    console.log("❌ Platform Draws not accessible");
  }

  console.log("\n✨ Deployment Complete!");
  console.log("======================");
  console.log("Diamond Address:", DIAMOND_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });