import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying edge case improvements (simplified)...");
    
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
    
    console.log("\n4. Adding new functions only...");
    
    try {
        // Only add completely new functions
        const cuts = [
            // Add forceExecuteDraw
            {
                facetAddress: executionFacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: [
                    executionFacet.interface.getFunction("forceExecuteDraw").selector
                ]
            },
            // Add refund functions
            {
                facetAddress: phase3FacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: [
                    phase3Facet.interface.getFunction("refundDraw").selector,
                    phase3Facet.interface.getFunction("claimRefund").selector
                ]
            },
            // Add new UI functions
            {
                facetAddress: uiHelperFacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: [
                    uiHelperFacet.interface.getFunction("getExpiredDrawsWaitingExecution").selector,
                    uiHelperFacet.interface.getFunction("canExecuteDraw").selector,
                    uiHelperFacet.interface.getFunction("getDrawsForCleanup").selector
                ]
            }
        ];
        
        console.log("Executing diamond cut...");
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
        console.log("\n🆕 New functions added:");
        console.log("- forceExecuteDraw (owner only)");
        console.log("- refundDraw (batch refund)");
        console.log("- claimRefund (individual refund)");
        console.log("- getExpiredDrawsWaitingExecution");
        console.log("- canExecuteDraw");
        console.log("- getDrawsForCleanup");
        
        console.log("\n📍 Deployed addresses:");
        console.log("- GridottoExecutionFacet:", executionFacetAddress);
        console.log("- GridottoPhase3Facet:", phase3FacetAddress);
        console.log("- GridottoUIHelperFacet:", uiHelperFacetAddress);
        
        console.log("\n⚠️  Note: Existing functions were NOT replaced.");
        console.log("To use updated executeUserDraw and cancelUserDraw logic,");
        console.log("you need to manually replace those functions in a separate transaction.");
        
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        
        // Try adding functions one by one
        console.log("\nTrying to add functions individually...");
        
        const functions = [
            { facet: executionFacetAddress, func: "forceExecuteDraw", contract: executionFacet },
            { facet: phase3FacetAddress, func: "refundDraw", contract: phase3Facet },
            { facet: phase3FacetAddress, func: "claimRefund", contract: phase3Facet },
            { facet: uiHelperFacetAddress, func: "getExpiredDrawsWaitingExecution", contract: uiHelperFacet },
            { facet: uiHelperFacetAddress, func: "canExecuteDraw", contract: uiHelperFacet },
            { facet: uiHelperFacetAddress, func: "getDrawsForCleanup", contract: uiHelperFacet }
        ];
        
        for (const { facet, func, contract } of functions) {
            try {
                const cut = [{
                    facetAddress: facet,
                    action: FacetCutAction.Add,
                    functionSelectors: [contract.interface.getFunction(func).selector]
                }];
                
                const tx = await diamond.diamondCut(cut, ethers.ZeroAddress, "0x");
                await tx.wait();
                console.log(`✓ Added ${func}`);
            } catch (err: any) {
                console.log(`✗ Failed to add ${func}: ${err.message}`);
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });