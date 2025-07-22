import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying GridottoFixedPurchaseFacet...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    try {
        // Deploy GridottoFixedPurchaseFacet
        console.log("📦 Deploying GridottoFixedPurchaseFacet...");
        const GridottoFixedPurchaseFacet = await ethers.getContractFactory("GridottoFixedPurchaseFacet");
        const fixedPurchaseFacet = await GridottoFixedPurchaseFacet.deploy();
        await fixedPurchaseFacet.waitForDeployment();
        const fixedPurchaseFacetAddress = await fixedPurchaseFacet.getAddress();
        console.log("GridottoFixedPurchaseFacet deployed to:", fixedPurchaseFacetAddress);
        
        // Get function selectors
        const fixedPurchaseSelectors = [
            fixedPurchaseFacet.interface.getFunction("buyTicketsFixed").selector,
            fixedPurchaseFacet.interface.getFunction("buyMultipleDrawsFixed").selector,
            fixedPurchaseFacet.interface.getFunction("getTicketCost").selector
        ];
        
        console.log("\n📝 Fixed purchase function selectors:");
        fixedPurchaseSelectors.forEach(selector => console.log(`- ${selector}`));
        
        // Prepare diamond cut
        const cut = [{
            facetAddress: fixedPurchaseFacetAddress,
            action: 0, // Add
            functionSelectors: fixedPurchaseSelectors
        }];
        
        console.log("\n💎 Executing diamond cut...");
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
        
        for (const selector of fixedPurchaseSelectors) {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress === fixedPurchaseFacetAddress) {
                console.log(`✅ Function ${selector} deployed successfully`);
            } else {
                console.log(`❌ Function ${selector} NOT found`);
            }
        }
        
        console.log("\n🎉 Fixed purchase facet deployed successfully!");
        console.log("\n📝 Use buyTicketsFixed(drawId, amount) instead of buyUserDrawTicket");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);