import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying new facets...");
    
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
    
    // Only add the new functions
    const newFunctions = [
        "0x80b2c556", // getRecentWinners
        "0x7e8d1603"  // getAdvancedDrawInfo
    ];
    
    const cuts = [
        // Add execution facet
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(executionFacet)
        },
        // Add only new UI helper functions
        {
            facetAddress: uiHelperFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: newFunctions
        }
    ];
    
    console.log("\n3. Executing diamond cut...");
    console.log("Adding execution facet with selectors:", getSelectors(executionFacet));
    console.log("Adding new UI helper functions:", newFunctions);
    
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Diamond cut executed successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        
        // Try adding them separately
        console.log("\n4. Trying to add facets separately...");
        
        try {
            // First add execution facet
            const tx1 = await diamond.diamondCut(
                [{
                    facetAddress: executionFacetAddress,
                    action: FacetCutAction.Add,
                    functionSelectors: getSelectors(executionFacet)
                }],
                ethers.ZeroAddress,
                "0x"
            );
            await tx1.wait();
            console.log("Execution facet added successfully!");
            
            // Then add new UI functions
            const tx2 = await diamond.diamondCut(
                [{
                    facetAddress: uiHelperFacetAddress,
                    action: FacetCutAction.Add,
                    functionSelectors: newFunctions
                }],
                ethers.ZeroAddress,
                "0x"
            );
            await tx2.wait();
            console.log("New UI functions added successfully!");
        } catch (error2: any) {
            console.error("Separate addition also failed:", error2.message);
            throw error2;
        }
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
    console.log("- New functions added:");
    console.log("  - executeUserDraw");
    console.log("  - cancelUserDraw");
    console.log("  - getRecentWinners");
    console.log("  - getAdvancedDrawInfo");
    console.log("\n📊 Fee Configuration:");
    console.log("- Platform fee: 5%");
    console.log("- Executor fee: 5% (max 5 LYX for LYX draws)");
    console.log("- Creator fee: max 10%");
    console.log("- Weekly draws (not daily)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });