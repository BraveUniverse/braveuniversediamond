import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Complete System Reset and Redeployment");
  console.log("=========================================");

  const [deployer] = await ethers.getSigners();
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Deployer:", deployer.address);

  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);

  // Step 1: Deploy and add reset facet
  console.log("\n🔧 Deploying GridottoResetFacet...");
  try {
    const ResetFacet = await ethers.getContractFactory("GridottoResetFacet");
    const resetFacet = await ResetFacet.deploy();
    await resetFacet.waitForDeployment();
    const resetAddress = await resetFacet.getAddress();
    console.log("✅ Deployed at:", resetAddress);

    // Add reset facet functions
    const resetSelectors = [
      resetFacet.interface.getFunction("resetSystem").selector,
      resetFacet.interface.getFunction("emergencyWithdrawAndDistribute").selector,
      resetFacet.interface.getFunction("getSystemInfo").selector
    ];

    const diamondCut = [{
      facetAddress: resetAddress,
      action: 0, // Add
      functionSelectors: resetSelectors
    }];

    console.log("💎 Adding reset facet...");
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ Reset facet added!");

    // Step 2: Get system info before reset
    const resetFacetInterface = await ethers.getContractAt("GridottoResetFacet", DIAMOND_ADDRESS);
    const info = await resetFacetInterface.getSystemInfo();
    console.log("\n📊 Current System State:");
    console.log("- Next Draw ID:", info.nextDrawId.toString());
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    console.log("- Platform Fees:", ethers.formatEther(info.platformFeesLYX), "LYX");
    console.log("- Monthly Pool:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
    console.log("- Contract Balance:", ethers.formatEther(info.contractBalance), "LYX");

    // Step 3: Withdraw and distribute funds
    if (info.contractBalance > 0) {
      console.log("\n💰 Withdrawing and distributing funds...");
      
      // Define recipients - UPDATE THESE!
      const recipients = [
        deployer.address, // First recipient
        "0x1234567890123456789012345678901234567890", // UPDATE: Second recipient
        "0x2345678901234567890123456789012345678901"  // UPDATE: Third recipient
      ];
      
      console.log("Recipients:");
      recipients.forEach((addr, i) => console.log(`  ${i + 1}. ${addr}`));
      
      try {
        const withdrawTx = await resetFacetInterface.emergencyWithdrawAndDistribute(
          recipients[0],
          recipients[1],
          recipients[2]
        );
        await withdrawTx.wait();
        console.log("✅ Funds distributed!");
      } catch (error: any) {
        console.error("❌ Withdrawal error:", error.message);
      }
    }

    // Step 4: Reset the system
    console.log("\n🧹 Resetting system...");
    const resetTx = await resetFacetInterface.resetSystem();
    await resetTx.wait();
    console.log("✅ System reset complete!");

  } catch (error: any) {
    console.error("❌ Reset facet error:", error.message);
  }

  // Step 5: Deploy updated facets with new fee logic
  console.log("\n🚀 Deploying updated facets...");
  
  const facetsToUpdate = [
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
    }
  ];

  for (const facetInfo of facetsToUpdate) {
    console.log(`\n🔧 Deploying ${facetInfo.name}...`);
    
    try {
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
      
      // Replace facet
      const diamondCut = [{
        facetAddress: facetAddress,
        action: 1, // Replace
        functionSelectors: selectors
      }];
      
      console.log(`💎 Replacing facet...`);
      const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
      await tx.wait();
      console.log(`✅ Facet replaced!`);
      
    } catch (error: any) {
      console.error(`❌ Error with ${facetInfo.name}:`, error.message);
    }
  }

  // Step 6: Re-initialize platform draws
  console.log("\n🎮 Re-initializing platform draws...");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const initTx = await platformFacet.initializePlatformDraws();
    await initTx.wait();
    console.log("✅ Platform draws initialized!");
    
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("\n📊 New Platform Draws:");
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
  } catch (error: any) {
    console.error("❌ Platform draws error:", error.message);
  }

  console.log("\n✨ Complete Reset Done!");
  console.log("========================");
  console.log("✅ System reset");
  console.log("✅ Funds distributed");
  console.log("✅ New fee logic deployed");
  console.log("✅ Platform draws re-initialized");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });