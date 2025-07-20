import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying and adding new facets...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Deploy facets
    console.log("\n1. Deploying GridottoExecutionFacet...");
    const GridottoExecutionFacet = await ethers.getContractFactory("GridottoExecutionFacet");
    const executionFacet = await GridottoExecutionFacet.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("GridottoExecutionFacet deployed to:", executionFacetAddress);
    
    console.log("\n2. Deploying updated GridottoUIHelperFacet...");
    const GridottoUIHelperFacet = await ethers.getContractFactory("GridottoUIHelperFacet");
    const uiHelperFacet = await GridottoUIHelperFacet.deploy();
    await uiHelperFacet.waitForDeployment();
    const uiHelperFacetAddress = await uiHelperFacet.getAddress();
    console.log("GridottoUIHelperFacet deployed to:", uiHelperFacetAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Prepare diamond cut
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    // Get function selectors
    const getSelectors = (contract: any) => {
        const signatures = Object.keys(contract.interface.fragments)
            .filter(name => name !== 'constructor')
            .map(name => contract.interface.fragments[name])
            .filter((fragment: any) => fragment.type === 'function')
            .map((fragment: any) => contract.interface.getFunction(fragment.name).selector);
        return signatures;
    };
    
    const cuts = [
        // Add GridottoExecutionFacet
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(executionFacet)
        },
        // Replace GridottoUIHelperFacet
        {
            facetAddress: uiHelperFacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: getSelectors(uiHelperFacet)
        }
    ];
    
    console.log("\n3. Executing diamond cut...");
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        await tx.wait();
        console.log("Diamond cut executed successfully!");
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        throw error;
    }
    
    // Update deployment addresses
    if (!deploymentData.contracts) {
        deploymentData.contracts = {};
    }
    deploymentData.contracts.GridottoExecutionFacet = executionFacetAddress;
    deploymentData.contracts.GridottoUIHelperFacet = uiHelperFacetAddress;
    deploymentData.lastUpdate = new Date().toISOString();
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("\n📋 Summary:");
    console.log("- GridottoExecutionFacet:", executionFacetAddress);
    console.log("- GridottoUIHelperFacet:", uiHelperFacetAddress);
    console.log("- New functions added: executeUserDraw, cancelUserDraw");
    console.log("- Updated functions: getRecentWinners, getAdvancedDrawInfo");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });