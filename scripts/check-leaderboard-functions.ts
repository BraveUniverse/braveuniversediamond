import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking Leaderboard Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get diamond loupe
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Function selectors from deployment attempt
    const leaderboardSelectors = [
        "0x3e68aa3a", // getTopWinners
        "0xd13cff6c", // getTopTicketBuyers
        "0x64e044f1", // getTopDrawCreators
        "0xef23eb20", // getTopExecutors
        "0x136d8883"  // getPlatformStats
    ];
    
    const functionNames = [
        "getTopWinners",
        "getTopTicketBuyers", 
        "getTopDrawCreators",
        "getTopExecutors",
        "getPlatformStats"
    ];
    
    console.log("Checking function existence:");
    
    let existingFunctions = [];
    let newFunctions = [];
    
    for (let i = 0; i < leaderboardSelectors.length; i++) {
        try {
            const facetAddress = await diamondLoupe.facetAddress(leaderboardSelectors[i]);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`✅ ${functionNames[i]} (${leaderboardSelectors[i]}) exists at: ${facetAddress}`);
                existingFunctions.push(leaderboardSelectors[i]);
            } else {
                console.log(`❌ ${functionNames[i]} (${leaderboardSelectors[i]}) NOT found`);
                newFunctions.push(leaderboardSelectors[i]);
            }
        } catch (e) {
            console.log(`❌ ${functionNames[i]} (${leaderboardSelectors[i]}) NOT found`);
            newFunctions.push(leaderboardSelectors[i]);
        }
    }
    
    if (newFunctions.length > 0) {
        console.log(`\n📝 ${newFunctions.length} new functions can be added`);
        console.log("New selectors:", newFunctions);
    }
    
    if (existingFunctions.length > 0) {
        console.log(`\n⚠️  ${existingFunctions.length} functions already exist`);
        console.log("Existing selectors:", existingFunctions);
    }
}

main().catch(console.error);