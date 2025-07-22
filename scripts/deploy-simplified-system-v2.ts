import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Essential facets to keep (Diamond standard)
const ESSENTIAL_FACETS = [
    "DiamondCutFacet",
    "DiamondLoupeFacet", 
    "OwnershipFacet"
];

async function main() {
    console.log("🚀 Deploying Simplified Gridotto System V2...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new facets
    console.log("\n📦 Deploying new facets...");
    
    const GridottoCoreFacet = await ethers.getContractFactory("GridottoCoreFacet");
    const coreFacet = await GridottoCoreFacet.deploy();
    await coreFacet.waitForDeployment();
    const coreFacetAddress = await coreFacet.getAddress();
    console.log("✅ GridottoCoreFacet deployed:", coreFacetAddress);

    const GridottoExecutionFacet = await ethers.getContractFactory("GridottoExecutionFacet");
    const executionFacet = await GridottoExecutionFacet.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("✅ GridottoExecutionFacet deployed:", executionFacetAddress);

    const GridottoAdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    const adminFacet = await GridottoAdminFacet.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("✅ GridottoAdminFacet deployed:", adminFacetAddress);

    const GridottoLeaderboardFacet = await ethers.getContractFactory("GridottoLeaderboardFacet");
    const leaderboardFacet = await GridottoLeaderboardFacet.deploy();
    await leaderboardFacet.waitForDeployment();
    const leaderboardFacetAddress = await leaderboardFacet.getAddress();
    console.log("✅ GridottoLeaderboardFacet deployed:", leaderboardFacetAddress);

    // Get function selectors
    console.log("\n🔍 Getting function selectors...");
    
    const coreSelectors = getSelectors(coreFacet);
    const executionSelectors = getSelectors(executionFacet);
    const adminSelectors = getSelectors(adminFacet);
    const leaderboardSelectors = getSelectors(leaderboardFacet);

    console.log(`Core functions: ${coreSelectors.length}`);
    console.log(`Execution functions: ${executionSelectors.length}`);
    console.log(`Admin functions: ${adminSelectors.length}`);
    console.log(`Leaderboard functions: ${leaderboardSelectors.length}`);

    // Get DiamondCutFacet
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);

    // Get all current facets
    console.log("\n🗑️  Removing ALL non-essential facets...");
    const currentFacets = await diamondLoupe.facetAddresses();
    
    // Build cut array - first remove everything except essentials
    const cut = [];
    
    // Essential facet addresses (from previous checks)
    const essentialAddresses = [
        "0x528B2aD05dB526a2245c6621cB7D320E127d3be8", // DiamondCutFacet
        "0xC5B9bb6d38B0f9E908BCa96E2154fF1C5ceca9D1", // DiamondLoupeFacet
        "0x6D2E0C2205A0660A6C5F0a0fAAA61D8107cC8260"  // OwnershipFacet
    ];

    for (const facetAddress of currentFacets) {
        // Check if this is an essential facet
        let isEssential = essentialAddresses.includes(facetAddress);
        
        if (!isEssential) {
            // Remove this facet
            const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
            const selectorsCopy = [...selectors];
            if (selectorsCopy.length > 0) {
                cut.push({
                    facetAddress: ethers.ZeroAddress,
                    action: 2, // Remove
                    functionSelectors: selectorsCopy
                });
                console.log(`Removing ${selectorsCopy.length} functions from ${facetAddress}`);
            }
        }
    }

    // Add new facets
    cut.push({
        facetAddress: coreFacetAddress,
        action: 0, // Add
        functionSelectors: coreSelectors
    });

    cut.push({
        facetAddress: executionFacetAddress,
        action: 0, // Add
        functionSelectors: executionSelectors
    });

    cut.push({
        facetAddress: adminFacetAddress,
        action: 0, // Add
        functionSelectors: adminSelectors
    });

    cut.push({
        facetAddress: leaderboardFacetAddress,
        action: 0, // Add
        functionSelectors: leaderboardSelectors
    });

    // Execute diamond cut
    console.log("\n💎 Executing diamond cut...");
    console.log(`Total operations: ${cut.length}`);
    
    try {
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
    } catch (error: any) {
        console.error("❌ Diamond cut failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        return;
    }

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const newFacets = await diamondLoupe.facetAddresses();
    console.log(`Total facets after cut: ${newFacets.length}`);
    
    // List all facets
    console.log("\n📋 Current facets:");
    for (const facetAddress of newFacets) {
        const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
        console.log(`  ${facetAddress}: ${selectors.length} functions`);
    }

    // Save deployment info
    const deploymentInfo = {
        diamondAddress: DIAMOND_ADDRESS,
        facets: {
            core: coreFacetAddress,
            execution: executionFacetAddress,
            admin: adminFacetAddress,
            leaderboard: leaderboardFacetAddress
        },
        deployedAt: new Date().toISOString(),
        network: (await ethers.provider.getNetwork()).name
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
}

// Helper function to get function selectors
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