import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("Deploying GridottoPlatformDrawsFacet...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy facet
  const GridottoPlatformDrawsFacet = await ethers.getContractFactory("GridottoPlatformDrawsFacet");
  const facet = await GridottoPlatformDrawsFacet.deploy();
  await facet.deployed();

  console.log("GridottoPlatformDrawsFacet deployed to:", facet.address);

  // Get diamond address (should be in your deployment config)
  const diamondAddress = process.env.DIAMOND_ADDRESS || "YOUR_DIAMOND_ADDRESS";
  
  // Add facet to diamond
  const diamondCutFacet = await ethers.getContractAt("IDiamondCut", diamondAddress);
  
  // Get function selectors
  const selectors = [
    facet.interface.getSighash("initializePlatformDraws()"),
    facet.interface.getSighash("executeWeeklyDraw()"),
    facet.interface.getSighash("executeMonthlyDraw()"),
    facet.interface.getSighash("getPlatformDrawsInfo()"),
    facet.interface.getSighash("getUserMonthlyTickets(address)")
  ];

  const diamondCut = [{
    facetAddress: facet.address,
    action: 0, // Add
    functionSelectors: selectors
  }];

  await diamondCutFacet.diamondCut(diamondCut, ethers.constants.AddressZero, "0x");
  console.log("Facet added to diamond");

  // Initialize platform draws
  const platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", diamondAddress);
  await platformDrawsFacet.initializePlatformDraws();
  console.log("Platform draws initialized - Both weekly and monthly draws are now active!");

  // Get initial state
  const info = await platformDrawsFacet.getPlatformDrawsInfo();
  console.log("\nPlatform Draws Info:");
  console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
  console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
  console.log("- Weekly End Time:", new Date(info.weeklyEndTime.toNumber() * 1000).toLocaleString());
  console.log("- Monthly End Time:", new Date(info.monthlyEndTime.toNumber() * 1000).toLocaleString());
  console.log("- Monthly Pool Balance:", ethers.utils.formatEther(info.monthlyPoolBalance), "LYX");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });