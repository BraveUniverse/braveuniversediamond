import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Checking Leaderboard Functions...\n");

    const [signer] = await ethers.getSigners();
    
    // Get Diamond Loupe
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    
    // Get leaderboard facet address
    const leaderboardAddress = "0xF9b3baCd4AeE31BEc0940dd03647Fb9152C176D3";
    
    // Get function selectors for this facet
    const selectors = await diamondLoupe.facetFunctionSelectors(leaderboardAddress);
    console.log(`Leaderboard Facet has ${selectors.length} functions:\n`);
    
    // Try to get the leaderboard contract
    try {
        const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", DIAMOND_ADDRESS);
        
        // List all functions in the interface
        console.log("Functions in GridottoLeaderboardFacet interface:");
        leaderboard.interface.forEachFunction((func) => {
            console.log(`- ${func.name}`);
        });
        
        // Test each function
        console.log("\n📊 Testing functions:");
        
        try {
            console.log("\n1. Testing getTopWinners(10)...");
            const winners = await leaderboard.getTopWinners(10);
            console.log("✅ getTopWinners works! Result length:", winners.length);
        } catch (error: any) {
            console.log("❌ getTopWinners failed:", error.message);
        }
        
        try {
            console.log("\n2. Testing getTopTicketBuyers(10)...");
            const buyers = await leaderboard.getTopTicketBuyers(10);
            console.log("✅ getTopTicketBuyers works! Result length:", buyers.length);
        } catch (error: any) {
            console.log("❌ getTopTicketBuyers failed:", error.message);
        }
        
        try {
            console.log("\n3. Testing getTopDrawCreators(10)...");
            const creators = await leaderboard.getTopDrawCreators(10);
            console.log("✅ getTopDrawCreators works! Result length:", creators.length);
        } catch (error: any) {
            console.log("❌ getTopDrawCreators failed:", error.message);
        }
        
        try {
            console.log("\n4. Testing getTopExecutors(10)...");
            const executors = await leaderboard.getTopExecutors(10);
            console.log("✅ getTopExecutors works! Result length:", executors.length);
        } catch (error: any) {
            console.log("❌ getTopExecutors failed:", error.message);
        }
        
        try {
            console.log("\n5. Testing getPlatformStats()...");
            const stats = await leaderboard.getPlatformStats();
            console.log("✅ getPlatformStats works!");
            console.log("- Total prizes:", ethers.formatEther(stats.totalPrizesDistributed));
            console.log("- Total tickets:", stats.totalTicketsSold.toString());
            console.log("- Total draws:", stats.totalDrawsCreated.toString());
            console.log("- Total executions:", stats.totalExecutions.toString());
        } catch (error: any) {
            console.log("❌ getPlatformStats failed:", error.message);
        }
        
    } catch (error: any) {
        console.error("Error getting contract:", error.message);
    }
    
    // Decode selectors
    console.log("\n📋 Function selectors in leaderboard facet:");
    for (const selector of selectors) {
        console.log(`- ${selector}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });