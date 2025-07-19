import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🚀 Adding new GridottoFacet to Diamond...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Use the already deployed GridottoFacet
    const newGridottoAddress = "0xfE61C7Ab340d2AF3e66d6E4a22102089c7A08A76";
    console.log("Using GridottoFacet at:", newGridottoAddress);
    
    // Get Diamond contracts
    const diamond = await ethers.getContractAt("IDiamondCut", addresses.diamond);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", addresses.diamond);
    
    // Get current facets
    const facets = await diamondLoupe.facets();
    console.log("\nCurrent facets:", facets.length);
    
    // Find and remove old GridottoFacet
    let oldGridottoAddress = "";
    let oldSelectors: string[] = [];
    
    // The old GridottoFacet address from our check
    const knownOldAddress = "0x44Fc94e996a8821376A14763238B8Ab6B3139492";
    
    for (const facet of facets) {
        if (facet.facetAddress.toLowerCase() === knownOldAddress.toLowerCase()) {
            oldGridottoAddress = facet.facetAddress;
            oldSelectors = facet.functionSelectors;
            console.log("\nFound old GridottoFacet:", oldGridottoAddress);
            console.log("Functions to remove:", oldSelectors.length);
            break;
        }
    }
    
    // Get new GridottoFacet contract
    const gridottoFacet = await ethers.getContractAt("GridottoFacet", newGridottoAddress);
    const newSelectors = getSelectors(gridottoFacet);
    
    // Prepare cuts
    const cuts: any[] = [];
    
    // Remove old if found
    if (oldSelectors.length > 0) {
        cuts.push({
            facetAddress: ethers.ZeroAddress,
            action: FacetCutAction.Remove,
            functionSelectors: oldSelectors
        });
    }
    
    // Add new
    cuts.push({
        facetAddress: newGridottoAddress,
        action: FacetCutAction.Add,
        functionSelectors: newSelectors.selectors
    });
    
    console.log("\n🔧 Executing diamond cut...");
    if (oldSelectors.length > 0) {
        console.log("- Removing", oldSelectors.length, "old functions");
    }
    console.log("- Adding", newSelectors.selectors.length, "new functions");
    
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        const receipt = await tx.wait();
        console.log("✅ Diamond cut successful!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.log("❌ Diamond cut failed:", error.message);
        return;
    }
    
    // Test the new functions
    console.log("\n🧪 Testing new functions...");
    const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
    
    try {
        // Initialize if needed
        try {
            const initTx = await gridotto.initializeGridotto();
            await initTx.wait();
            console.log("✅ Initialized GridottoFacet");
        } catch (error: any) {
            if (error.message.includes("Already initialized")) {
                console.log("✅ Already initialized");
            }
        }
        
        // Set ticket price to 0.01 LYX
        console.log("\n💰 Setting ticket price to 0.01 LYX...");
        const setTx = await gridotto.setTicketPrice(ethers.parseEther("0.01"));
        await setTx.wait();
        console.log("✅ Ticket price set!");
        
        // Check functions
        const activeDraws = await gridotto.getActiveDraws();
        console.log("\n📊 Active draws:", activeDraws.length);
        
        const pendingPrize = await gridotto.getPendingPrize(deployer.address);
        console.log("Pending prize:", ethers.formatEther(pendingPrize), "LYX");
        
        // Test executor reward functions
        console.log("\n🎯 Testing executor reward functions...");
        const officialReward = await gridotto.getOfficialDrawExecutorReward();
        console.log("Official draw executor reward:", ethers.formatEther(officialReward), "LYX");
        
    } catch (error: any) {
        console.log("❌ Function test error:", error.message);
    }
    
    // Update addresses.json
    addresses.facets.gridotto = newGridottoAddress;
    const fs = await import("fs");
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(addresses, null, 2)
    );
    
    console.log("\n✅ GridottoFacet successfully updated!");
    console.log("New address:", newGridottoAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });