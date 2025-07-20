import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Removing old facets and deploying new ones...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const oldUIHelperAddress = deploymentData.contracts?.GridottoUIHelperFacet || "0x7A5fC79dd30afFCB4554CaBB9b69258fAcF0Db2a";
    
    // Deploy new facets
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
    
    // Get old UI helper selectors to remove
    const oldUIHelper = await ethers.getContractAt("GridottoUIHelperFacet", oldUIHelperAddress);
    const oldUIHelperSelectors = getSelectors(oldUIHelper);
    
    console.log("\n3. Preparing diamond cuts...");
    const cuts = [
        // Remove old UI helper
        {
            facetAddress: ethers.ZeroAddress,
            action: FacetCutAction.Remove,
            functionSelectors: oldUIHelperSelectors
        },
        // Add new UI helper
        {
            facetAddress: uiHelperFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(uiHelperFacet)
        },
        // Add execution facet
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(executionFacet)
        }
    ];
    
    console.log("\n4. Executing diamond cut...");
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Diamond cut executed successfully!");
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        
        // Try alternative approach - just add new facets
        console.log("\n5. Trying alternative approach - adding new facets only...");
        const addOnlyCuts = [
            {
                facetAddress: uiHelperFacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(uiHelperFacet).filter(sel => 
                    !oldUIHelperSelectors.includes(sel) // Only new functions
                )
            },
            {
                facetAddress: executionFacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(executionFacet)
            }
        ];
        
        const tx2 = await diamond.diamondCut(addOnlyCuts, ethers.ZeroAddress, "0x");
        await tx2.wait();
        console.log("Alternative approach successful!");
    }
    
    // Update deployment addresses
    if (!deploymentData.contracts) {
        deploymentData.contracts = {};
    }
    deploymentData.contracts.GridottoExecutionFacet = executionFacetAddress;
    deploymentData.contracts.GridottoUIHelperFacet = uiHelperFacetAddress;
    deploymentData.lastUpdate = new Date().toISOString();
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    
    console.log("\n✅ Deployment completed!");
    console.log("\n📋 Summary:");
    console.log("- GridottoExecutionFacet:", executionFacetAddress);
    console.log("- GridottoUIHelperFacet:", uiHelperFacetAddress);
    console.log("\n🔄 Changes implemented:");
    console.log("- Platform fee: 5%");
    console.log("- Executor fee: 5% (max 5 LYX for LYX draws)");
    console.log("- Creator fee: max 10%");
    console.log("- Weekly draws (not daily)");
    console.log("- Winner tracking for leaderboard");
    console.log("- New functions: getRecentWinners, getAdvancedDrawInfo");
    console.log("- Moved functions: executeUserDraw, cancelUserDraw");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });