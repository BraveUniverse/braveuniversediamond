import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Diamond Facets");
  console.log("==========================");

  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  // Get DiamondLoupe facet
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", DIAMOND_ADDRESS);
  
  // Get all facets
  const facets = await diamondLoupe.facets();
  
  console.log(`\n📋 Total facets: ${facets.length}`);
  console.log("================================");
  
  for (let i = 0; i < facets.length; i++) {
    const facet = facets[i];
    console.log(`\nFacet ${i + 1}:`);
    console.log(`Address: ${facet.facetAddress}`);
    console.log(`Function Selectors: ${facet.functionSelectors.length}`);
    
    // Try to identify the facet by checking known selectors
    if (facet.functionSelectors.includes("0x1f931c1c")) {
      console.log("✅ DiamondCutFacet");
    } else if (facet.functionSelectors.includes("0xcdffacc6")) {
      console.log("✅ DiamondLoupeFacet");
    } else if (facet.functionSelectors.includes("0x8da5cb5b")) {
      console.log("✅ OwnershipFacet");
    } else if (facet.functionSelectors.includes("0xd633aab8")) {
      console.log("✅ GridottoPlatformDrawsFacet");
    } else if (facet.functionSelectors.includes("0x7a0ed627")) {
      console.log("✅ OracleFacet");
    }
    
    // Show first 5 selectors
    console.log("First 5 selectors:");
    for (let j = 0; j < Math.min(5, facet.functionSelectors.length); j++) {
      console.log(`  - ${facet.functionSelectors[j]}`);
    }
  }
  
  // Check specific functions
  console.log("\n🔎 Checking specific functions:");
  
  try {
    const coreV2Address = await diamondLoupe.facetAddress("0x3c68eafc"); // getDrawDetails selector
    if (coreV2Address !== ethers.ZeroAddress) {
      console.log("✅ GridottoCoreV2Facet found at:", coreV2Address);
    } else {
      console.log("❌ GridottoCoreV2Facet NOT FOUND");
    }
  } catch (error) {
    console.log("❌ Error checking GridottoCoreV2Facet");
  }
  
  try {
    const platformAddress = await diamondLoupe.facetAddress("0xd633aab8"); // initializePlatformDraws selector
    if (platformAddress !== ethers.ZeroAddress) {
      console.log("✅ GridottoPlatformDrawsFacet found at:", platformAddress);
    } else {
      console.log("❌ GridottoPlatformDrawsFacet NOT FOUND");
    }
  } catch (error) {
    console.log("❌ Error checking GridottoPlatformDrawsFacet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });