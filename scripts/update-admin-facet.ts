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

    // Get only NEW function selectors
    const newSelectors = [
        adminFacet.interface.getFunction("getNextDrawId").selector,
        adminFacet.interface.getFunction("getPlatformStatistics").selector,
    ];

    console.log("\nNew selectors to add:", newSelectors);

    // Add new functions to diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: adminFacetAddress,
        action: 0, // Add (not replace)
        functionSelectors: newSelectors
    }];

    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ New admin functions added to diamond!");
    
    // Test the new functions
    console.log("\n📊 Testing new functions:");
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    const nextDrawId = await admin.getNextDrawId();
    console.log("- Next Draw ID:", nextDrawId.toString());
    
    const stats = await admin.getPlatformStatistics();
    console.log("- Platform Statistics:");
    console.log("  - Total Draws:", stats.totalDrawsCreated.toString());
    console.log("  - Total Tickets:", stats.totalTicketsSold.toString());
    console.log("  - Platform Fees:", ethers.formatEther(stats.platformFeesLYX), "LYX");
    console.log("  - Monthly Pool:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
    console.log("  - Current Weekly Draw:", stats.currentWeeklyDrawId.toString());
    console.log("  - Current Monthly Draw:", stats.currentMonthlyDrawId.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });