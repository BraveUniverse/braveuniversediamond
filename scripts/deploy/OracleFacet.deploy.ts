import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying OracleFacet to LUKSO Testnet...");
  console.log("📋 Deployer address:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "LYX");

  // Load existing deployment addresses
  const addressesPath = path.join(__dirname, "..", "..", "deployments", "staging", "addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const diamondAddress = addresses.diamond;
  
  console.log("💎 Using existing Diamond at:", diamondAddress);

  // Deploy OracleFacet
  console.log("\n📦 Deploying OracleFacet...");
  const OracleFacet = await ethers.getContractFactory("OracleFacet");
  const oracleFacet = await OracleFacet.deploy();
  await oracleFacet.waitForDeployment();
  const oracleFacetAddress = await oracleFacet.getAddress();
  console.log("✅ OracleFacet deployed to:", oracleFacetAddress);

  // Get function selectors
  const getSelectors = (contract: any) => {
    const selectors: string[] = [];
    contract.interface.forEachFunction((func: any) => {
      selectors.push(func.selector);
    });
    return selectors;
  };

  const oracleSelectors = getSelectors(oracleFacet);
  console.log(`📊 OracleFacet has ${oracleSelectors.length} functions`);

  // Prepare diamond cut
  const diamondCut = [{
    facetAddress: oracleFacetAddress,
    action: 0, // Add
    functionSelectors: oracleSelectors
  }];

  // Execute diamond cut
  console.log("\n💎 Adding OracleFacet to Diamond...");
  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", diamondAddress);
  
  const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
  console.log("📝 Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ OracleFacet added to Diamond!");
  console.log("⛽ Gas used:", receipt.gasUsed.toString());

  // Verify facet was added
  console.log("\n🔍 Verifying deployment...");
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();
  
  const oracleFacetInfo = facets.find((f: any) => f.facetAddress.toLowerCase() === oracleFacetAddress.toLowerCase());
  if (oracleFacetInfo) {
    console.log("✅ OracleFacet successfully added with", oracleFacetInfo.functionSelectors.length, "functions");
  } else {
    console.error("❌ OracleFacet not found in Diamond!");
    process.exit(1);
  }

  // Initialize Oracle
  console.log("\n🔧 Initializing Oracle...");
  const oracleContract = await ethers.getContractAt("OracleFacet", diamondAddress);
  const initTx = await oracleContract.initializeOracle();
  await initTx.wait();
  console.log("✅ Oracle initialized with default values");

  // Test oracle
  console.log("\n🧪 Testing Oracle...");
  const [success, value] = await oracleContract.testOracleConnection();
  console.log("Oracle connection test:", success ? "✅ Success" : "❌ Failed (using fallback)");
  
  // Update deployment addresses
  const updatedAddresses = {
    ...addresses,
    oracleFacet: oracleFacetAddress,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(addressesPath, JSON.stringify(updatedAddresses, null, 2));
  console.log("\n💾 Deployment addresses updated");

  // Generate ABI
  console.log("\n📄 Generating ABI...");
  const abi = OracleFacet.interface.format();
  const abiPath = path.join(__dirname, "..", "..", "abis", "OracleFacet.json");
  
  if (!fs.existsSync(path.dirname(abiPath))) {
    fs.mkdirSync(path.dirname(abiPath), { recursive: true });
  }
  
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log("✅ ABI saved to:", abiPath);

  console.log("\n🎉 OracleFacet deployment completed successfully!");
  
  return {
    facetAddress: oracleFacetAddress,
    selectors: oracleSelectors,
    gasUsed: receipt.gasUsed.toString()
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });