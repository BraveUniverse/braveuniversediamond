import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Simple TestFacet Test");
  
  const [owner, user1] = await ethers.getSigners();
  const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  console.log("👑 Owner:", owner.address);
  console.log("👤 User1:", user1.address);
  
  try {
    // Test the latest TestFacet (Facet 5 with correct selectors)
    const testFacetProxy = await ethers.getContractAt("TestFacet", diamondAddress);
    
    console.log("\n👑 Testing with OWNER:");
    const ownerGreeting = await testFacetProxy.connect(owner).getGreeting();
    console.log("  getGreeting():", ownerGreeting);
    
    const ownerNumber = await testFacetProxy.connect(owner).getMagicNumber();
    console.log("  getMagicNumber():", ownerNumber.toString());
    
    console.log("\n👤 Testing with USER1:");
    const userGreeting = await testFacetProxy.connect(user1).getGreeting();
    console.log("  getGreeting():", userGreeting);
    
    const userNumber = await testFacetProxy.connect(user1).getMagicNumber();
    console.log("  getMagicNumber():", userNumber.toString());
    
    console.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main();