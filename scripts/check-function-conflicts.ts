import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Checking for function conflicts...\n");

    // Deploy facets temporarily to get their selectors
    const GridottoCoreFacet = await ethers.getContractFactory("GridottoCoreFacet");
    const coreFacet = await GridottoCoreFacet.deploy();
    await coreFacet.waitForDeployment();

    const GridottoExecutionFacetSimple = await ethers.getContractFactory("GridottoExecutionFacetSimple");
    const executionFacet = await GridottoExecutionFacetSimple.deploy();
    await executionFacet.waitForDeployment();

    const GridottoAdminFacetSimple = await ethers.getContractFactory("GridottoAdminFacetSimple");
    const adminFacet = await GridottoAdminFacetSimple.deploy();
    await adminFacet.waitForDeployment();

    const GridottoLeaderboardFacetSimple = await ethers.getContractFactory("GridottoLeaderboardFacetSimple");
    const leaderboardFacet = await GridottoLeaderboardFacetSimple.deploy();
    await leaderboardFacet.waitForDeployment();

    // Get selectors
    const coreSelectors = getSelectors(coreFacet);
    const executionSelectors = getSelectors(executionFacet);
    const adminSelectors = getSelectors(adminFacet);
    const leaderboardSelectors = getSelectors(leaderboardFacet);

    // Get current diamond state
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    const currentFacets = await diamondLoupe.facetAddresses();
    
    // Build map of existing selectors
    const existingSelectors = new Map<string, string>();
    for (const facetAddress of currentFacets) {
        const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        for (const selector of selectors) {
            existingSelectors.set(selector, facetAddress);
        }
    }

    // Check conflicts
    console.log("📊 Checking Core Facet:");
    checkConflicts("GridottoCoreFacet", coreSelectors, existingSelectors, coreFacet);

    console.log("\n📊 Checking Execution Facet:");
    checkConflicts("GridottoExecutionFacetSimple", executionSelectors, existingSelectors, executionFacet);

    console.log("\n📊 Checking Admin Facet:");
    checkConflicts("GridottoAdminFacetSimple", adminSelectors, existingSelectors, adminFacet);

    console.log("\n📊 Checking Leaderboard Facet:");
    checkConflicts("GridottoLeaderboardFacetSimple", leaderboardSelectors, existingSelectors, leaderboardFacet);
}

function checkConflicts(facetName: string, selectors: string[], existing: Map<string, string>, contract: any) {
    const conflicts = [];
    const safe = [];

    for (const selector of selectors) {
        if (existing.has(selector)) {
            const funcName = getFunctionName(contract, selector);
            conflicts.push({ selector, funcName, existingFacet: existing.get(selector) });
        } else {
            const funcName = getFunctionName(contract, selector);
            safe.push({ selector, funcName });
        }
    }

    if (conflicts.length > 0) {
        console.log(`❌ Conflicts found: ${conflicts.length}`);
        conflicts.forEach(c => {
            console.log(`   - ${c.funcName} (${c.selector}) already in ${c.existingFacet}`);
        });
    }

    if (safe.length > 0) {
        console.log(`✅ Safe to add: ${safe.length} functions`);
    }
}

function getFunctionName(contract: any, selector: string): string {
    let funcName = "unknown";
    contract.interface.forEachFunction((func: any) => {
        if (func.selector === selector) {
            funcName = func.name;
        }
    });
    return funcName;
}

function getSelectors(contract: any): string[] {
    const selectors = [];
    contract.interface.forEachFunction((func: any) => {
        if (func.name !== "init") {
            selectors.push(func.selector);
        }
    });
    return selectors;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });