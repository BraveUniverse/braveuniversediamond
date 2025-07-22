import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Adding Debug Facet to Diamond...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy GridottoDebugFacet
    const GridottoDebugFacet = await ethers.getContractFactory("GridottoDebugFacet");
    const debugFacet = await GridottoDebugFacet.deploy();
    await debugFacet.waitForDeployment();
    const debugFacetAddress = await debugFacet.getAddress();
    console.log("✅ GridottoDebugFacet deployed at:", debugFacetAddress);

    // Get function selectors
    const debugSelectors = [
        debugFacet.interface.getFunction("getDrawDebugInfo").selector,
        debugFacet.interface.getFunction("getUserTicketCount").selector,
        debugFacet.interface.getFunction("getDrawParticipants").selector,
        debugFacet.interface.getFunction("getTicketsSoldDirectly").selector,
        debugFacet.interface.getFunction("calculateTotalTickets").selector,
    ];

    console.log("\nDebug selectors:", debugSelectors);

    // Add facet to diamond
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    const cut = [{
        facetAddress: debugFacetAddress,
        action: 0, // Add
        functionSelectors: debugSelectors
    }];

    const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    
    console.log("✅ Debug facet added to diamond!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });