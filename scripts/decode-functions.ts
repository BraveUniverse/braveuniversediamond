import { ethers } from "hardhat";
import fs from "fs";

async function main() {
    console.log("🔍 Decoding Function Names...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Known function signatures
    const knownSignatures: { [key: string]: string } = {
        // Draw Creation
        "0xd9422c31": "createUserDraw",
        "0x88b22ca9": "createUserDraw", // From MissingFacet
        "0x93d4fa3c": "createTokenDraw",
        
        // Ticket Purchase  
        "0xd6be15d1": "buyUserDrawTicket",
        "0xaf4980b8": "buyTicketsFixed",
        "0x94e1ab3f": "buyMultipleDrawsFixed",
        "0x85a37747": "getTicketCost",
        
        // View Functions
        "0x1b00210c": "getUserDraw",
        "0xfbf39f2f": "getUserDrawFixed",
        "0xe03fd426": "isDrawActive", 
        "0x09ddc03c": "getDrawStats",
        "0x5588ad7c": "getActiveDraws",
        "0x371b6d0f": "getDrawTiming",
        "0xc7f9b651": "getUserDrawInfo",
        "0x6a864363": "getDrawParticipantsWithTickets",
        "0x018c9933": "getDrawPrizeConfig",
        
        // Execution
        "0xf94dced3": "executeUserDraw",
        "0xda6fba5e": "executeTokenDraw",
        "0xbfdf2723": "executeNFTDraw",
        "0x34a98f98": "canExecuteDraw",
        
        // Claiming
        "0x6481c5e6": "claimUserDrawPrize",
        "0xd3a8c52e": "claimTokenDrawPrize",
        "0xdbdff2c1": "claimNFTDrawPrize",
        
        // Admin
        "0xc75ec1dd": "cancelDrawAsAdmin",
        "0x3c4a901a": "emergencyWithdraw",
        "0x8456cb59": "pause",
        "0x3f4ba83a": "unpause",
        "0x16c38b3c": "setPaused",
        
        // Leaderboard
        "0xe44ad38c": "getTopWinners",
        "0x295d787c": "getTopTicketBuyers",
        "0x533c6ecf": "getTopDrawCreators",
        "0x48c77327": "getTopExecutors",
        "0xad527a16": "getPlatformStats",
        
        // UI Helper
        "0xcab230d2": "getActiveUserDraws",
        "0x33974e54": "getActiveTokenDraws",
        "0xf3160745": "getActiveNFTDraws",
        "0x249048f7": "getUserParticipatedDraws",
        
        // Diamond Standard
        "0x1f931c1c": "diamondCut",
        "0xcdffacc6": "facetAddress",
        "0x52ef6b2c": "facetAddresses",
        "0xadfca15e": "facetFunctionSelectors",
        "0x7a0ed627": "facets",
        "0x01ffc9a7": "supportsInterface",
        "0x8da5cb5b": "owner",
        "0xf2fde38b": "transferOwnership"
    };
    
    // Get all facets and their functions
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const facetAddresses = await diamondLoupe.facetAddresses();
    
    const functionsByCategory: { [key: string]: any[] } = {
        "Draw Creation": [],
        "Ticket Purchase": [],
        "View Functions": [],
        "Execution": [],
        "Claiming": [],
        "Admin": [],
        "Leaderboard": [],
        "UI Helper": [],
        "Diamond Standard": [],
        "Unknown": []
    };
    
    for (const facetAddress of facetAddresses) {
        const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        
        for (const selector of selectors) {
            const functionName = knownSignatures[selector] || selector;
            
            // Categorize
            let category = "Unknown";
            if (functionName.includes("create")) category = "Draw Creation";
            else if (functionName.includes("buy") || functionName.includes("Ticket") || functionName.includes("purchase")) category = "Ticket Purchase";
            else if (functionName.includes("get") || functionName.includes("view") || functionName.includes("is")) category = "View Functions";
            else if (functionName.includes("execute")) category = "Execution";
            else if (functionName.includes("claim")) category = "Claiming";
            else if (functionName.includes("admin") || functionName.includes("emergency") || functionName.includes("pause") || functionName.includes("cancel")) category = "Admin";
            else if (functionName.includes("Top") || functionName.includes("leaderboard") || functionName.includes("Platform")) category = "Leaderboard";
            else if (functionName.includes("active") || functionName.includes("participated")) category = "UI Helper";
            else if (functionName.includes("diamond") || functionName.includes("facet") || functionName.includes("owner")) category = "Diamond Standard";
            
            functionsByCategory[category].push({
                name: functionName,
                selector: selector,
                facet: facetAddress
            });
        }
    }
    
    // Print categorized functions
    console.log("📊 FUNCTIONS BY CATEGORY:");
    console.log("========================\n");
    
    let totalFunctions = 0;
    for (const [category, functions] of Object.entries(functionsByCategory)) {
        if (functions.length > 0) {
            console.log(`${category}: ${functions.length} functions`);
            console.log("-".repeat(50));
            
            functions.forEach(f => {
                console.log(`  ${f.name} (${f.selector})`);
                console.log(`    Facet: ${f.facet}`);
            });
            console.log("");
            
            totalFunctions += functions.length;
        }
    }
    
    console.log(`\nTotal Functions: ${totalFunctions}`);
    
    // Identify duplicates
    console.log("\n⚠️  DUPLICATE FUNCTIONS:");
    console.log("========================");
    
    const functionCounts: { [key: string]: number } = {};
    for (const functions of Object.values(functionsByCategory)) {
        for (const f of functions) {
            if (f.name !== f.selector) { // Only named functions
                functionCounts[f.name] = (functionCounts[f.name] || 0) + 1;
            }
        }
    }
    
    for (const [name, count] of Object.entries(functionCounts)) {
        if (count > 1) {
            console.log(`${name}: ${count} instances`);
        }
    }
    
    // Save analysis
    fs.writeFileSync("decoded-functions.json", JSON.stringify({
        totalFunctions,
        functionsByCategory,
        duplicates: Object.entries(functionCounts).filter(([_, count]) => count > 1)
    }, null, 2));
    
    console.log("\n✅ Analysis saved to decoded-functions.json");
}

main().catch(console.error);