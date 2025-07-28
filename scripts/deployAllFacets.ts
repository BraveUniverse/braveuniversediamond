import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Complete Facets Deployment");
  console.log("=============================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX");

  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  console.log("Diamond Address:", DIAMOND_ADDRESS);

  // Get DiamondCutFacet and DiamondLoupe
  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", DIAMOND_ADDRESS);

  // Track deployed facets
  const deployedFacets: any = {};

  // Define all facets to deploy
  const facetsToCheck = [
    {
      name: "GridottoCoreV2Facet",
      functions: [
        "createTokenDraw(address,uint256,uint256,uint256,uint256,uint256,uint256)",
        "createNFTDraw(address,bytes32[],uint256,uint256,uint256,uint256,uint256)",
        "createLYXDraw(uint256,uint256,uint256,uint256,uint256)",
        "buyTickets(uint256,uint256)",
        "cancelDraw(uint256)",
        "getDrawDetails(uint256)",
        "getUserDrawHistory(address)"
      ]
    },
    {
      name: "GridottoExecutionV2Facet",
      functions: [
        "executeDraw(uint256)",
        "canExecuteDraw(uint256)",
        "getDrawWinners(uint256)"
      ]
    },
    {
      name: "GridottoAdminFacetV2",
      functions: [
        "pauseSystem()",
        "unpauseSystem()",
        "withdrawPlatformFees()",
        "withdrawTokenFees(address)",
        "updateFeePercentages(uint256,uint256,uint256,uint256)",
        "emergencyWithdraw(address,uint256)",
        "getSystemStatus()",
        "getPlatformStats()"
      ]
    },
    {
      name: "GridottoRefundFacet",
      functions: [
        "claimRefund(uint256)",
        "getRefundableAmount(uint256,address)"
      ]
    },
    {
      name: "GridottoPrizeClaimFacet",
      functions: [
        "claimPrize(uint256)",
        "claimMultiplePrizes(uint256[])",
        "claimExecutorFees()",
        "getClaimableDraws(address)",
        "getClaimableExecutorFees(address)"
      ]
    },
    {
      name: "GridottoLeaderboardFacet",
      functions: [
        "getTopWinners(uint256)",
        "getTopTicketBuyers(uint256)",
        "getTopDrawCreators(uint256)",
        "getTopExecutors(uint256)",
        "getPlatformStats()",
        "getUserStats(address)"
      ]
    }
  ];

  console.log("\n📋 Checking existing facets...");
  const existingFacets = await diamondLoupe.facets();
  console.log(`Found ${existingFacets.length} existing facets`);

  // Deploy each missing facet
  for (const facetInfo of facetsToCheck) {
    console.log(`\n🔧 Processing ${facetInfo.name}...`);
    
    try {
      // Check if facet exists by trying to get first function
      const testFunction = facetInfo.functions[0];
      const factory = await ethers.getContractFactory(facetInfo.name);
      const testSelector = factory.interface.getFunction(testFunction.split("(")[0])?.selector;
      
      let facetExists = false;
      for (const existingFacet of existingFacets) {
        if (existingFacet.functionSelectors.includes(testSelector)) {
          console.log(`✅ ${facetInfo.name} already deployed at ${existingFacet.facetAddress}`);
          facetExists = true;
          deployedFacets[facetInfo.name] = existingFacet.facetAddress;
          break;
        }
      }
      
      if (!facetExists) {
        console.log(`📦 Deploying ${facetInfo.name}...`);
        const Facet = await ethers.getContractFactory(facetInfo.name);
        const facet = await Facet.deploy();
        await facet.waitForDeployment();
        const facetAddress = await facet.getAddress();
        console.log(`✅ Deployed at: ${facetAddress}`);
        
        // Get selectors
        const selectors: string[] = [];
        for (const func of facetInfo.functions) {
          const funcName = func.split("(")[0];
          const selector = facet.interface.getFunction(funcName)?.selector;
          if (selector) {
            selectors.push(selector);
          }
        }
        
        console.log(`📍 Adding ${selectors.length} functions to diamond...`);
        
        // Add to diamond
        const diamondCut = [{
          facetAddress: facetAddress,
          action: 0, // Add
          functionSelectors: selectors
        }];
        
        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        await tx.wait();
        console.log(`✅ Added to diamond!`);
        
        deployedFacets[facetInfo.name] = facetAddress;
      }
    } catch (error: any) {
      console.error(`❌ Error with ${facetInfo.name}:`, error.message);
    }
  }

  // Update deployment addresses
  console.log("\n📝 Updating deployment addresses...");
  const addressesPath = './deployments/staging/addresses.json';
  try {
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    Object.assign(addresses, deployedFacets);
    addresses.lastUpdated = new Date().toISOString();
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("✅ Addresses updated");
  } catch (error) {
    console.log("⚠️  Could not update addresses file");
  }

  // Final verification
  console.log("\n🔍 Final Verification:");
  console.log("======================");
  
  try {
    // Test GridottoCoreV2Facet
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const drawDetails = await coreFacet.getDrawDetails(1);
    console.log("✅ GridottoCoreV2Facet working - Draw 1 type:", drawDetails.drawType);
  } catch (error) {
    console.log("❌ GridottoCoreV2Facet not working");
  }
  
  try {
    // Test Platform Draws
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("✅ Platform Draws - Weekly:", info.weeklyDrawId.toString(), "Monthly:", info.monthlyDrawId.toString());
  } catch (error) {
    console.log("❌ Platform Draws not working");
  }

  console.log("\n✨ Deployment Complete!");
  console.log("========================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });