import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Adding getPlatformStatistics function...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new GridottoAdminFacet with getPlatformStatistics
    const GridottoAdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    const adminFacet = await GridottoAdminFacet.deploy();
    await adminFacet.waitForDeployment();
    const adminFacetAddress = await adminFacet.getAddress();
    console.log("✅ New GridottoAdminFacet deployed at:", adminFacetAddress);

    // Get only getPlatformStatistics selector
    const newSelectors = [
        adminFacet.interface.getFunction("getPlatformStatistics").selector,
    ];

    console.log("\nNew selector to add:", newSelectors);

    // Add new function to diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: adminFacetAddress,
        action: 0, // Add
        functionSelectors: newSelectors
    }];

    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ getPlatformStatistics function added to diamond!");
    
    // Test the new function
    console.log("\n📊 Testing getPlatformStatistics:");
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    const stats = await admin.getPlatformStatistics();
    console.log("✅ getPlatformStatistics works!");
    console.log("- Total Draws:", stats.totalDrawsCreated.toString());
    console.log("- Total Tickets:", stats.totalTicketsSold.toString());
    console.log("- Platform Fees:", ethers.formatEther(stats.platformFeesLYX), "LYX");
    console.log("- Monthly Pool:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
    console.log("- Current Weekly Draw:", stats.currentWeeklyDrawId.toString());
    console.log("- Current Monthly Draw:", stats.currentMonthlyDrawId.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });