import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentAddresses {
  diamond: string;
  diamondCutFacet: string;
  diamondLoupeFacet: string;
  ownershipFacet: string;
  deployedAt: string;
  network: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying BraveUniverse Diamond to LUKSO Testnet...");
  console.log("📋 Deployer address:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "LYX");

  // Deploy facets
  console.log("\n📦 Deploying core facets...");
  
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  console.log("✅ DiamondCutFacet deployed to:", await diamondCutFacet.getAddress());

  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  console.log("✅ DiamondLoupeFacet deployed to:", await diamondLoupeFacet.getAddress());

  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  console.log("✅ OwnershipFacet deployed to:", await ownershipFacet.getAddress());

  // Get function selectors manually
  const diamondCutSelectors = ["0x1f931c1c"]; // diamondCut(FacetCut[],address,bytes)
  const diamondLoupeSelectors = [
    "0x7a0ed627", // facets()
    "0xadfca15e", // facetFunctionSelectors(address)
    "0x52ef6b2c", // facetAddresses()
    "0xcdffacc6", // facetAddress(bytes4)
    "0x01ffc9a7"  // supportsInterface(bytes4)
  ];
  const ownershipSelectors = [
    "0x8da5cb5b", // owner()
    "0xf2fde38b"  // transferOwnership(address)
  ];

  // Prepare diamond cut for initial facets
  const diamondCut = [
    {
      facetAddress: await diamondCutFacet.getAddress(),
      action: 0, // Add
      functionSelectors: diamondCutSelectors
    },
    {
      facetAddress: await diamondLoupeFacet.getAddress(),
      action: 0, // Add
      functionSelectors: diamondLoupeSelectors
    },
    {
      facetAddress: await ownershipFacet.getAddress(),
      action: 0, // Add
      functionSelectors: ownershipSelectors
    }
  ];

  console.log("\n💎 Deploying BraveUniverse Diamond...");
  const BraveUniverseDiamond = await ethers.getContractFactory("BraveUniverseDiamond");
  const diamond = await BraveUniverseDiamond.deploy(deployer.address, diamondCut);
  await diamond.waitForDeployment();
  
  const diamondAddress = await diamond.getAddress();
  console.log("🌟 BraveUniverse Diamond deployed to:", diamondAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
  const facets = await diamondLoupe.facets();
  console.log("📊 Facets count:", facets.length);
  
  for (let i = 0; i < facets.length; i++) {
    console.log(`   Facet ${i + 1}: ${facets[i].facetAddress} (${facets[i].functionSelectors.length} functions)`);
  }

  // Save deployment addresses
  const deploymentData: DeploymentAddresses = {
    diamond: diamondAddress,
    diamondCutFacet: await diamondCutFacet.getAddress(),
    diamondLoupeFacet: await diamondLoupeFacet.getAddress(),
    ownershipFacet: await ownershipFacet.getAddress(),
    deployedAt: new Date().toISOString(),
    network: "luksoTestnet"
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments", "staging");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "addresses.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n💾 Deployment addresses saved to deployments/staging/addresses.json");
  console.log("\n🎉 BraveUniverse Diamond deployment completed successfully!");
  
  return {
    diamond: diamondAddress,
    diamondCutFacet: await diamondCutFacet.getAddress(),
    diamondLoupeFacet: await diamondLoupeFacet.getAddress(),
    ownershipFacet: await ownershipFacet.getAddress()
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 