import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Draw Creation Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get contracts
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    try {
        // Deploy GridottoMissingFacet with draw creation functions
        console.log("📦 Deploying GridottoMissingFacet...");
        const GridottoMissingFacet = await ethers.getContractFactory("GridottoMissingFacet");
        const missingFacet = await GridottoMissingFacet.deploy();
        await missingFacet.waitForDeployment();
        const missingFacetAddress = await missingFacet.getAddress();
        console.log("GridottoMissingFacet deployed to:", missingFacetAddress);
        
        // Get function selectors for draw creation
        const drawCreationSelectors = [
            missingFacet.interface.getFunction("createUserDraw").selector,
            missingFacet.interface.getFunction("createTokenDraw").selector,
        ];
        
        console.log("\n📝 Draw creation function selectors:");
        drawCreationSelectors.forEach(selector => {
            console.log(`- ${selector}`);
        });
        
        // Prepare diamond cut
        const cut = [{
            facetAddress: missingFacetAddress,
            action: 0, // Add
            functionSelectors: drawCreationSelectors
        }];
        
        console.log("\n💎 Executing diamond cut...");
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
        
        for (const selector of drawCreationSelectors) {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress === missingFacetAddress) {
                console.log(`✅ Function ${selector} deployed successfully`);
            } else {
                console.log(`❌ Function ${selector} NOT found`);
            }
        }
        
        console.log("\n🎉 Draw creation functions deployed successfully!");
        console.log("You can now create draws using:");
        console.log("- createUserDraw() for LYX prize draws");
        console.log("- createTokenDraw() for token prize draws");
        
    } catch (error: any) {
        console.error("Error deploying functions:", error.message);
        
        if (error.message.includes("LibDiamond: Must be contract owner")) {
            console.log("\n⚠️  You need to be the contract owner to perform diamond cuts.");
        }
    }
}

main().catch(console.error);