import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying only new UI functions...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    console.log("\n1. Deploying updated GridottoUIHelperFacet...");
    const GridottoUIHelperFacet = await ethers.getContractFactory("GridottoUIHelperFacet");
    const uiHelperFacet = await GridottoUIHelperFacet.deploy();
    await uiHelperFacet.waitForDeployment();
    const uiHelperFacetAddress = await uiHelperFacet.getAddress();
    console.log("GridottoUIHelperFacet deployed to:", uiHelperFacetAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Prepare diamond cut
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    // Get the new function selectors
    console.log("\n2. Getting function selectors...");
    const getRecentWinnersSelector = uiHelperFacet.interface.getFunction("getRecentWinners").selector;
    const getAdvancedDrawInfoSelector = uiHelperFacet.interface.getFunction("getAdvancedDrawInfo").selector;
    
    console.log("getRecentWinners selector:", getRecentWinnersSelector);
    console.log("getAdvancedDrawInfo selector:", getAdvancedDrawInfoSelector);
    
    const cuts = [
        {
            facetAddress: uiHelperFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: [getRecentWinnersSelector, getAdvancedDrawInfoSelector]
        }
    ];
    
    console.log("\n3. Executing diamond cut...");
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Diamond cut executed successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Update deployment addresses
        if (!deploymentData.contracts) {
            deploymentData.contracts = {};
        }
        deploymentData.contracts.GridottoUIHelperFacetUpdated = uiHelperFacetAddress;
        deploymentData.lastUpdate = new Date().toISOString();
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
        
        console.log("\n✅ Deployment completed successfully!");
        console.log("\n📋 Summary:");
        console.log("- GridottoUIHelperFacet:", uiHelperFacetAddress);
        console.log("- New functions added:");
        console.log("  - getRecentWinners(uint256,uint256)");
        console.log("  - getAdvancedDrawInfo(uint256)");
        console.log("\n📊 Updates implemented:");
        console.log("- Winner tracking for leaderboard");
        console.log("- Detailed draw information function");
        console.log("- Platform fee: 5%");
        console.log("- Executor fee: 5% (max 5 LYX)");
        console.log("- Creator fee: max 10%");
        
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        
        // Check if functions already exist
        console.log("\n4. Checking existing functions...");
        const loupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
        
        try {
            const facetAddress1 = await loupe.facetAddress(getRecentWinnersSelector);
            console.log("getRecentWinners already exists at:", facetAddress1);
        } catch (e) {
            console.log("getRecentWinners does not exist");
        }
        
        try {
            const facetAddress2 = await loupe.facetAddress(getAdvancedDrawInfoSelector);
            console.log("getAdvancedDrawInfo already exists at:", facetAddress2);
        } catch (e) {
            console.log("getAdvancedDrawInfo does not exist");
        }
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });