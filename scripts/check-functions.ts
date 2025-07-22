import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Checking functions on-chain...\n");

    const diamond = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    
    // Get all facets
    const facets = await diamond.facets();
    console.log(`Found ${facets.length} facets\n`);

    // Functions to check
    const functionsToCheck = [
        { name: "getNextDrawId", selector: "0x" },
        { name: "getPlatformStatistics", selector: "0x" }
    ];

    // Calculate selectors
    const adminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    
    try {
        functionsToCheck[0].selector = adminFacet.interface.getFunction("getNextDrawId").selector;
        functionsToCheck[1].selector = adminFacet.interface.getFunction("getPlatformStatistics").selector;
    } catch (e) {
        console.error("Error getting selectors:", e);
    }

    console.log("Functions to check:");
    functionsToCheck.forEach(f => {
        console.log(`- ${f.name}: ${f.selector}`);
    });

    // Check each function
    console.log("\nChecking on-chain...");
    for (const func of functionsToCheck) {
        try {
            const facetAddress = await diamond.facetAddress(func.selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`✅ ${func.name} exists at facet: ${facetAddress}`);
            } else {
                console.log(`❌ ${func.name} NOT FOUND on-chain`);
            }
        } catch (e) {
            console.log(`❌ ${func.name} NOT FOUND on-chain (error)`);
        }
    }

    // List all selectors in AdminFacet
    console.log("\n📋 All AdminFacet functions:");
    const adminSelectors = Object.keys(adminFacet.interface.functions).map(name => {
        const func = adminFacet.interface.getFunction(name);
        return { name, selector: func.selector };
    });
    
    adminSelectors.forEach(f => {
        console.log(`- ${f.name}: ${f.selector}`);
    });

    // Check which AdminFacet functions are on-chain
    console.log("\n🔍 Checking which AdminFacet functions are deployed:");
    for (const func of adminSelectors) {
        try {
            const facetAddress = await diamond.facetAddress(func.selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`✅ ${func.name}`);
            }
        } catch (e) {
            // Silent fail
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });