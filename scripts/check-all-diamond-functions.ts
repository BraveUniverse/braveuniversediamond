import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔍 Checking ALL Diamond Functions...\n");
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get DiamondLoupe facet
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Get all facets
    const facets = await diamondLoupe.facets();
    
    console.log(`Diamond Address: ${diamondAddress}`);
    console.log(`Total Facets: ${facets.length}\n`);
    
    // Get all contract factories to extract selectors
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
    
    // Extract all function selectors from contracts
    const contractSelectors: { [key: string]: { [selector: string]: string } } = {};
    
    for (const [contractName, factory] of Object.entries(contractFactories)) {
        contractSelectors[contractName] = {};
        const functions = factory.interface.fragments.filter(f => f.type === "function");
        
        for (const func of functions) {
            const selector = factory.interface.getFunction(func.name).selector;
            contractSelectors[contractName][selector] = func.name;
        }
    }
    
    // Map deployed facets to their functions
    const deployedFunctions = new Set<string>();
    const facetMapping: { [address: string]: string[] } = {};
    
    console.log("📋 Deployed Facets:\n");
    
    for (const facet of facets) {
        const facetAddress = facet.facetAddress;
        const selectors = facet.functionSelectors;
        const functions: string[] = [];
        
        // Try to identify which contract this facet is
        let facetName = "Unknown";
        let matchCount = 0;
        
        for (const [contractName, selectorMap] of Object.entries(contractSelectors)) {
            let currentMatch = 0;
            for (const selector of selectors) {
                if (selectorMap[selector]) {
                    currentMatch++;
                }
            }
            if (currentMatch > matchCount) {
                matchCount = currentMatch;
                facetName = contractName;
            }
        }
        
        // Get function names
        for (const selector of selectors) {
            let funcName = "Unknown";
            for (const [contractName, selectorMap] of Object.entries(contractSelectors)) {
                if (selectorMap[selector]) {
                    funcName = selectorMap[selector];
                    deployedFunctions.add(funcName);
                    break;
                }
            }
            functions.push(funcName);
        }
        
        facetMapping[facetAddress] = functions;
        
        console.log(`Facet: ${facetAddress}`);
        console.log(`  Type: ${facetName}`);
        console.log(`  Functions (${functions.length}): ${functions.slice(0, 5).join(", ")}${functions.length > 5 ? "..." : ""}`);
        console.log();
    }
    
    // Check for missing functions
    console.log("\n🔍 Function Deployment Status:\n");
    
    for (const [contractName, selectorMap] of Object.entries(contractSelectors)) {
        console.log(`\n${contractName}:`);
        const functions = Object.values(selectorMap);
        
        for (const func of functions) {
            const isDeployed = deployedFunctions.has(func);
            console.log(`  ${func}: ${isDeployed ? "✅ Deployed" : "❌ Not Deployed"}`);
        }
    }
    
    // Summary
    console.log("\n📊 Summary:");
    let totalFunctions = 0;
    let deployedCount = deployedFunctions.size;
    
    for (const selectorMap of Object.values(contractSelectors)) {
        totalFunctions += Object.keys(selectorMap).length;
    }
    
    console.log(`Total Functions in Contracts: ${totalFunctions}`);
    console.log(`Deployed Functions: ${deployedCount}`);
    console.log(`Missing Functions: ${totalFunctions - deployedCount}`);
    
    // List critical missing functions
    const criticalFunctions = [
        "buyTicket",
        "executeWeeklyDraw",
        "createUserDraw",
        "createTokenDraw",
        "createNFTDraw",
        "createAdvancedDraw"
    ];
    
    console.log("\n⚠️  Critical Missing Functions:");
    for (const func of criticalFunctions) {
        if (!deployedFunctions.has(func)) {
            console.log(`  - ${func}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });