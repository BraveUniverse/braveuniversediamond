import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying GridottoMissingFacet...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Deploy GridottoMissingFacet
    console.log("1. Deploying GridottoMissingFacet...");
    const GridottoMissingFacet = await ethers.getContractFactory("GridottoMissingFacet");
    const missingFacet = await GridottoMissingFacet.deploy();
    await missingFacet.waitForDeployment();
    const missingFacetAddress = await missingFacet.getAddress();
    console.log("GridottoMissingFacet deployed to:", missingFacetAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Prepare diamond cuts
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    // Get function selectors
    const functions = [
        "createUserDraw",
        "createTokenDraw",
        "getCreatorTokenProfit",
        "getOwnerTokenProfit",
        "withdrawCreatorTokenProfit",
        "withdrawOwnerTokenProfit"
    ];
    
    const selectors = [];
    for (const funcName of functions) {
        try {
            const func = GridottoMissingFacet.interface.getFunction(funcName);
            selectors.push(func.selector);
            console.log(`✓ Found ${funcName}`);
        } catch (e) {
            console.log(`✗ ${funcName} not found`);
        }
    }
    
    console.log(`\n2. Adding ${selectors.length} functions to Diamond...`);
    
    const cuts = [{
        facetAddress: missingFacetAddress,
        action: FacetCutAction.Add,
        functionSelectors: selectors
    }];
    
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Functions added successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.log("❌ Diamond cut failed:", error.message);
        
        // Try individual adds
        console.log("\nTrying individual adds...");
        let successCount = 0;
        
        for (let i = 0; i < selectors.length; i++) {
            try {
                const singleCut = [{
                    facetAddress: missingFacetAddress,
                    action: FacetCutAction.Add,
                    functionSelectors: [selectors[i]]
                }];
                
                const tx = await diamond.diamondCut(singleCut, ethers.ZeroAddress, "0x");
                await tx.wait();
                console.log(`✅ Added: ${functions[i]}`);
                successCount++;
            } catch (err: any) {
                console.log(`❌ Failed to add ${functions[i]}: ${err.message}`);
            }
        }
        
        console.log(`\nAdded ${successCount} out of ${selectors.length} functions`);
    }
    
    // Update deployment addresses
    deploymentData.contracts.GridottoMissingFacet = missingFacetAddress;
    deploymentData.lastUpdate = new Date().toISOString();
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    
    // Verify deployment
    console.log("\n3. Verifying deployment...");
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    console.log("\nChecking deployed functions:");
    for (const funcName of functions) {
        try {
            const func = GridottoMissingFacet.interface.getFunction(funcName);
            const facetAddr = await diamondLoupe.facetAddress(func.selector);
            
            if (facetAddr !== ethers.ZeroAddress) {
                console.log(`✅ ${funcName} is deployed at ${facetAddr}`);
            } else {
                console.log(`❌ ${funcName} is NOT deployed`);
            }
        } catch (e) {
            console.log(`❌ ${funcName} - error checking`);
        }
    }
    
    console.log("\n✅ Deployment complete!");
    console.log("GridottoMissingFacet:", missingFacetAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });