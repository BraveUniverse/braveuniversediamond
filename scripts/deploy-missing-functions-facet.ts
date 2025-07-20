import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying New GridottoFacet for Missing Functions...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Deploy new GridottoFacet
    console.log("\n1. Deploying new GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const gridottoFacetAddress = await gridottoFacet.getAddress();
    console.log("GridottoFacet deployed to:", gridottoFacetAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Prepare diamond cuts for missing functions
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    // Missing functions from GridottoFacet
    const missingFunctions = [
        "createAdvancedDraw",
        "createTokenDraw", 
        "createUserDraw",
        "getCreatorTokenProfit",
        "getOwnerTokenProfit",
        "withdrawCreatorTokenProfit",
        "withdrawOwnerTokenProfit"
    ];
    
    console.log("\n2. Adding missing functions to Diamond...");
    console.log("Functions to add:", missingFunctions.join(", "));
    
    const selectors = [];
    const foundFunctions = [];
    
    for (const funcName of missingFunctions) {
        try {
            const func = GridottoFacet.interface.getFunction(funcName);
            if (func) {
                selectors.push(func.selector);
                foundFunctions.push(funcName);
            }
        } catch (e) {
            console.log(`⚠️  Function ${funcName} not found in contract`);
        }
    }
    
    console.log(`\nFound ${foundFunctions.length} functions in contract`);
    
    if (selectors.length > 0) {
        const cuts = [{
            facetAddress: gridottoFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: selectors
        }];
        
        try {
            console.log("\nExecuting diamond cut...");
            const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
            console.log("Transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Functions added successfully!");
            console.log("Gas used:", receipt.gasUsed.toString());
        } catch (error: any) {
            console.log("❌ Diamond cut failed:", error.message);
            
            // Try adding functions one by one
            console.log("\nTrying to add functions individually...");
            let successCount = 0;
            
            for (let i = 0; i < selectors.length; i++) {
                const selector = selectors[i];
                const funcName = foundFunctions[i];
                
                try {
                    const singleCut = [{
                        facetAddress: gridottoFacetAddress,
                        action: FacetCutAction.Add,
                        functionSelectors: [selector]
                    }];
                    
                    const tx = await diamond.diamondCut(singleCut, ethers.ZeroAddress, "0x");
                    await tx.wait();
                    console.log(`✅ Added: ${funcName}`);
                    successCount++;
                } catch (err: any) {
                    console.log(`❌ Failed to add ${funcName}: ${err.message}`);
                }
            }
            
            console.log(`\nAdded ${successCount} out of ${selectors.length} functions`);
        }
    }
    
    // Update deployment addresses
    deploymentData.contracts.GridottoFacetV2 = gridottoFacetAddress;
    deploymentData.lastUpdate = new Date().toISOString();
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    
    console.log("\n✅ Deployment complete!");
    console.log("GridottoFacet V2:", gridottoFacetAddress);
    
    // Verify what functions are now available
    console.log("\n🔍 Verifying deployment...");
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    for (const funcName of foundFunctions) {
        try {
            const func = GridottoFacet.interface.getFunction(funcName);
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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });