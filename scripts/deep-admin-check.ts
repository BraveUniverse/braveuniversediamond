import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Deep Admin Function Check");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    try {
        // Admin function selectors we're trying to add
        const adminV2Interface = (await ethers.getContractFactory("GridottoAdminFacetV2")).interface;
        const functionsToAdd = [
            "pauseSystem",
            "unpauseSystem",
            "isPaused",
            "withdrawPlatformFees",
            "withdrawTokenFees",
            "getPlatformFeesLYX",
            "getPlatformFeesToken",
            "setFeePercentages",
            "getSystemStats",
            "getNextDrawId",
            "forceSetNextDrawId",
            "getPlatformStatistics",
            "emergencyWithdraw",
            "forceExecuteDraw"
        ];
        
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        
        console.log("\n📋 Checking which functions already exist:");
        
        const existingFunctions = [];
        const missingFunctions = [];
        
        for (const funcName of functionsToAdd) {
            const selector = adminV2Interface.getFunction(funcName).selector;
            
            try {
                const facetAddress = await loupeFacet.facetAddress(selector);
                if (facetAddress !== ethers.ZeroAddress) {
                    existingFunctions.push({
                        name: funcName,
                        selector: selector,
                        facet: facetAddress
                    });
                } else {
                    missingFunctions.push({
                        name: funcName,
                        selector: selector
                    });
                }
            } catch (error) {
                missingFunctions.push({
                    name: funcName,
                    selector: selector
                });
            }
        }
        
        console.log("\n✅ Already exist:");
        for (const func of existingFunctions) {
            console.log(`- ${func.name} (${func.selector}) in ${func.facet}`);
        }
        
        console.log("\n❌ Missing (need to add):");
        for (const func of missingFunctions) {
            console.log(`- ${func.name} (${func.selector})`);
        }
        
        // Get all facets
        console.log("\n📊 All facets:");
        const facets = await loupeFacet.facets();
        for (let i = 0; i < facets.length; i++) {
            console.log(`${i + 1}. ${facets[i].facetAddress} (${facets[i].functionSelectors.length} functions)`);
        }
        
        console.log("\n💡 SOLUTION:");
        if (existingFunctions.length > 0) {
            console.log("1. Remove these existing functions first");
            console.log("2. Then add all AdminFacetV2 functions");
        } else {
            console.log("All functions are missing, can add AdminFacetV2 directly");
        }
        
    } catch (error) {
        console.error("\n❌ Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });