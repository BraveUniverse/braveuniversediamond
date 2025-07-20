import { ethers } from "hardhat";

async function main() {
    console.log("Checking available draw creation functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get diamond loupe
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Check different draw creation functions
    const drawFunctions = [
        "createUserDraw",
        "createTokenDraw",
        "createAdvancedDraw"
    ];
    
    console.log("Checking function availability:");
    
    for (const funcName of drawFunctions) {
        // Try different signatures
        const signatures = [
            `${funcName}(uint8,(uint256[],uint256,uint256),uint256,uint256,uint256,uint8,address,uint256)`,
            `${funcName}(uint8,uint256,uint256,uint256,(uint8,uint256[],uint256,uint256),uint8,address,uint256,bytes32[])`,
            `${funcName}((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint256,uint256,uint256,(uint256[],uint256,uint256),(address,uint256,uint256,uint256),(uint8,address,uint256,bytes32[])))`,
            `${funcName}(uint256,uint256,uint256,uint256,uint256,uint256,uint256[])`
        ];
        
        let found = false;
        for (const sig of signatures) {
            try {
                const selector = ethers.id(sig).slice(0, 10);
                const facetAddress = await diamondLoupe.facetAddress(selector);
                if (facetAddress !== ethers.ZeroAddress) {
                    console.log(`✅ ${funcName} found at: ${facetAddress}`);
                    console.log(`   Selector: ${selector}`);
                    console.log(`   Signature: ${sig}`);
                    found = true;
                    break;
                }
            } catch (e) {
                // Continue
            }
        }
        
        if (!found) {
            console.log(`❌ ${funcName} not found in diamond`);
        }
    }
    
    // Also check for simpler function to create basic draws
    console.log("\nChecking for simplified draw creation...");
    
    // Get GridottoPhase3Facet interface
    try {
        const phase3Address = "0x2dDc8e59D3d1e1A0CdA2F5C6e3b4C9e8e6b5e3F5"; // Replace with actual address
        const gridotto = await ethers.getContractAt("GridottoPhase3Facet", diamondAddress);
        
        // Try to create a simple token draw
        console.log("\n📝 Let's try creating a simple token draw instead...");
        console.log("This might work if createTokenDraw is deployed");
        
    } catch (e) {
        console.log("Could not check Phase3 functions");
    }
}

main().catch(console.error);