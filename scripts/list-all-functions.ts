import { ethers } from "hardhat";

async function main() {
    console.log("📋 Listing all functions in Diamond...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get diamond loupe
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Get all facet addresses
    const facetAddresses = await diamondLoupe.facetAddresses();
    
    console.log(`Found ${facetAddresses.length} facets in diamond\n`);
    
    // For each facet, get its functions
    for (const facetAddress of facetAddresses) {
        console.log(`\n📍 Facet: ${facetAddress}`);
        console.log("=" + "=".repeat(60));
        
        const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        console.log(`Functions: ${selectors.length}`);
        
        // Try to identify function names
        const functionNames: string[] = [];
        
        // Check against known interfaces
        const interfaces = [
            "GridottoFacet",
            "GridottoPhase3Facet", 
            "GridottoPhase4Facet",
            "GridottoExecutionFacet",
            "GridottoUIHelperFacet",
            "AdminFacet",
            "OracleFacet",
            "DiamondLoupeFacet",
            "DiamondCutFacet",
            "OwnershipFacet",
            "GridottoMissingFacet"
        ];
        
        for (const interfaceName of interfaces) {
            try {
                const contract = await ethers.getContractAt(interfaceName, facetAddress);
                
                for (const selector of selectors) {
                    try {
                        const fragment = contract.interface.getFunction(selector);
                        if (fragment) {
                            functionNames.push(`${fragment.name}${selector}`);
                        }
                    } catch (e) {
                        // Not in this interface
                    }
                }
            } catch (e) {
                // Interface not found
            }
        }
        
        // Print functions
        if (functionNames.length > 0) {
            console.log("\nIdentified functions:");
            functionNames.forEach(name => console.log(`  - ${name}`));
        } else {
            console.log("\nSelectors:");
            selectors.forEach(selector => console.log(`  - ${selector}`));
        }
        
        // Check for draw creation functions
        const drawCreationSelectors = [
            ethers.id("createUserDraw(uint8,uint256,uint256,uint256,(uint8,uint256[],uint256,uint256),uint8,address,uint256,bytes32[])").slice(0, 10),
            ethers.id("createTokenDraw(uint8,address,uint256,uint256,uint256,(uint8,uint256[],uint256,uint256),uint8,address,uint256,bytes32[])").slice(0, 10),
            ethers.id("createAdvancedDraw((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint256,uint256,uint256,(uint256[],uint256,uint256),(address,uint256,uint256,uint256),(uint8,address,uint256,bytes32[])))").slice(0, 10)
        ];
        
        for (const drawSelector of drawCreationSelectors) {
            if (selectors.includes(drawSelector)) {
                console.log(`\n✅ Found draw creation function: ${drawSelector}`);
            }
        }
    }
    
    // Specifically check for createUserDraw
    console.log("\n\n🔍 Checking createUserDraw specifically...");
    const createUserDrawSelector = "0xd9422c31"; // From previous output
    try {
        const facetAddress = await diamondLoupe.facetAddress(createUserDrawSelector);
        if (facetAddress !== ethers.ZeroAddress) {
            console.log(`✅ createUserDraw found at: ${facetAddress}`);
            console.log("You CAN create draws!");
        } else {
            console.log("❌ createUserDraw NOT found");
        }
    } catch (e) {
        console.log("Error checking createUserDraw");
    }
}

main().catch(console.error);