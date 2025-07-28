import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying New BraveUniverse Diamond");
  console.log("=======================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX");

  // Deploy DiamondCutFacet
  console.log("\n1️⃣ Deploying DiamondCutFacet...");
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  const diamondCutAddress = await diamondCutFacet.getAddress();
  console.log("✅ DiamondCutFacet:", diamondCutAddress);

  // Deploy Diamond
  console.log("\n2️⃣ Deploying Diamond...");
  const Diamond = await ethers.getContractFactory("BraveUniverseDiamond");
  
  // Prepare initial facet cut
  const diamondCut = [{
    facetAddress: diamondCutAddress,
    action: 0, // Add
    functionSelectors: [
      diamondCutFacet.interface.getFunction("diamondCut").selector
    ]
  }];
  
  const diamond = await Diamond.deploy(deployer.address, diamondCut);
  await diamond.waitForDeployment();
  const diamondAddress = await diamond.getAddress();
  console.log("✅ Diamond deployed at:", diamondAddress);

  // Get DiamondCut interface for adding more facets
  const diamondCutInterface = await ethers.getContractAt("IDiamondCut", diamondAddress);

  // Deploy and add all facets
  const facets = [
    {
      name: "DiamondLoupeFacet",
      functions: ["facets", "facetFunctionSelectors", "facetAddresses", "facetAddress", "supportsInterface"]
    },
    {
      name: "OwnershipFacet",
      functions: ["transferOwnership", "owner"]
    },
    {
      name: "GridottoCoreV2Facet",
      functions: ["createTokenDraw", "createNFTDraw", "createLYXDraw", "buyTickets", "cancelDraw", "getDrawDetails", "getUserDrawHistory"]
    },
    {
      name: "GridottoExecutionV2Facet",
      functions: ["executeDraw", "canExecuteDraw", "getDrawWinners"]
    },
    {
      name: "GridottoPlatformDrawsFacet",
      functions: ["initializePlatformDraws", "executeWeeklyDraw", "executeMonthlyDraw", "getPlatformDrawsInfo", "getUserMonthlyTickets"]
    },
    {
      name: "GridottoAdminFacetV2",
      functions: ["pauseSystem", "unpauseSystem", "withdrawPlatformFees", "withdrawTokenFees", "updateFeePercentages"]
    },
    {
      name: "GridottoRefundFacet",
      functions: ["claimRefund"]
    },
    {
      name: "GridottoPrizeClaimFacet",
      functions: ["claimPrize", "claimMultiplePrizes", "claimExecutorFees"]
    },
    {
      name: "GridottoLeaderboardFacet",
      functions: ["getLeaderboard", "getUserStats", "getGlobalStats"]
    },
    {
      name: "OracleFacet",
      functions: ["getRandomNumber"]
    }
  ];

  const deployedFacets: any = {
    diamond: diamondAddress,
    DiamondCutFacet: diamondCutAddress
  };

  console.log("\n3️⃣ Deploying and adding facets...");
  
  for (const facetInfo of facets) {
    console.log(`\n🔧 ${facetInfo.name}...`);
    
    try {
      const Facet = await ethers.getContractFactory(facetInfo.name);
      const facet = await Facet.deploy();
      await facet.waitForDeployment();
      const facetAddress = await facet.getAddress();
      console.log(`   ✅ Deployed at: ${facetAddress}`);
      
      // Get selectors
      const selectors: string[] = [];
      for (const funcName of facetInfo.functions) {
        try {
          const selector = facet.interface.getFunction(funcName)?.selector;
          if (selector) {
            selectors.push(selector);
          }
        } catch (e) {
          console.log(`   ⚠️  Function ${funcName} not found`);
        }
      }
      
      if (selectors.length > 0) {
        // Add facet to diamond
        const cut = [{
          facetAddress: facetAddress,
          action: 0, // Add
          functionSelectors: selectors
        }];
        
        const tx = await diamondCutInterface.diamondCut(cut, ethers.ZeroAddress, "0x");
        await tx.wait();
        console.log(`   ✅ Added ${selectors.length} functions to Diamond`);
      }
      
      deployedFacets[facetInfo.name] = facetAddress;
      
    } catch (error: any) {
      console.error(`   ❌ Error with ${facetInfo.name}:`, error.message);
    }
  }

  // Initialize platform draws
  console.log("\n4️⃣ Initializing platform draws...");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", diamondAddress);
    const tx = await platformFacet.initializePlatformDraws();
    await tx.wait();
    console.log("✅ Platform draws initialized!");
    
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("   - Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("   - Monthly Draw ID:", info.monthlyDrawId.toString());
  } catch (error: any) {
    console.error("❌ Platform draws error:", error.message);
  }

  // Save deployment addresses
  console.log("\n5️⃣ Saving deployment info...");
  const deploymentInfo = {
    network: "luksoTestnet",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    ...deployedFacets
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/new");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("✅ Deployment info saved!");

  console.log("\n✨ New Diamond Deployment Complete!");
  console.log("====================================");
  console.log("Diamond Address:", diamondAddress);
  console.log("Total Facets:", Object.keys(deployedFacets).length - 1);
  
  // Test basic functionality
  console.log("\n6️⃣ Testing basic functionality...");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", diamondAddress);
    const drawDetails = await coreFacet.getDrawDetails(1);
    console.log("✅ Can fetch draw details");
    console.log("   - Weekly draw ticket price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
  } catch (error: any) {
    console.error("❌ Test error:", error.message);
  }

  console.log("\n🎉 ALL DONE!");
  console.log("New Diamond is ready at:", diamondAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });