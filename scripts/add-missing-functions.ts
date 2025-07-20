import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔧 Adding Missing Functions to Diamond...\n");
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Define missing functions and their facets
    const missingFunctions = [
        {
            facetName: "GridottoFacet",
            functions: [
                "createAdvancedDraw",
                "createTokenDraw", 
                "createUserDraw",
                "getCreatorTokenProfit",
                "getOwnerTokenProfit",
                "withdrawCreatorTokenProfit",
                "withdrawOwnerTokenProfit"
            ]
        },
        {
            facetName: "GridottoPhase3Facet", 
            functions: [
                "createTokenDraw"
            ]
        },
        {
            facetName: "GridottoPhase4Facet",
            functions: [
                "createAdvancedDraw"
            ]
        }
    ];
    
    // Also need to add executeWeeklyDraw - check which facet has it
    const executeWeeklyDrawFacet = "GridottoFacet";
    
    console.log("📋 Missing Functions to Add:");
    console.log("1. executeWeeklyDraw");
    console.log("2. createAdvancedDraw");
    console.log("3. createTokenDraw");
    console.log("4. createUserDraw");
    console.log("5. getCreatorTokenProfit");
    console.log("6. getOwnerTokenProfit");
    console.log("7. withdrawCreatorTokenProfit");
    console.log("8. withdrawOwnerTokenProfit");
    console.log("\nTotal: 8 unique functions (some are in multiple facets)\n");
    
    // Deploy new facets if needed or use existing ones
    console.log("🚀 Deploying/Getting Facets...\n");
    
    // Get existing deployed facets from deployment data
    const gridottoFacetAddress = deploymentData.contracts?.GridottoFacet || "0x19dD5210C8301db68725D4e1e36B6022BB731C3f";
    const phase3FacetAddress = deploymentData.contracts?.GridottoPhase3FacetV2 || "0x20d8a683ba9CC258842701554d0ac0D0DFc0112B";
    const phase4FacetAddress = deploymentData.contracts?.GridottoPhase4Facet || "0xfF7A397d8d33f66C8cf4417D6D355CdBF62D482b";
    
    console.log("Using existing facets:");
    console.log("- GridottoFacet:", gridottoFacetAddress);
    console.log("- Phase3Facet:", phase3FacetAddress);
    console.log("- Phase4Facet:", phase4FacetAddress);
    
    // Get contract factories to extract selectors
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const GridottoPhase3Facet = await ethers.getContractFactory("GridottoPhase3Facet");
    const GridottoPhase4Facet = await ethers.getContractFactory("GridottoPhase4Facet");
    
    // Prepare diamond cuts
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    const cuts = [];
    
    // Add executeWeeklyDraw from GridottoFacet
    const executeWeeklyDrawSelector = GridottoFacet.interface.getFunction("executeWeeklyDraw").selector;
    cuts.push({
        facetAddress: gridottoFacetAddress,
        action: FacetCutAction.Add,
        functionSelectors: [executeWeeklyDrawSelector]
    });
    
    // Add missing GridottoFacet functions
    const gridottoMissingFunctions = [
        "createUserDraw",
        "getCreatorTokenProfit",
        "getOwnerTokenProfit", 
        "withdrawCreatorTokenProfit",
        "withdrawOwnerTokenProfit"
    ];
    
    const gridottoSelectors = [];
    for (const funcName of gridottoMissingFunctions) {
        try {
            const func = GridottoFacet.interface.getFunction(funcName);
            if (func) {
                gridottoSelectors.push(func.selector);
                console.log(`✓ Found ${funcName} in GridottoFacet`);
            }
        } catch (e) {
            console.log(`✗ ${funcName} not found in GridottoFacet`);
        }
    }
    
    if (gridottoSelectors.length > 0) {
        cuts.push({
            facetAddress: gridottoFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: gridottoSelectors
        });
    }
    
    // Add createTokenDraw from Phase3 (if it exists there)
    try {
        const createTokenDrawFunc = GridottoPhase3Facet.interface.getFunction("createTokenDraw");
        if (createTokenDrawFunc) {
            cuts.push({
                facetAddress: phase3FacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: [createTokenDrawFunc.selector]
            });
            console.log("✓ Found createTokenDraw in Phase3Facet");
        }
    } catch (e) {
        console.log("✗ createTokenDraw not found in Phase3Facet");
    }
    
    // Add createAdvancedDraw from Phase4
    try {
        const createAdvancedDrawFunc = GridottoPhase4Facet.interface.getFunction("createAdvancedDraw");
        if (createAdvancedDrawFunc) {
            cuts.push({
                facetAddress: phase4FacetAddress,
                action: FacetCutAction.Add,
                functionSelectors: [createAdvancedDrawFunc.selector]
            });
            console.log("✓ Found createAdvancedDraw in Phase4Facet");
        }
    } catch (e) {
        console.log("✗ createAdvancedDraw not found in Phase4Facet");
    }
    
    // Execute diamond cuts
    console.log("\n🔨 Executing Diamond Cuts...\n");
    
    try {
        // Try all at once first
        console.log(`Adding ${cuts.length} function groups...`);
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ All functions added successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
    } catch (error: any) {
        console.log("Batch add failed, trying individually...\n");
        
        // Try adding functions one by one
        let successCount = 0;
        let failCount = 0;
        
        for (const cut of cuts) {
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
                    try {
                        if (cut.facetAddress === gridottoFacetAddress) {
                            funcName = GridottoFacet.interface.getFunction(selector)?.name || "Unknown";
                        } else if (cut.facetAddress === phase3FacetAddress) {
                            funcName = GridottoPhase3Facet.interface.getFunction(selector)?.name || "Unknown";
                        } else if (cut.facetAddress === phase4FacetAddress) {
                            funcName = GridottoPhase4Facet.interface.getFunction(selector)?.name || "Unknown";
                        }
                    } catch (e) {}
                    
                    console.log(`✅ Added: ${funcName}`);
                    successCount++;
                } catch (err: any) {
                    console.log(`❌ Failed to add function: ${err.message}`);
                    failCount++;
                }
            }
        }
        
        console.log(`\n📊 Results: ${successCount} added, ${failCount} failed`);
    }
    
    // Verify additions
    console.log("\n🔍 Verifying additions...");
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    const criticalFunctions = [
        "executeWeeklyDraw",
        "createUserDraw",
        "createTokenDraw",
        "createAdvancedDraw"
    ];
    
    for (const funcName of criticalFunctions) {
        try {
            let selector;
            try {
                selector = GridottoFacet.interface.getFunction(funcName).selector;
            } catch {
                try {
                    selector = GridottoPhase3Facet.interface.getFunction(funcName).selector;
                } catch {
                    try {
                        selector = GridottoPhase4Facet.interface.getFunction(funcName).selector;
                    } catch {
                        console.log(`⚠️  ${funcName}: Cannot find selector`);
                        continue;
                    }
                }
            }
            
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`✅ ${funcName}: Deployed at ${facetAddress}`);
            } else {
                console.log(`❌ ${funcName}: Not found in diamond`);
            }
        } catch (e) {
            console.log(`❌ ${funcName}: Error checking`);
        }
    }
    
    console.log("\n✨ Diamond update complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });