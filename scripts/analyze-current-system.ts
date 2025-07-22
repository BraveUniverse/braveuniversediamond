import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Analyzing Current System...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    try {
        // Get all facets
        const facetAddresses = await diamondLoupe.facetAddresses();
        console.log(`Total Facets: ${facetAddresses.length}\n`);
        
        const facetInfo: { [key: string]: string[] } = {};
        let totalFunctions = 0;
        
        // Get functions for each facet
        for (const facetAddress of facetAddresses) {
            const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
            facetInfo[facetAddress] = selectors;
            totalFunctions += selectors.length;
            console.log(`Facet ${facetAddress}: ${selectors.length} functions`);
        }
        
        console.log(`\nTotal Functions: ${totalFunctions}`);
        
        // Identify duplicate/overlapping functions
        console.log("\n📋 Function Analysis:");
        
        // Known function categories
        const categories = {
            "Draw Creation": ["createUserDraw", "createTokenDraw", "createNFTDraw"],
            "Ticket Purchase": ["buyUserDrawTicket", "buyTokenDrawTicket", "buyNFTDrawTicket", "buyTicketsFixed"],
            "View Functions": ["getUserDraw", "getTokenDraw", "getNFTDraw", "getUserDrawFixed", "isDrawActive", "getDrawStats"],
            "Execution": ["executeUserDraw", "executeTokenDraw", "executeNFTDraw", "canExecuteDraw"],
            "Claiming": ["claimUserDrawPrize", "claimTokenDrawPrize", "claimNFTDrawPrize"],
            "Admin": ["cancelDrawAsAdmin", "emergencyWithdraw", "pauseDraws", "unpauseDraws"],
            "Leaderboard": ["getTopWinners", "getTopTicketBuyers", "getTopDrawCreators", "getTopExecutors", "getPlatformStats"],
            "UI Helper": ["getActiveUserDraws", "getActiveTokenDraws", "getActiveNFTDraws", "getUserParticipatedDraws"]
        };
        
        // Save analysis for restructuring
        console.log("\n📊 Current Structure Issues:");
        console.log("1. GridottoFacet.sol is too large (1678 lines)");
        console.log("2. Duplicate view functions (getUserDraw vs getUserDrawFixed)");
        console.log("3. Multiple phase facets (Phase3, Phase4) - unclear purpose");
        console.log("4. Fixed facets created to patch issues");
        
        console.log("\n🎯 Recommended New Structure:");
        console.log("1. GridottoDrawManagementFacet - Create/Cancel draws");
        console.log("2. GridottoTicketFacet - All ticket purchase functions");
        console.log("3. GridottoExecutionFacet - Execute & claim functions");
        console.log("4. GridottoViewFacet - All view/query functions");
        console.log("5. GridottoLeaderboardFacet - Keep as is");
        console.log("6. GridottoAdminFacet - Admin functions");
        console.log("7. Remove: Phase3, Phase4, Fixed facets");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);