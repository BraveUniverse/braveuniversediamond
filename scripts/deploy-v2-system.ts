import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Essential facets to keep
const ESSENTIAL_FACETS = [
    "DiamondCutFacet",
    "DiamondLoupeFacet", 
    "OwnershipFacet",
    "OracleFacet" // Keep Oracle
];

async function main() {
    console.log("🚀 Deploying Gridotto V2 System...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new facets
    console.log("\n📦 Deploying V2 facets...");
    
    const GridottoCoreV2Facet = await ethers.getContractFactory("GridottoCoreV2Facet");
    const coreFacet = await GridottoCoreV2Facet.deploy();
    await coreFacet.waitForDeployment();
    const coreFacetAddress = await coreFacet.getAddress();
    console.log("✅ GridottoCoreV2Facet deployed:", coreFacetAddress);

    const GridottoPlatformDrawsFacet = await ethers.getContractFactory("GridottoPlatformDrawsFacet");
    const platformFacet = await GridottoPlatformDrawsFacet.deploy();
    await platformFacet.waitForDeployment();
    const platformFacetAddress = await platformFacet.getAddress();
    console.log("✅ GridottoPlatformDrawsFacet deployed:", platformFacetAddress);

    const GridottoExecutionV2Facet = await ethers.getContractFactory("GridottoExecutionV2Facet");
    const executionFacet = await GridottoExecutionV2Facet.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("✅ GridottoExecutionV2Facet deployed:", executionFacetAddress);

    const GridottoRefundFacet = await ethers.getContractFactory("GridottoRefundFacet");
    const refundFacet = await GridottoRefundFacet.deploy();
    await refundFacet.waitForDeployment();
    const refundFacetAddress = await refundFacet.getAddress();
    console.log("✅ GridottoRefundFacet deployed:", refundFacetAddress);

    // Keep existing Admin and Leaderboard facets (they're compatible)
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
    const platformSelectors = getSelectors(platformFacet);
    const executionSelectors = getSelectors(executionFacet);
    const refundSelectors = getSelectors(refundFacet);
    const adminSelectors = getSelectors(adminFacet);
    const leaderboardSelectors = getSelectors(leaderboardFacet);

    console.log("Core functions:", coreSelectors.length);
    console.log("Platform functions:", platformSelectors.length);
    console.log("Execution functions:", executionSelectors.length);
    console.log("Refund functions:", refundSelectors.length);
    console.log("Admin functions:", adminSelectors.length);
    console.log("Leaderboard functions:", leaderboardSelectors.length);

    // Get Diamond contracts
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);

    // Remove all non-essential facets
    console.log("\n🗑️  Removing old facets...");
    const currentFacets = await diamondLoupe.facetAddresses();
    
    const cut = [];
    
    // Essential facet addresses
    const essentialAddresses = [
        "0x528B2aD05dB526a2245c6621cB7D320E127d3be8", // DiamondCutFacet
        "0xC5B9bb6d38B0f9E908BCa96E2154fF1C5ceca9D1", // DiamondLoupeFacet
        "0x6D2E0C2205A0660A6C5F0a0fAAA61D8107cC8260", // OwnershipFacet
        "0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71"  // OracleFacet (if deployed)
    ];

    for (const facetAddress of currentFacets) {
        if (!essentialAddresses.includes(facetAddress)) {
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
    cut.push({ facetAddress: coreFacetAddress, action: 0, functionSelectors: coreSelectors });
    cut.push({ facetAddress: platformFacetAddress, action: 0, functionSelectors: platformSelectors });
    cut.push({ facetAddress: executionFacetAddress, action: 0, functionSelectors: executionSelectors });
    cut.push({ facetAddress: refundFacetAddress, action: 0, functionSelectors: refundSelectors });
    cut.push({ facetAddress: adminFacetAddress, action: 0, functionSelectors: adminSelectors });
    cut.push({ facetAddress: leaderboardFacetAddress, action: 0, functionSelectors: leaderboardSelectors });

    console.log("\n💎 Executing diamond cut...");
    console.log(`Total operations: ${cut.length}`);
    
    try {
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
    } catch (error: any) {
        console.error("❌ Diamond cut failed:", error.message);
        return;
    }

    // Initialize Oracle if needed
    console.log("\n🔮 Checking Oracle initialization...");
    try {
        const oracle = await ethers.getContractAt("OracleFacet", DIAMOND_ADDRESS);
        const oracleData = await oracle.getOracleData();
        console.log("Oracle already initialized:", oracleData.oracleAddress);
    } catch (error) {
        console.log("Initializing Oracle...");
        const oracle = await ethers.getContractAt("OracleFacet", DIAMOND_ADDRESS);
        const tx = await oracle.initializeOracle();
        await tx.wait();
        console.log("✅ Oracle initialized!");
    }

    // Initialize platform draws
    console.log("\n🎲 Initializing platform draws...");
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    try {
        const tx = await platform.initializePlatformDraws();
        await tx.wait();
        console.log("✅ Platform draws initialized!");
        
        const info = await platform.getPlatformDrawsInfo();
        console.log("First weekly draw ID:", info.weeklyDrawId.toString());
    } catch (error: any) {
        console.log("Platform draws might already be initialized:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
        diamondAddress: DIAMOND_ADDRESS,
        facets: {
            coreV2: coreFacetAddress,
            platform: platformFacetAddress,
            executionV2: executionFacetAddress,
            refund: refundFacetAddress,
            admin: adminFacetAddress,
            leaderboard: leaderboardFacetAddress
        },
        deployedAt: new Date().toISOString(),
        network: "luksoTestnet"
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
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