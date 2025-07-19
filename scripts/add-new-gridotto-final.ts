import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("➕ Adding new GridottoFacet to Diamond...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Deploy new GridottoFacet
    console.log("📦 Deploying new GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const newGridottoAddress = await gridottoFacet.getAddress();
    console.log("New GridottoFacet deployed to:", newGridottoAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", addresses.diamond);
    
    // Get selectors for new facet
    const selectors = getSelectors(gridottoFacet);
    console.log("\nFunctions to add:", selectors.selectors.length);
    
    // Create add cut
    const cut = {
        facetAddress: newGridottoAddress,
        action: FacetCutAction.Add,
        functionSelectors: selectors.selectors
    };
    
    console.log("\n🔧 Adding new functions...");
    
    try {
        const tx = await diamond.diamondCut([cut], ethers.ZeroAddress, "0x");
        const receipt = await tx.wait();
        console.log("✅ New GridottoFacet added!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.log("❌ Add failed:", error.message);
        return;
    }
    
    // Initialize and configure
    console.log("\n⚙️ Configuring GridottoFacet...");
    const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
    
    // Initialize
    try {
        const initTx = await gridotto.initializeGridotto();
        await initTx.wait();
        console.log("✅ Initialized");
    } catch (error: any) {
        if (error.message.includes("Already initialized")) {
            console.log("✅ Already initialized");
        } else {
            console.log("❌ Init error:", error.message);
        }
    }
    
    // Set ticket price to 0.01 LYX
    try {
        const priceTx = await gridotto.setTicketPrice(ethers.parseEther("0.01"));
        await priceTx.wait();
        console.log("✅ Ticket price set to 0.01 LYX");
    } catch (error: any) {
        console.log("❌ Price error:", error.message);
    }
    
    // Test functions
    console.log("\n🧪 Testing functions...");
    
    try {
        // Check pending prizes
        const pendingPrize = await gridotto.getPendingPrize(deployer.address);
        console.log("Pending prize:", ethers.formatEther(pendingPrize), "LYX");
        
        // Get active draws
        const activeDraws = await gridotto.getActiveDraws();
        console.log("Active draws:", activeDraws.length);
        
        // Check executor rewards
        const officialReward = await gridotto.getOfficialDrawExecutorReward();
        console.log("Official draw executor reward:", ethers.formatEther(officialReward), "LYX");
        
        // Get draw info
        const drawInfo = await gridotto.getDrawInfo();
        console.log("\nOfficial draw #" + drawInfo[0].toString());
        console.log("End time:", new Date(Number(drawInfo[1]) * 1000).toLocaleString());
        console.log("Prize pool:", ethers.formatEther(drawInfo[2]), "LYX");
        console.log("Tickets sold:", drawInfo[3].toString());
        
    } catch (error: any) {
        console.log("❌ Test error:", error.message);
    }
    
    // Update addresses.json
    addresses.facets.gridotto = newGridottoAddress;
    const fs = await import("fs");
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(addresses, null, 2)
    );
    
    console.log("\n✅ GridottoFacet successfully deployed and configured!");
    console.log("Address:", newGridottoAddress);
    console.log("Diamond:", addresses.diamond);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });