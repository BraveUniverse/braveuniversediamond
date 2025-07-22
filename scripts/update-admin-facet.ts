import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Updating GridottoAdminFacet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new GridottoAdminFacet
    const GridottoAdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    const adminFacet = await GridottoAdminFacet.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("✅ New GridottoAdminFacet deployed at:", adminFacetAddress);

    // Get all function selectors
    const adminSelectors = [
        adminFacet.interface.getFunction("pauseSystem").selector,
        adminFacet.interface.getFunction("unpauseSystem").selector,
        adminFacet.interface.getFunction("isPaused").selector,
        adminFacet.interface.getFunction("withdrawPlatformFees").selector,
        adminFacet.interface.getFunction("withdrawTokenFees").selector,
        adminFacet.interface.getFunction("getPlatformFeesLYX").selector,
        adminFacet.interface.getFunction("getPlatformFeesToken").selector,
        adminFacet.interface.getFunction("setFeePercentages").selector,
        adminFacet.interface.getFunction("getSystemStats").selector,
        adminFacet.interface.getFunction("getNextDrawId").selector,
        adminFacet.interface.getFunction("getPlatformStatistics").selector,
        adminFacet.interface.getFunction("emergencyWithdraw").selector,
        adminFacet.interface.getFunction("forceExecuteDraw").selector,
    ];

    console.log("\nAdmin selectors:", adminSelectors);
    console.log("Total selectors:", adminSelectors.length);

    // Update facet in diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: adminFacetAddress,
        action: 1, // Replace
        functionSelectors: adminSelectors
    }];

    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ Admin facet updated in diamond!");

    // Test the new functions
    console.log("\n🧪 Testing new functions...");
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    try {
        const nextDrawId = await admin.getNextDrawId();
        console.log("✅ getNextDrawId() works! Next ID:", nextDrawId.toString());
    } catch (error) {
        console.log("❌ getNextDrawId() failed:", error);
    }

    try {
        const stats = await admin.getPlatformStatistics();
        console.log("✅ getPlatformStatistics() works!");
        console.log("   - Total draws:", stats.totalDrawsCreated.toString());
        console.log("   - Weekly draw ID:", stats.currentWeeklyDrawId.toString());
        console.log("   - Monthly draw ID:", stats.currentMonthlyDrawId.toString());
    } catch (error) {
        console.log("❌ getPlatformStatistics() failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });