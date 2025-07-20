import { ethers } from "hardhat";

async function main() {
    console.log("Checking createUserDraw function in diamond...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get diamond loupe
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Check different possible selectors
    const possibleSelectors = [
        // Original GridottoFacet version
        ethers.id("createUserDraw(uint8,(uint256[],uint256,uint256),uint256,uint256,uint256,uint8,address,uint256)").slice(0, 10),
        // GridottoMissingFacet version
        ethers.id("createUserDraw(uint8,uint256,uint256,uint256,(uint8,uint256[],uint256,uint256),uint8,address,uint256,bytes32[])").slice(0, 10),
        // Simple version
        ethers.id("createUserDraw(uint256,uint256,uint256,uint256,uint256,uint256,uint256[])").slice(0, 10)
    ];
    
    console.log("Checking selectors:");
    for (const selector of possibleSelectors) {
        try {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`✅ Selector ${selector} found at: ${facetAddress}`);
            } else {
                console.log(`❌ Selector ${selector} not found`);
            }
        } catch (e) {
            console.log(`❌ Error checking selector ${selector}`);
        }
    }
    
    // Get all function selectors
    console.log("\nGetting all facet addresses...");
    const facetAddresses = await diamondLoupe.facetAddresses();
    
    for (const facetAddress of facetAddresses) {
        const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        for (const selector of selectors) {
            // Check if it's a createUserDraw variant
            if (selector.startsWith("0x")) {
                try {
                    // Try to match known createUserDraw selectors
                    const gridotto = await ethers.getContractAt("GridottoFacet", facetAddress);
                    const fragment = gridotto.interface.getFunction(selector);
                    if (fragment && fragment.name === "createUserDraw") {
                        console.log(`\n✅ Found createUserDraw at ${facetAddress}`);
                        console.log(`   Selector: ${selector}`);
                        console.log(`   Signature: ${fragment.format("full")}`);
                    }
                } catch (e) {
                    // Not this interface
                }
            }
        }
    }
}

main().catch(console.error);