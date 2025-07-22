import { ethers } from "hardhat";
import { Contract } from "ethers";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Function selectors to remove (from old facets)
const OLD_SELECTORS_TO_REMOVE = [
    // GridottoFacet functions
    "0xd6be15d1", // buyUserDrawTicket
    "0x1b00210c", // getUserDraw
    "0x8456cb59", // pause
    "0x3f4ba83a", // unpause
    // Add more as needed from the decode-functions output
];

async function main() {
    console.log("🚀 Deploying Simplified Gridotto System...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new facets
    console.log("\n📦 Deploying new facets...");
    
    const GridottoCoreFacet = await ethers.getContractFactory("GridottoCoreFacet");
    const coreFacet = await GridottoCoreFacet.deploy();
    await coreFacet.waitForDeployment();
    const coreFacetAddress = await coreFacet.getAddress();
    console.log("✅ GridottoCoreFacet deployed:", coreFacetAddress);

    const GridottoExecutionFacetSimple = await ethers.getContractFactory("GridottoExecutionFacetSimple");
    const executionFacet = await GridottoExecutionFacetSimple.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("✅ GridottoExecutionFacetSimple deployed:", executionFacetAddress);

    const GridottoAdminFacetSimple = await ethers.getContractFactory("GridottoAdminFacetSimple");
    const adminFacet = await GridottoAdminFacetSimple.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("✅ GridottoAdminFacetSimple deployed:", adminFacetAddress);

    const GridottoLeaderboardFacetSimple = await ethers.getContractFactory("GridottoLeaderboardFacetSimple");
    const leaderboardFacet = await GridottoLeaderboardFacetSimple.deploy();
    await leaderboardFacet.waitForDeployment();
    const leaderboardFacetAddress = await leaderboardFacet.getAddress();
    console.log("✅ GridottoLeaderboardFacetSimple deployed:", leaderboardFacetAddress);

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

    // Get all current facets to remove old ones
    console.log("\n🗑️  Identifying facets to remove...");
    const currentFacets = await diamondLoupe.facetAddresses();
    
    const facetsToRemove = [
        "0x19dD5210C8301db68725D4e1e36B6022BB731C3f", // GridottoFacet
        "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D", // GridottoUIHelperFacet
        "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B", // AdminFacet
        "0x6A654c9b8F9Cfe304429fAbe3F20B4d092996E2d", // GridottoMissingFacet
        "0x5514528F3101FB6a16A4B13685dC15450589FC87", // GridottoViewFacet (old)
        "0x5Fce5CE5F5b13458218DB5856D84Ca25476BBcFa", // GridottoFixedViewFacet
        "0x43a60b7adFf659Daa896CA7d6D0b83A0337415a0", // GridottoFixedPurchaseFacet
    ];

    // Prepare cut data
    const cut = [];

    // Remove old facets
    for (const facetAddress of facetsToRemove) {
        if (currentFacets.includes(facetAddress)) {
            const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
            if (selectors.length > 0) {
                // Create a copy of selectors array to avoid read-only issue
                const selectorsCopy = [...selectors];
                cut.push({
                    facetAddress: ethers.ZeroAddress,
                    action: 2, // Remove
                    functionSelectors: selectorsCopy
                });
                console.log(`Removing ${selectors.length} functions from ${facetAddress}`);
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
    try {
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
    } catch (error: any) {
        console.error("❌ Diamond cut failed:", error.message);
        return;
    }

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const newFacets = await diamondLoupe.facetAddresses();
    console.log(`Total facets after cut: ${newFacets.length}`);

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
    if (!contract.interface) {
        console.error("Contract interface not found");
        return [];
    }
    
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