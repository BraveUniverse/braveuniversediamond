import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Updating GridottoCoreV2Facet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new GridottoCoreV2Facet
    const GridottoCoreV2Facet = await ethers.getContractFactory("GridottoCoreV2Facet");
    const coreFacet = await GridottoCoreV2Facet.deploy();
    await coreFacet.waitForDeployment();
    const coreFacetAddress = await coreFacet.getAddress();
    console.log("✅ New GridottoCoreV2Facet deployed at:", coreFacetAddress);

    // Get function selectors
    const coreSelectors = [
        coreFacet.interface.getFunction("createLYXDraw").selector,
        coreFacet.interface.getFunction("createTokenDraw").selector,
        coreFacet.interface.getFunction("createNFTDraw").selector,
        coreFacet.interface.getFunction("buyTickets").selector,
        coreFacet.interface.getFunction("cancelDraw").selector,
        coreFacet.interface.getFunction("getDrawDetails").selector,
        coreFacet.interface.getFunction("getUserDrawHistory").selector,
    ];

    console.log("\nCore selectors:", coreSelectors);

    // Update facet in diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: coreFacetAddress,
        action: 1, // Replace
        functionSelectors: coreSelectors
    }];

    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ Core facet updated in diamond!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });