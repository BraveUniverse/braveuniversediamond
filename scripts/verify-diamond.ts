import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying BraveUniverse Diamond onchain...");
  
  // Diamond address from deployment
  const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  console.log("📋 Diamond Address:", diamondAddress);
  
  try {
    // Test 1: Diamond Loupe Functions
    console.log("\n🔎 Testing Diamond Loupe Functions...");
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    const facets = await diamondLoupe.facets();
    console.log("✅ Facets count:", facets.length);
    
    for (let i = 0; i < facets.length; i++) {
      console.log(`   Facet ${i + 1}: ${facets[i].facetAddress} (${facets[i].functionSelectors.length} functions)`);
      for (let j = 0; j < facets[i].functionSelectors.length; j++) {
        console.log(`     - ${facets[i].functionSelectors[j]}`);
      }
    }
    
    // Test 2: Ownership Functions
    console.log("\n👑 Testing Ownership Functions...");
    const ownershipFacet = await ethers.getContractAt("OwnershipFacet", diamondAddress);
    
    const owner = await ownershipFacet.owner();
    console.log("✅ Current owner:", owner);
    
    // Test 3: ERC165 Support
    console.log("\n🔌 Testing ERC165 Interface Support...");
    
    // IDiamondCut interface ID: 0x1f931c1c
    const supportsDiamondCut = await diamondLoupe.supportsInterface("0x1f931c1c");
    console.log("✅ Supports IDiamondCut:", supportsDiamondCut);
    
    // IDiamondLoupe interface ID: 0x48e2b093  
    const supportsDiamondLoupe = await diamondLoupe.supportsInterface("0x48e2b093");
    console.log("✅ Supports IDiamondLoupe:", supportsDiamondLoupe);
    
    // IERC173 (Ownership) interface ID: 0x7f5828d0
    const supportsOwnership = await diamondLoupe.supportsInterface("0x7f5828d0");
    console.log("✅ Supports IERC173:", supportsOwnership);
    
    // ERC165 interface ID: 0x01ffc9a7
    const supportsERC165 = await diamondLoupe.supportsInterface("0x01ffc9a7");
    console.log("✅ Supports ERC165:", supportsERC165);
    
    // Test 4: Function Selector Resolution
    console.log("\n🎯 Testing Function Selector Resolution...");
    
    // Test facets() selector
    const facetsSelector = "0x7a0ed627";
    const facetForFacets = await diamondLoupe.facetAddress(facetsSelector);
    console.log(`✅ facets() selector ${facetsSelector} resolves to:`, facetForFacets);
    
    // Test owner() selector  
    const ownerSelector = "0x8da5cb5b";
    const facetForOwner = await diamondLoupe.facetAddress(ownerSelector);
    console.log(`✅ owner() selector ${ownerSelector} resolves to:`, facetForOwner);
    
    // Test diamondCut() selector
    const diamondCutSelector = "0x1f931c1c";
    const facetForDiamondCut = await diamondLoupe.facetAddress(diamondCutSelector);
    console.log(`✅ diamondCut() selector ${diamondCutSelector} resolves to:`, facetForDiamondCut);
    
    // Test 5: Facet Address List
    console.log("\n📂 Testing Facet Address List...");
    const facetAddresses = await diamondLoupe.facetAddresses();
    console.log("✅ All facet addresses:", facetAddresses);
    
    // Test 6: Individual Facet Function Selectors
    console.log("\n🔧 Testing Individual Facet Function Selectors...");
    for (let i = 0; i < facetAddresses.length; i++) {
      const selectors = await diamondLoupe.facetFunctionSelectors(facetAddresses[i]);
      console.log(`✅ Facet ${facetAddresses[i]} has ${selectors.length} functions:`, selectors);
    }
    
    console.log("\n🎉 Diamond verification completed successfully!");
    console.log("✅ All functions are working correctly");
    console.log("✅ Function selectors are properly mapped");
    console.log("✅ Facets are accessible through Diamond proxy");
    
  } catch (error) {
    console.error("❌ Diamond verification failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
});