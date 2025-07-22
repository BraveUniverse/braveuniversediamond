import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying GridottoViewFacet...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    try {
        // Deploy GridottoViewFacet
        console.log("📦 Deploying GridottoViewFacet...");
        const GridottoViewFacet = await ethers.getContractFactory("GridottoViewFacet");
        const viewFacet = await GridottoViewFacet.deploy();
        await viewFacet.waitForDeployment();
        const viewFacetAddress = await viewFacet.getAddress();
        console.log("GridottoViewFacet deployed to:", viewFacetAddress);
        
        // Get function selectors - only new ones
        const newSelectors = [
            viewFacet.interface.getFunction("getDrawTiming").selector,
            viewFacet.interface.getFunction("getUserDrawInfo").selector,
            viewFacet.interface.getFunction("getDrawParticipantsWithTickets").selector
        ];
        
        console.log("\n📝 New view function selectors:");
        newSelectors.forEach(selector => console.log(`- ${selector}`));
        
        const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
        
        // Prepare diamond cut
        const cut = [{
            facetAddress: viewFacetAddress,
            action: 0, // Add
            functionSelectors: newSelectors
        }];
        
        console.log("\n💎 Executing diamond cut...");
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        for (const selector of newSelectors) {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress === viewFacetAddress) {
                console.log(`✅ Function ${selector} deployed successfully`);
            } else {
                console.log(`❌ Function ${selector} NOT found`);
            }
        }
        
        console.log("\n🎉 View facet deployed successfully!");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);