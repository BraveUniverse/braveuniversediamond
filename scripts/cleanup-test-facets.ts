import { ethers } from "hardhat";

async function main() {
  console.log("🧹 Cleaning up TestFacet functions from Diamond");
  
  const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
  
  // All TestFacet selectors to remove (both old and new)
  const selectorsToRemove = [
    // Old TestFacet selectors (Facet 4)
    "0x76a631c0",
    "0x62738998", 
    "0x40e49a1e",
    "0xb2bdfa7b",
    // New TestFacet selectors (Facet 5)
    "0xfe49d7a3",
    "0x0ca04629",
    "0xef0b25f7", 
    "0xbffdddfc"
  ];
  
  console.log("🗑️  Removing selectors:", selectorsToRemove);
  
  try {
    const removeDiamondCut = [{
      facetAddress: ethers.ZeroAddress,
      action: 2, // Remove
      functionSelectors: selectorsToRemove
    }];
    
    const removeTx = await diamondCutFacet.diamondCut(removeDiamondCut, ethers.ZeroAddress, "0x");
    await removeTx.wait();
    
    console.log("✅ All TestFacet functions removed from Diamond!");
    
    // Verify cleanup
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const facets = await diamondLoupe.facets();
    console.log("📊 Total facets now:", facets.length);
    
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

main();