import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Updated GridottoCoreV2Facet");
  console.log("========================================");

  const [deployer] = await ethers.getSigners();
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Deployer:", deployer.address);

  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);

  console.log("\n🔧 Deploying GridottoCoreV2Facet...");
  try {
    const CoreFacet = await ethers.getContractFactory("GridottoCoreV2Facet");
    const coreFacet = await CoreFacet.deploy();
    await coreFacet.waitForDeployment();
    const coreAddress = await coreFacet.getAddress();
    console.log("✅ Deployed at:", coreAddress);
    
    // Get selectors
    const selectors = [
      "createTokenDraw",
      "createNFTDraw", 
      "createLYXDraw",
      "buyTickets",
      "cancelDraw",
      "getDrawDetails",
      "getUserDrawHistory"
    ].map(func => coreFacet.interface.getFunction(func).selector);
    
    // Replace facet
    const diamondCut = [{
      facetAddress: coreAddress,
      action: 1, // Replace
      functionSelectors: selectors
    }];
    
    console.log("💎 Replacing facet...");
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ Facet replaced!");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n✨ Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });