import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Fee-Fixed Facets");
  console.log("==============================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX");

  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  console.log("Diamond Address:", DIAMOND_ADDRESS);

  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);

  // Deploy updated facets
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

  // Test the fix
  console.log("\n🧪 Testing fee deduction...");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("\n📊 Current Draws:");
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    
    if (info.weeklyDrawId > 0) {
      // Get draw details before
      const drawBefore = await coreFacet.getDrawDetails(info.weeklyDrawId);
      console.log("\n📋 Before Purchase:");
      console.log("- Prize Pool:", ethers.formatEther(drawBefore.prizePool), "LYX");
      console.log("- Tickets Sold:", drawBefore.ticketsSold.toString());
      
      // Buy 2 tickets for 0.50 LYX
      const ticketPrice = ethers.parseEther("0.25");
      const totalCost = ticketPrice * 2n;
      console.log("\n🎟️  Buying 2 tickets for", ethers.formatEther(totalCost), "LYX...");
      
      const tx = await coreFacet.buyTickets(info.weeklyDrawId, 2, { value: totalCost });
      await tx.wait();
      console.log("✅ Tickets purchased!");
      
      // Get draw details after
      const drawAfter = await coreFacet.getDrawDetails(info.weeklyDrawId);
      const prizeIncrease = drawAfter.prizePool - drawBefore.prizePool;
      
      console.log("\n📋 After Purchase:");
      console.log("- Prize Pool:", ethers.formatEther(drawAfter.prizePool), "LYX");
      console.log("- Prize Pool Increase:", ethers.formatEther(prizeIncrease), "LYX");
      console.log("- Tickets Sold:", drawAfter.ticketsSold.toString());
      
      // Calculate expected increase (70% of 0.50 = 0.35)
      const expectedIncrease = (totalCost * 70n) / 100n;
      console.log("\n📊 Fee Analysis:");
      console.log("- Total Paid:", ethers.formatEther(totalCost), "LYX");
      console.log("- Expected Prize Increase (70%):", ethers.formatEther(expectedIncrease), "LYX");
      console.log("- Actual Prize Increase:", ethers.formatEther(prizeIncrease), "LYX");
      
      if (prizeIncrease === expectedIncrease) {
        console.log("✅ Fees correctly deducted!");
        console.log("- Platform Fee (5%):", ethers.formatEther((totalCost * 5n) / 100n), "LYX");
        console.log("- Executor Fee (5%):", ethers.formatEther((totalCost * 5n) / 100n), "LYX");
        console.log("- Monthly Pool (20%):", ethers.formatEther((totalCost * 20n) / 100n), "LYX");
      } else {
        console.log("❌ Fee deduction incorrect!");
      }
    }
  } catch (error: any) {
    console.error("❌ Test error:", error.message);
  }

  console.log("\n✨ Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });