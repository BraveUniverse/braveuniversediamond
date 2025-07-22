import { ethers } from "hardhat";
import fs from "fs";

async function main() {
    console.log("📋 Listing All Functions by Facet...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Known facet contracts for mapping
    const facetContracts: { [key: string]: string } = {
        "GridottoFacet": "0x19dD5210C8301db68725D4e1e36B6022BB731C3f",
        "GridottoMissingFacet": "0x6A654c9b8F9Cfe304429fAbe3F20B4d092996E2d",
        "GridottoFixedViewFacet": "0x5Fce5CE5F5b13458218DB5856D84Ca25476BBcFa",
        "GridottoFixedPurchaseFacet": "0x43a60b7adFf659Daa896CA7d6D0b83A0337415a0",
        "GridottoLeaderboardFacet": "0x362630096659c10F2b11d57e3a13a94F11E62685",
        "GridottoExecutionFacet": "0x7440762Df9E369E1b7BA2942d2Bf4605B51880C2",
        "GridottoUIHelperFacet": "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D",
        "AdminFacet": "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B"
    };
    
    // Reverse mapping
    const addressToName: { [key: string]: string } = {};
    for (const [name, address] of Object.entries(facetContracts)) {
        addressToName[address.toLowerCase()] = name;
    }
    
    try {
        const facetAddresses = await diamondLoupe.facetAddresses();
        const allFunctions: { [category: string]: string[] } = {
            "Draw Creation": [],
            "Ticket Purchase": [],
            "View Functions": [],
            "Execution": [],
            "Claiming": [],
            "Admin": [],
            "Leaderboard": [],
            "UI Helper": [],
            "Other": []
        };
        
        for (const facetAddress of facetAddresses) {
            const facetName = addressToName[facetAddress.toLowerCase()] || facetAddress;
            const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
            
            console.log(`\n${facetName}:`);
            console.log(`Address: ${facetAddress}`);
            console.log(`Functions: ${selectors.length}`);
            
            // Try to get function names from known interfaces
            for (const selector of selectors) {
                // Categorize based on selector patterns
                let category = "Other";
                let functionName = selector;
                
                // Try to decode function name
                try {
                    // Common function patterns
                    if (selector.includes("create")) category = "Draw Creation";
                    else if (selector.includes("buy") || selector.includes("purchase")) category = "Ticket Purchase";
                    else if (selector.includes("get") || selector.includes("view")) category = "View Functions";
                    else if (selector.includes("execute")) category = "Execution";
                    else if (selector.includes("claim")) category = "Claiming";
                    else if (selector.includes("admin") || selector.includes("emergency")) category = "Admin";
                    else if (selector.includes("Top") || selector.includes("leaderboard")) category = "Leaderboard";
                    else if (selector.includes("active") || selector.includes("participated")) category = "UI Helper";
                    
                    console.log(`  - ${selector} (${category})`);
                    allFunctions[category].push(`${facetName}.${selector}`);
                } catch (e) {
                    console.log(`  - ${selector}`);
                }
            }
        }
        
        // Summary
        console.log("\n\n📊 FUNCTION SUMMARY BY CATEGORY:");
        console.log("================================");
        
        for (const [category, functions] of Object.entries(allFunctions)) {
            if (functions.length > 0) {
                console.log(`\n${category}: ${functions.length} functions`);
                functions.forEach(f => console.log(`  - ${f}`));
            }
        }
        
        // Save to file for restructuring
        fs.writeFileSync("function-analysis.json", JSON.stringify({
            totalFacets: facetAddresses.length,
            totalFunctions: facetAddresses.reduce((sum, addr) => sum + allFunctions[addr]?.length || 0, 0),
            facetMapping: addressToName,
            functionsByCategory: allFunctions
        }, null, 2));
        
        console.log("\n✅ Analysis saved to function-analysis.json");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);