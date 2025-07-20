import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying edge case improvements...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Deploy updated facets
    console.log("\n1. Deploying updated GridottoExecutionFacet...");
    const GridottoExecutionFacet = await ethers.getContractFactory("GridottoExecutionFacet");
    const executionFacet = await GridottoExecutionFacet.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("GridottoExecutionFacet deployed to:", executionFacetAddress);
    
    console.log("\n2. Deploying updated GridottoPhase3Facet...");
    const GridottoPhase3Facet = await ethers.getContractFactory("GridottoPhase3Facet");
    const phase3Facet = await GridottoPhase3Facet.deploy();
    await phase3Facet.waitForDeployment();
    const phase3FacetAddress = await phase3Facet.getAddress();
    console.log("GridottoPhase3Facet deployed to:", phase3FacetAddress);
    
    console.log("\n3. Deploying updated GridottoUIHelperFacet...");
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
    
    // New functions to add
    const newExecutionFunctions = [
        executionFacet.interface.getFunction("forceExecuteDraw").selector,
        executionFacet.interface.getFunction("cancelUserDraw").selector // Updated version
    ];
    
    const newPhase3Functions = [
        phase3Facet.interface.getFunction("refundDraw").selector,
        phase3Facet.interface.getFunction("claimRefund").selector
    ];
    
    const newUIFunctions = [
        uiHelperFacet.interface.getFunction("getExpiredDrawsWaitingExecution").selector,
        uiHelperFacet.interface.getFunction("canExecuteDraw").selector,
        uiHelperFacet.interface.getFunction("getDrawsForCleanup").selector
    ];
    
    console.log("\n4. Executing diamond cuts...");
    
    const cuts = [
        // Replace executeUserDraw
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: [executionFacet.interface.getFunction("executeUserDraw").selector]
        },
        // Add new execution functions
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: newExecutionFunctions
        },
        // Replace existing Phase3 functions
        {
            facetAddress: phase3FacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: [
                phase3Facet.interface.getFunction("createTokenDraw").selector,
                phase3Facet.interface.getFunction("createNFTDraw").selector
            ]
        },
        // Add new Phase3 functions
        {
            facetAddress: phase3FacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: newPhase3Functions
        },
        // Add new UI functions
        {
            facetAddress: uiHelperFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: newUIFunctions
        }
    ];
    
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
        deploymentData.contracts.GridottoExecutionFacetV2 = executionFacetAddress;
        deploymentData.contracts.GridottoPhase3FacetV2 = phase3FacetAddress;
        deploymentData.contracts.GridottoUIHelperFacetV2 = uiHelperFacetAddress;
        deploymentData.lastUpdate = new Date().toISOString();
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
        
        console.log("\n✅ Deployment completed successfully!");
        console.log("\n📋 Summary of improvements:");
        console.log("1. Grace period for minimum participants (7 days)");
        console.log("2. Owner can cancel/cleanup old draws");
        console.log("3. Force execute for expired draws");
        console.log("4. Refund mechanism for failed draws");
        console.log("5. UI helper functions for better UX");
        
        console.log("\n🆕 New functions added:");
        console.log("- forceExecuteDraw (owner only)");
        console.log("- cancelUserDraw (enhanced with owner rights)");
        console.log("- refundDraw (batch refund)");
        console.log("- claimRefund (individual refund)");
        console.log("- getExpiredDrawsWaitingExecution");
        console.log("- canExecuteDraw");
        console.log("- getDrawsForCleanup");
        
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });