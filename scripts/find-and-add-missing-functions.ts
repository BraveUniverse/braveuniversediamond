import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔍 Finding and Adding Missing Functions to Diamond...\n");
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get Diamond contracts
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Get all contract factories
    const contractFactories = {
        "GridottoFacet": await ethers.getContractFactory("GridottoFacet"),
        "GridottoPhase3Facet": await ethers.getContractFactory("GridottoPhase3Facet"),
        "GridottoPhase4Facet": await ethers.getContractFactory("GridottoPhase4Facet"),
        "GridottoExecutionFacet": await ethers.getContractFactory("GridottoExecutionFacet"),
        "GridottoUIHelperFacet": await ethers.getContractFactory("GridottoUIHelperFacet"),
        "AdminFacet": await ethers.getContractFactory("AdminFacet"),
        "OracleFacet": await ethers.getContractFactory("OracleFacet"),
        "GridottoBatchFacet": await ethers.getContractFactory("GridottoBatchFacet")
    };
    
    // Get deployed facet addresses
    const facetAddresses = {
        "GridottoFacet": deploymentData.contracts?.GridottoFacet || "0x19dD5210C8301db68725D4e1e36B6022BB731C3f",
        "GridottoPhase3Facet": deploymentData.contracts?.GridottoPhase3FacetV2 || "0x20d8a683ba9CC258842701554d0ac0D0DFc0112B",
        "GridottoPhase4Facet": deploymentData.contracts?.GridottoPhase4Facet || "0xfF7A397d8d33f66C8cf4417D6D355CdBF62D482b",
        "GridottoExecutionFacet": deploymentData.contracts?.GridottoExecutionFacetV2 || "0xa2a91f9F002309e31277F8261c7c3F8b40feCFbA",
        "GridottoUIHelperFacet": deploymentData.contracts?.GridottoUIHelperFacetV2 || "0x22e6A9eB358643B903F16F5287cde1F9452B5998",
        "AdminFacet": deploymentData.contracts?.AdminFacet || "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D",
        "OracleFacet": deploymentData.contracts?.OracleFacet || "0x7440762Df9E369E1b7BA2942d2Bf4605B51880C2",
        "GridottoBatchFacet": deploymentData.contracts?.GridottoBatchFacet || "0x3a0804dA2a0149806Df3E27b3A29CF8056B1213A"
    };
    
    // Find all missing functions
    const missingFunctions: { [facetName: string]: string[] } = {};
    let totalMissing = 0;
    
    console.log("📋 Checking for missing functions...\n");
    
    for (const [contractName, factory] of Object.entries(contractFactories)) {
        const functions = factory.interface.fragments.filter(f => f.type === "function");
        missingFunctions[contractName] = [];
        
        for (const func of functions) {
            const selector = factory.interface.getFunction(func.name).selector;
            
            // Check if function is deployed
            const deployedFacet = await diamondLoupe.facetAddress(selector);
            
            if (deployedFacet === ethers.ZeroAddress) {
                missingFunctions[contractName].push(func.name);
                totalMissing++;
            }
        }
        
        if (missingFunctions[contractName].length > 0) {
            console.log(`${contractName}: ${missingFunctions[contractName].length} missing functions`);
            console.log(`  - ${missingFunctions[contractName].join(", ")}`);
        }
    }
    
    console.log(`\nTotal missing functions: ${totalMissing}`);
    
    if (totalMissing === 0) {
        console.log("\n✅ All functions are already deployed!");
        return;
    }
    
    // Prepare diamond cuts for missing functions
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    const cuts = [];
    
    for (const [contractName, functions] of Object.entries(missingFunctions)) {
        if (functions.length === 0) continue;
        
        const factory = contractFactories[contractName];
        const facetAddress = facetAddresses[contractName];
        
        if (!facetAddress || facetAddress === ethers.ZeroAddress) {
            console.log(`\n⚠️  No deployed address for ${contractName}, skipping...`);
            continue;
        }
        
        const selectors = [];
        for (const funcName of functions) {
            try {
                const func = factory.interface.getFunction(funcName);
                selectors.push(func.selector);
            } catch (e) {
                console.log(`Error getting selector for ${funcName}`);
            }
        }
        
        if (selectors.length > 0) {
            cuts.push({
                facetAddress: facetAddress,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            });
        }
    }
    
    // Execute diamond cuts
    console.log("\n🔨 Executing Diamond Cuts...\n");
    
    if (cuts.length === 0) {
        console.log("No valid cuts to execute.");
        return;
    }
    
    // Try adding functions in batches
    let successCount = 0;
    let failCount = 0;
    
    for (const cut of cuts) {
        const facetName = Object.entries(facetAddresses).find(([_, addr]) => addr === cut.facetAddress)?.[0] || "Unknown";
        console.log(`\nAdding functions to ${facetName}...`);
        
        // Try to add all functions for this facet at once
        try {
            const tx = await diamond.diamondCut([cut], ethers.ZeroAddress, "0x");
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log(`✅ Added ${cut.functionSelectors.length} functions successfully!`);
            successCount += cut.functionSelectors.length;
        } catch (error: any) {
            console.log("Batch add failed, trying individually...");
            
            // Try adding functions one by one
            for (const selector of cut.functionSelectors) {
                try {
                    const singleCut = [{
                        facetAddress: cut.facetAddress,
                        action: cut.action,
                        functionSelectors: [selector]
                    }];
                    
                    const tx = await diamond.diamondCut(singleCut, ethers.ZeroAddress, "0x");
                    await tx.wait();
                    
                    // Find function name
                    let funcName = "Unknown";
                    for (const [contractName, factory] of Object.entries(contractFactories)) {
                        try {
                            const func = factory.interface.getFunction(selector);
                            if (func) {
                                funcName = func.name;
                                break;
                            }
                        } catch (e) {}
                    }
                    
                    console.log(`✅ Added: ${funcName}`);
                    successCount++;
                } catch (err: any) {
                    if (err.message.includes("already exists")) {
                        console.log(`⚠️  Function already exists (might be in different facet)`);
                    } else {
                        console.log(`❌ Failed: ${err.message}`);
                        failCount++;
                    }
                }
            }
        }
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Successfully added: ${successCount} functions`);
    console.log(`❌ Failed: ${failCount} functions`);
    
    // Final verification
    console.log("\n🔍 Final verification...");
    
    let stillMissing = 0;
    for (const [contractName, factory] of Object.entries(contractFactories)) {
        const functions = factory.interface.fragments.filter(f => f.type === "function");
        const missing = [];
        
        for (const func of functions) {
            const selector = factory.interface.getFunction(func.name).selector;
            const deployedFacet = await diamondLoupe.facetAddress(selector);
            
            if (deployedFacet === ethers.ZeroAddress) {
                missing.push(func.name);
                stillMissing++;
            }
        }
        
        if (missing.length > 0) {
            console.log(`${contractName}: Still missing ${missing.length} functions`);
        }
    }
    
    if (stillMissing === 0) {
        console.log("\n🎉 All functions are now deployed!");
    } else {
        console.log(`\n⚠️  Still missing ${stillMissing} functions`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });