import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔍 Checking Diamond Functions...\n");
    
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
    
    // Function categories
    const weeklyMonthlyFunctions = [
        "buyTicket",
        "buyMultipleTickets", 
        "buyTicketsForAddresses",
        "executeWeeklyDraw",
        "executeMonthlyDraw",
        "claimWeeklyPrize",
        "claimMonthlyPrize"
    ];
    
    const userDrawFunctions = [
        "createUserDraw",
        "buyUserDrawTicket",
        "executeUserDraw",
        "cancelUserDraw",
        "claimUserDrawPrize",
        "forceExecuteDraw"
    ];
    
    const phase3Functions = [
        "createTokenDraw",
        "createNFTDraw",
        "buyTokenDrawTicket",
        "buyNFTDrawTicket",
        "executeTokenDraw",
        "executeNFTDraw",
        "claimTokenPrize",
        "claimNFTPrize",
        "refundDraw",
        "claimRefund"
    ];
    
    const phase4Functions = [
        "createAdvancedDraw",
        "getDrawTiers",
        "getTierNFTAssignment"
    ];
    
    const uiHelperFunctions = [
        "getUserParticipatedDraws",
        "getUserCreatedDraws",
        "getActiveUserDraws",
        "getUserDrawDetails",
        "canExecuteDraw",
        "getExpiredDrawsWaitingExecution",
        "getDrawsForCleanup"
    ];
    
    const adminFunctions = [
        "setPlatformFeePercent",
        "setMaxTicketsPerDraw",
        "setMinDrawDuration",
        "setLSP26Address",
        "setExecutorRewardConfig",
        "withdrawPlatformFees",
        "withdrawTokenFees",
        "banUser",
        "unbanUser",
        "blacklistUser",
        "removeFromBlacklist"
    ];
    
    // Check each facet
    for (const facet of facets) {
        const facetAddress = facet.facetAddress;
        const selectors = facet.functionSelectors;
        
        console.log(`\n📋 Facet: ${facetAddress}`);
        console.log(`   Functions: ${selectors.length}`);
        
        // Try to identify facet name
        let facetName = "Unknown";
        const functions: string[] = [];
        
        for (const selector of selectors) {
            try {
                // Get function name from selector
                const iface = new ethers.Interface([
                    "function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])",
                    "function facetFunctionSelectors(address) view returns (bytes4[])",
                    "function facetAddresses() view returns (address[])",
                    "function facetAddress(bytes4) view returns (address)",
                    "function supportsInterface(bytes4) view returns (bool)",
                    "function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[], address, bytes)",
                    "function owner() view returns (address)",
                    "function transferOwnership(address)",
                    ...weeklyMonthlyFunctions.map(fn => `function ${fn}()`),
                    ...userDrawFunctions.map(fn => `function ${fn}()`),
                    ...phase3Functions.map(fn => `function ${fn}()`),
                    ...phase4Functions.map(fn => `function ${fn}()`),
                    ...uiHelperFunctions.map(fn => `function ${fn}()`),
                    ...adminFunctions.map(fn => `function ${fn}()`)
                ]);
                
                const fragment = iface.getFunction(selector);
                if (fragment) {
                    functions.push(fragment.name);
                    
                    // Identify facet type
                    if (weeklyMonthlyFunctions.includes(fragment.name)) facetName = "GridottoFacet";
                    else if (userDrawFunctions.includes(fragment.name)) facetName = "GridottoFacet/ExecutionFacet";
                    else if (phase3Functions.includes(fragment.name)) facetName = "GridottoPhase3Facet";
                    else if (phase4Functions.includes(fragment.name)) facetName = "GridottoPhase4Facet";
                    else if (uiHelperFunctions.includes(fragment.name)) facetName = "GridottoUIHelperFacet";
                    else if (adminFunctions.includes(fragment.name)) facetName = "AdminFacet";
                    else if (["facets", "facetFunctionSelectors", "facetAddresses", "facetAddress"].includes(fragment.name)) facetName = "DiamondLoupeFacet";
                    else if (["diamondCut"].includes(fragment.name)) facetName = "DiamondCutFacet";
                    else if (["owner", "transferOwnership"].includes(fragment.name)) facetName = "OwnershipFacet";
                }
            } catch (e) {
                functions.push(`Unknown (${selector})`);
            }
        }
        
        console.log(`   Identified as: ${facetName}`);
        console.log(`   Functions:`, functions.join(", "));
    }
    
    // Check for missing functions
    console.log("\n\n🔍 Checking for Missing Functions...\n");
    
    // Get all function selectors from diamond
    const allSelectors: string[] = [];
    for (const facet of facets) {
        allSelectors.push(...facet.functionSelectors);
    }
    
    // Check weekly/monthly functions
    console.log("📅 Weekly/Monthly Draw Functions:");
    for (const fn of weeklyMonthlyFunctions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
    
    console.log("\n🎲 User Draw Functions:");
    for (const fn of userDrawFunctions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
    
    console.log("\n💰 Phase 3 (Token/NFT) Functions:");
    for (const fn of phase3Functions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
    
    console.log("\n🏆 Phase 4 (Advanced) Functions:");
    for (const fn of phase4Functions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
    
    console.log("\n🖥️ UI Helper Functions:");
    for (const fn of uiHelperFunctions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
    
    console.log("\n⚙️ Admin Functions:");
    for (const fn of adminFunctions) {
        const found = await checkFunction(diamondLoupe, fn);
        console.log(`   ${fn}: ${found ? "✅ Found" : "❌ Missing"}`);
    }
}

async function checkFunction(diamondLoupe: any, functionName: string): Promise<boolean> {
    try {
        // Create a minimal interface just to get selector
        const iface = new ethers.Interface([`function ${functionName}()`]);
        const selector = iface.getFunction(functionName)?.selector;
        
        if (!selector) return false;
        
        const facetAddress = await diamondLoupe.facetAddress(selector);
        return facetAddress !== ethers.ZeroAddress;
    } catch (e) {
        return false;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });