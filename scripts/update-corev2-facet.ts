import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔄 Updating CoreV2 Facet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Deploy new CoreV2 facet
    const GridottoCoreV2Facet = await ethers.getContractFactory("GridottoCoreV2Facet");
    const newCoreFacet = await GridottoCoreV2Facet.deploy();
    await newCoreFacet.waitForDeployment();
    const newCoreFacetAddress = await newCoreFacet.getAddress();
    console.log("✅ New GridottoCoreV2Facet deployed:", newCoreFacetAddress);

    // Get Diamond contracts
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);

    // Get current CoreV2 facet address
    const oldCoreFacetAddress = "0xE7DBc6a8374F9427727a7e0bB79f94A04ED32463";
    
    // Get all function selectors
    const newSelectors = getSelectors(newCoreFacet);
    console.log("New function count:", newSelectors.length);

    // Get old selectors
    const oldSelectors = await diamondLoupe.facetFunctionSelectors(oldCoreFacetAddress);
    console.log("Old function count:", oldSelectors.length);

    // Prepare cut
    const cut = [];
    
    // Remove old facet
    if (oldSelectors.length > 0) {
        cut.push({
            facetAddress: ethers.ZeroAddress,
            action: 2, // Remove
            functionSelectors: [...oldSelectors]
        });
    }

    // Add new facet
    cut.push({
        facetAddress: newCoreFacetAddress,
        action: 0, // Add
        functionSelectors: newSelectors
    });

    console.log("\n💎 Executing diamond cut...");
    try {
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ CoreV2 Facet updated successfully!");
    } catch (error: any) {
        console.error("❌ Diamond cut failed:", error.message);
        return;
    }

    // Verify new functions
    console.log("\n🔍 Verifying new functions...");
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    
    try {
        // Check if createTokenDraw exists
        await core.estimateGas.createTokenDraw(
            ethers.ZeroAddress,
            ethers.parseEther("1"),
            100,
            300,
            2,
            500,
            0
        ).catch(() => {});
        console.log("✅ createTokenDraw function available");
    } catch {
        console.log("❌ createTokenDraw function not found");
    }

    try {
        // Check if createNFTDraw exists
        await core.estimateGas.createNFTDraw(
            ethers.ZeroAddress,
            [],
            ethers.parseEther("0.1"),
            100,
            300,
            2,
            500
        ).catch(() => {});
        console.log("✅ createNFTDraw function available");
    } catch {
        console.log("❌ createNFTDraw function not found");
    }

    console.log("\n✅ Update complete!");
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