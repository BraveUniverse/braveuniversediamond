import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🔄 Completely replacing GridottoFacet...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX\n");
    
    // Deploy new GridottoFacet
    console.log("📦 Deploying new GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const newGridottoAddress = await gridottoFacet.getAddress();
    console.log("New GridottoFacet deployed to:", newGridottoAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", addresses.diamond);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", addresses.diamond);
    
    // Get current GridottoFacet address and selectors
    console.log("\n🔍 Getting current facets...");
    const facets = await diamondLoupe.facets();
    
    let oldGridottoAddress = "";
    let oldSelectors: string[] = [];
    
    for (const facet of facets) {
        // Find GridottoFacet by checking if it has buyTicket function
        const selectors = facet.functionSelectors;
        // buyTicket selector: 0x6e0e5f19
        if (selectors.includes("0x6e0e5f19")) {
            oldGridottoAddress = facet.facetAddress;
            oldSelectors = selectors;
            console.log("Found old GridottoFacet:", oldGridottoAddress);
            console.log("Function count:", oldSelectors.length);
            break;
        }
    }
    
    if (!oldGridottoAddress) {
        console.log("❌ GridottoFacet not found in Diamond");
        return;
    }
    
    // Prepare diamond cut
    const cut = [];
    
    // First remove all old functions
    if (oldSelectors.length > 0) {
        cut.push({
            facetAddress: ethers.ZeroAddress,
            action: FacetCutAction.Remove,
            functionSelectors: oldSelectors
        });
    }
    
    // Then add all new functions
    const newSelectors = getSelectors(gridottoFacet);
    cut.push({
        facetAddress: newGridottoAddress,
        action: FacetCutAction.Add,
        functionSelectors: newSelectors.selectors
    });
    
    console.log("\n🔧 Executing diamond cut...");
    console.log("- Removing", oldSelectors.length, "functions from", oldGridottoAddress);
    console.log("- Adding", newSelectors.selectors.length, "functions from", newGridottoAddress);
    
    try {
        const tx = await diamond.diamondCut(cut, ethers.ZeroAddress, "0x");
        await tx.wait();
        console.log("✅ GridottoFacet replaced successfully!");
    } catch (error: any) {
        console.log("❌ Error:", error.message);
        return;
    }
    
    // Initialize if needed
    console.log("\n🔧 Initializing GridottoFacet...");
    const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
    
    try {
        const initTx = await gridotto.initializeGridotto();
        await initTx.wait();
        console.log("✅ GridottoFacet initialized!");
    } catch (error: any) {
        if (error.message.includes("Already initialized")) {
            console.log("✅ Already initialized");
        } else {
            console.log("❌ Init error:", error.message);
        }
    }
    
    // Set ticket price to 0.01 LYX for testing
    console.log("\n💰 Setting ticket price to 0.01 LYX...");
    try {
        const setTx = await gridotto.setTicketPrice(ethers.parseEther("0.01"));
        await setTx.wait();
        console.log("✅ Ticket price set to 0.01 LYX");
    } catch (error: any) {
        console.log("❌ Error setting price:", error.message);
    }
    
    console.log("\n📊 Summary:");
    console.log("- Old GridottoFacet removed:", oldGridottoAddress);
    console.log("- New GridottoFacet added:", newGridottoAddress);
    console.log("- Diamond:", addresses.diamond);
    console.log("- Ticket price: 0.01 LYX");
    
    // Update addresses.json
    addresses.facets.gridotto = newGridottoAddress;
    const fs = await import("fs");
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(addresses, null, 2)
    );
    console.log("\n✅ Updated addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });