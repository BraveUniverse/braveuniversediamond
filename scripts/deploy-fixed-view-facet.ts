import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying GridottoFixedViewFacet...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    try {
        // Deploy GridottoFixedViewFacet
        console.log("📦 Deploying GridottoFixedViewFacet...");
        const GridottoFixedViewFacet = await ethers.getContractFactory("GridottoFixedViewFacet");
        const fixedViewFacet = await GridottoFixedViewFacet.deploy();
        await fixedViewFacet.waitForDeployment();
        const fixedViewFacetAddress = await fixedViewFacet.getAddress();
        console.log("GridottoFixedViewFacet deployed to:", fixedViewFacetAddress);
        
        // Get function selectors
        const fixedViewSelectors = [
            fixedViewFacet.interface.getFunction("getUserDrawFixed").selector,
            fixedViewFacet.interface.getFunction("isDrawActive").selector,
            fixedViewFacet.interface.getFunction("getDrawPrizeConfig").selector,
            fixedViewFacet.interface.getFunction("getDrawStats").selector,
            fixedViewFacet.interface.getFunction("getActiveDraws").selector
        ];
        
        console.log("\n📝 Fixed view function selectors:");
        fixedViewSelectors.forEach(selector => console.log(`- ${selector}`));
        
        // Prepare diamond cut
        const cut = [{
            facetAddress: fixedViewFacetAddress,
            action: 0, // Add
            functionSelectors: fixedViewSelectors
        }];
        
        console.log("\n💎 Executing diamond cut...");
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
        
        for (const selector of fixedViewSelectors) {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress === fixedViewFacetAddress) {
                console.log(`✅ Function ${selector} deployed successfully`);
            } else {
                console.log(`❌ Function ${selector} NOT found`);
            }
        }
        
        console.log("\n🎉 Fixed view facet deployed successfully!");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);