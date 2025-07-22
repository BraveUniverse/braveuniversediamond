import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Adding missing Admin functions...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Get current facets
    const loupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    const facets = await loupe.facets();
    
    // Find current admin facet
    let currentAdminFacet = "";
    for (const facet of facets) {
        const selectors = facet.functionSelectors;
        // Check if this facet has admin functions
        if (selectors.includes("0xdc1d4fb7")) { // pauseSystem selector
            currentAdminFacet = facet.facetAddress;
            console.log("Current admin facet:", currentAdminFacet);
            console.log("Current selectors:", selectors);
            break;
        }
    }

    // Deploy new GridottoAdminFacet
    const GridottoAdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    const adminFacet = await GridottoAdminFacet.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("\n✅ New GridottoAdminFacet deployed at:", adminFacetAddress);

    // Get only the NEW function selectors
    const newSelectors = [
        adminFacet.interface.getFunction("getNextDrawId").selector,
        adminFacet.interface.getFunction("getPlatformStatistics").selector,
    ];

    console.log("\nNew selectors to add:", newSelectors);

    // Add new functions to diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: adminFacetAddress,
        action: 0, // Add
        functionSelectors: newSelectors
    }];

    console.log("\nAdding new functions...");
    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ New admin functions added to diamond!");

    // Test the new functions
    console.log("\n🧪 Testing new functions...");
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    try {
        const nextDrawId = await admin.getNextDrawId();
        console.log("✅ getNextDrawId() works! Next ID:", nextDrawId.toString());
    } catch (error: any) {
        console.log("❌ getNextDrawId() failed:", error.message);
    }

    try {
        const stats = await admin.getPlatformStatistics();
        console.log("✅ getPlatformStatistics() works!");
        console.log("   - Total draws:", stats.totalDrawsCreated.toString());
        console.log("   - Total tickets:", stats.totalTicketsSold.toString());
        console.log("   - Weekly draw ID:", stats.currentWeeklyDrawId.toString());
        console.log("   - Monthly draw ID:", stats.currentMonthlyDrawId.toString());
        console.log("   - Platform fees:", ethers.formatEther(stats.platformFeesLYX), "LYX");
        console.log("   - Monthly pool:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
    } catch (error: any) {
        console.log("❌ getPlatformStatistics() failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });