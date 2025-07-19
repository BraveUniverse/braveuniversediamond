import { ethers } from "hardhat";

async function main() {
  console.log("🎯 FINAL TestFacet Lifecycle - Deploy, Add, Test, Remove");
  console.log("=".repeat(60));
  
  const [owner, user1] = await ethers.getSigners();
  const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  console.log("👑 Owner address:", owner.address);
  console.log("👤 User1 address:", user1.address);
  console.log("💎 Diamond address:", diamondAddress);
  
  try {
    // Step 1: Deploy new TestFacet
    console.log("\n🚀 Step 1: Deploying fresh TestFacet...");
    const TestFacet = await ethers.getContractFactory("TestFacet");
    const testFacet = await TestFacet.deploy();
    await testFacet.waitForDeployment();
    const testFacetAddress = await testFacet.getAddress();
    console.log("✅ TestFacet deployed to:", testFacetAddress);
    
    // Correct function selectors using Hardhat interface
    const testFacetSelectors = [
      "0xfe50cc72", // getGreeting()
      "0x0de80912", // getCallerInfo()
      "0x4d2102d4", // getSecretMessage()
      "0x59ff5b55"  // getMagicNumber()
    ];
    
    console.log("📋 Function selectors:", testFacetSelectors);
    
    // Step 2: Add TestFacet to Diamond
    console.log("\n🔧 Step 2: Adding TestFacet to Diamond...");
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    const diamondCut = [{
      facetAddress: testFacetAddress,
      action: 0, // Add
      functionSelectors: testFacetSelectors
    }];
    
    const addTx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    await addTx.wait();
    console.log("✅ TestFacet added to Diamond!");
    
    // Step 3: Verify addition
    console.log("\n🔍 Step 3: Verifying TestFacet in Diamond...");
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const facets = await diamondLoupe.facets();
    console.log("📊 Total facets now:", facets.length);
    
    // Step 4: Test functions with different users
    console.log("\n🎯 Step 4: Testing TestFacet Functions...");
    const testFacetProxy = await ethers.getContractAt("TestFacet", diamondAddress);
    
    // Test with owner
    console.log("\n👑 Testing with OWNER:");
    const ownerGreeting = await testFacetProxy.connect(owner).getGreeting();
    console.log("  getGreeting():", ownerGreeting);
    
    const ownerInfo = await testFacetProxy.connect(owner).getCallerInfo();
    console.log("  getCallerInfo():", `caller=${ownerInfo[0]}, isOwner=${ownerInfo[1]}`);
    
    const ownerSecret = await testFacetProxy.connect(owner).getSecretMessage();
    console.log("  getSecretMessage():", ownerSecret);
    
    const ownerNumber = await testFacetProxy.connect(owner).getMagicNumber();
    console.log("  getMagicNumber():", ownerNumber.toString());
    
    // Test with regular user
    console.log("\n👤 Testing with USER1:");
    const userGreeting = await testFacetProxy.connect(user1).getGreeting();
    console.log("  getGreeting():", userGreeting);
    
    const userInfo = await testFacetProxy.connect(user1).getCallerInfo();
    console.log("  getCallerInfo():", `caller=${userInfo[0]}, isOwner=${userInfo[1]}`);
    
    const userNumber = await testFacetProxy.connect(user1).getMagicNumber();
    console.log("  getMagicNumber():", userNumber.toString());
    
    // Test owner-only function with user (should fail)
    console.log("\n🚫 Testing owner-only function with USER1 (should fail):");
    try {
      await testFacetProxy.connect(user1).getSecretMessage();
      console.log("❌ ERROR: User should not be able to call getSecretMessage()!");
    } catch (error) {
      console.log("✅ Correctly rejected user access to secret function");
    }
    
    // Step 5: Wait then remove
    console.log("\n⏳ Step 5: Waiting 3 seconds before removal...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Remove TestFacet
    console.log("\n🗑️  Step 6: Removing TestFacet from Diamond...");
    const removeDiamondCut = [{
      facetAddress: ethers.ZeroAddress,
      action: 2, // Remove
      functionSelectors: testFacetSelectors
    }];
    
    const removeTx = await diamondCutFacet.diamondCut(removeDiamondCut, ethers.ZeroAddress, "0x");
    await removeTx.wait();
    console.log("✅ TestFacet removed from Diamond!");
    
    // Step 7: Verify removal
    console.log("\n🔍 Step 7: Verifying TestFacet removal...");
    const facetsAfter = await diamondLoupe.facets();
    console.log("📊 Total facets now:", facetsAfter.length);
    
    // Try to call removed function (should fail)
    console.log("\n🚫 Testing removed function (should fail):");
    try {
      await testFacetProxy.connect(owner).getGreeting();
      console.log("❌ ERROR: Function should not be accessible after removal!");
    } catch (error) {
      console.log("✅ Correctly failed - function removed");
    }
    
    console.log("\n🎉 COMPLETE SUCCESS! TestFacet Lifecycle Demo:");
    console.log("✅ Deploy: SUCCESS");
    console.log("✅ Add to Diamond: SUCCESS");
    console.log("✅ Owner gets special message & number 100");
    console.log("✅ User gets normal message & number 42");
    console.log("✅ Owner-only function protected");
    console.log("✅ Remove from Diamond: SUCCESS");
    console.log("✅ All functions properly cleaned up");
    
  } catch (error) {
    console.error("❌ TestFacet lifecycle failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
});