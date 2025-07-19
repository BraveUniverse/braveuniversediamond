import { ethers } from "hardhat";

/**
 * Helper function to get correct function selectors using Hardhat interface
 * @param contractName - Name of the contract (e.g., "TestFacet")
 * @param functionNames - Array of function names without parentheses
 * @returns Array of function selectors
 */
export async function getCorrectSelectors(
  contractName: string, 
  functionNames: string[]
): Promise<string[]> {
  try {
    const Contract = await ethers.getContractFactory(contractName);
    const iface = Contract.interface;
    
    console.log(`🔧 Getting selectors for ${contractName}:`);
    
    const selectors: string[] = [];
    const invalidFunctions: string[] = [];
    
    functionNames.forEach(funcName => {
      try {
        const selector = iface.getFunction(funcName)?.selector;
        if (selector) {
          console.log(`  ✅ ${funcName}(): ${selector}`);
          selectors.push(selector);
        } else {
          console.log(`  ❌ ${funcName}(): Not found in interface`);
          invalidFunctions.push(funcName);
        }
      } catch (error) {
        console.log(`  ❌ ${funcName}(): Error getting selector`);
        invalidFunctions.push(funcName);
      }
    });
    
    if (invalidFunctions.length > 0) {
      console.log(`\n⚠️  Invalid functions: ${invalidFunctions.join(", ")}`);
      console.log("Available functions in contract:");
      
      // List all available functions
      const fragments = iface.fragments;
      fragments.forEach(fragment => {
        if (fragment.type === "function") {
          console.log(`  - ${fragment.name}`);
        }
      });
    }
    
    console.log(`\n📋 Final selectors array:`);
    console.log(JSON.stringify(selectors, null, 2));
    
    return selectors;
    
  } catch (error) {
    console.error(`❌ Error getting selectors for ${contractName}:`, error);
    throw error;
  }
}

/**
 * Verify that selectors don't collide with existing Diamond selectors
 * @param newSelectors - New selectors to check
 * @param diamondAddress - Address of the Diamond contract
 */
export async function verifyNoSelectorCollision(
  newSelectors: string[], 
  diamondAddress: string
): Promise<boolean> {
  try {
    console.log("\n🔍 Checking for selector collisions...");
    
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const existingFacets = await diamondLoupe.facets();
    
    const existingSelectors = new Set<string>();
    
    // Collect all existing selectors
    existingFacets.forEach((facet: any) => {
      facet.functionSelectors.forEach((selector: string) => {
        existingSelectors.add(selector.toLowerCase());
      });
    });
    
    console.log(`📊 Existing selectors: ${existingSelectors.size}`);
    
    // Check for collisions
    const collisions: string[] = [];
    newSelectors.forEach(selector => {
      if (existingSelectors.has(selector.toLowerCase())) {
        collisions.push(selector);
      }
    });
    
    if (collisions.length > 0) {
      console.log(`❌ Selector collisions found: ${collisions.join(", ")}`);
      return false;
    } else {
      console.log(`✅ No selector collisions found`);
      return true;
    }
    
  } catch (error) {
    console.error("❌ Error checking selector collisions:", error);
    return false;
  }
}

// Example usage for TestFacet
async function main() {
  try {
    // Example: Get TestFacet selectors
    const selectors = await getCorrectSelectors("TestFacet", [
      "getGreeting",
      "getCallerInfo", 
      "getSecretMessage",
      "getMagicNumber"
    ]);
    
    // Check against deployed Diamond
    const diamondAddress = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
    await verifyNoSelectorCollision(selectors, diamondAddress);
    
    console.log("\n✅ Helper script completed successfully!");
    
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}