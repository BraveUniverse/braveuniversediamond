import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying updated facets...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || deploymentData.Diamond;
    const gridottoFacetAddress = deploymentData.contracts?.GridottoFacet || deploymentData.GridottoFacet;
    
    if (!diamondAddress || !gridottoFacetAddress) {
        throw new Error("Diamond or GridottoFacet address not found in deployment file");
    }
    
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
    
    // Get selectors for execution facet
    const executionSelectors = getSelectors(executionFacet);
    console.log("\n3. Execution facet selectors:", executionSelectors);
    
    // Filter out executeUserDraw and cancelUserDraw from GridottoFacet
    const gridottoFacet = await ethers.getContractAt("GridottoFacet", gridottoFacetAddress);
    const gridottoSelectors = getSelectors(gridottoFacet);
    
    // Check if functions exist in GridottoFacet
    let executeUserDrawSelector, cancelUserDrawSelector;
    try {
        executeUserDrawSelector = gridottoFacet.interface.getFunction("executeUserDraw").selector;
        cancelUserDrawSelector = gridottoFacet.interface.getFunction("cancelUserDraw").selector;
    } catch (e) {
        console.log("executeUserDraw/cancelUserDraw not found in GridottoFacet, skipping removal");
    }
    
    const cuts = [];
    
    // Only remove if functions exist
    if (executeUserDrawSelector && cancelUserDrawSelector) {
        cuts.push({
            facetAddress: ethers.ZeroAddress,
            action: FacetCutAction.Remove,
            functionSelectors: [executeUserDrawSelector, cancelUserDrawSelector]
        });
    }
    
    // Add GridottoExecutionFacet
    cuts.push({
        facetAddress: executionFacetAddress,
        action: FacetCutAction.Add,
        functionSelectors: executionSelectors
    });
    
    // Replace GridottoUIHelperFacet
    cuts.push({
        facetAddress: uiHelperFacetAddress,
        action: FacetCutAction.Replace,
        functionSelectors: getSelectors(uiHelperFacet)
    });
    
    console.log("\n4. Executing diamond cut...");
    const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("Diamond cut executed successfully!");
    
    // Update deployment addresses
    if (!deploymentData.contracts) {
        deploymentData.contracts = {};
    }
    deploymentData.contracts.GridottoExecutionFacet = executionFacetAddress;
    deploymentData.contracts.GridottoUIHelperFacet = uiHelperFacetAddress;
    deploymentData.lastUpdate = new Date().toISOString();
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    
    // Update facet map
    const facetMapPath = path.join(__dirname, "../facetmap/BraveUniverse-map.json");
    const facetMap = JSON.parse(fs.readFileSync(facetMapPath, 'utf8'));
    
    // Add execution facet to map
    facetMap.GridottoExecutionFacet = {
        address: executionFacetAddress,
        functions: [
            "executeUserDraw(uint256)",
            "cancelUserDraw(uint256)"
        ]
    };
    
    // Update UI helper facet
    facetMap.GridottoUIHelperFacet.address = uiHelperFacetAddress;
    facetMap.GridottoUIHelperFacet.functions.push(
        "getRecentWinners(uint256,uint256)",
        "getAdvancedDrawInfo(uint256)"
    );
    
    fs.writeFileSync(facetMapPath, JSON.stringify(facetMap, null, 2));
    
    console.log("\n✅ All updates completed successfully!");
    
    // Summary
    console.log("\n📋 Deployment Summary:");
    console.log("- GridottoExecutionFacet:", executionFacetAddress);
    console.log("- GridottoUIHelperFacet:", uiHelperFacetAddress);
    console.log("- Functions moved: executeUserDraw, cancelUserDraw");
    console.log("- New functions: getRecentWinners, getAdvancedDrawInfo");
    console.log("\n🔄 Changes:");
    console.log("- Platform fee: 5%");
    console.log("- Executor fee: 5% (max 5 LYX for LYX draws)");
    console.log("- Creator fee: max 10%");
    console.log("- Winner tracking enabled");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });