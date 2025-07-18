import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Quick Diamond Test...");
  
  const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  console.log("Diamond:", diamondAddress);
  
  try {
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const facets = await diamondLoupe.facets();
    console.log("✅ Facets:", facets.length);
    console.log("✅ Diamond is working!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();