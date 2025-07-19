import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Getting TestFacet Function Selectors");
  
  try {
    const TestFacet = await ethers.getContractFactory("TestFacet");
    const iface = TestFacet.interface;
    
    console.log("\nTestFacet Function Selectors:");
    
    const functions = [
      "getGreeting",
      "getCallerInfo", 
      "getSecretMessage",
      "getMagicNumber"
    ];
    
    const selectors: string[] = [];
    
    functions.forEach(funcName => {
      const selector = iface.getFunction(funcName)?.selector;
      if (selector) {
        console.log(`  ${funcName}(): ${selector}`);
        selectors.push(selector);
      }
    });
    
    console.log("\nArray format:");
    console.log(JSON.stringify(selectors, null, 2));
    
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }
}

main();