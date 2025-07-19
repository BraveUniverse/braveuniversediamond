import { ethers } from "hardhat";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🔄 Updating GridottoFacet with Phase 3-4 features\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("💎 Diamond:", addresses.diamond);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX\n");
    
    // Deploy new GridottoFacet
    console.log("=== Deploying New GridottoFacet ===");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const newGridottoAddress = await gridottoFacet.getAddress();
    console.log("✅ New GridottoFacet deployed:", newGridottoAddress);
    
    // Get all function selectors
    const gridottoSelectors = [
        // Phase 1-2 functions
        gridottoFacet.interface.getFunction("buyTicket").selector,
        gridottoFacet.interface.getFunction("buyTicketInternal").selector,
        gridottoFacet.interface.getFunction("buyTicketsForSelected").selector,
        gridottoFacet.interface.getFunction("executeDraw").selector,
        gridottoFacet.interface.getFunction("claimPrize").selector,
        gridottoFacet.interface.getFunction("withdrawOwnerProfit").selector,
        gridottoFacet.interface.getFunction("withdrawOwnerTokenProfit").selector,
        gridottoFacet.interface.getFunction("withdrawCreatorProfit").selector,
        gridottoFacet.interface.getFunction("withdrawCreatorTokenProfit").selector,
        gridottoFacet.interface.getFunction("getDrawInfo").selector,
        gridottoFacet.interface.getFunction("getOfficialDrawInfo").selector,
        gridottoFacet.interface.getFunction("getUserDrawInfo").selector,
        gridottoFacet.interface.getFunction("getUserPendingPrizes").selector,
        gridottoFacet.interface.getFunction("getUserTickets").selector,
        gridottoFacet.interface.getFunction("getActiveUserDraws").selector,
        gridottoFacet.interface.getFunction("canParticipate").selector,
        gridottoFacet.interface.getFunction("createUserDraw").selector,
        gridottoFacet.interface.getFunction("buyUserDrawTicket").selector,
        gridottoFacet.interface.getFunction("executeUserDraw").selector,
        gridottoFacet.interface.getFunction("claimUserDrawPrize").selector,
        gridottoFacet.interface.getFunction("getDrawType").selector,
        gridottoFacet.interface.getFunction("getParticipantsList").selector,
        gridottoFacet.interface.getFunction("getWinnersList").selector,
        gridottoFacet.interface.getFunction("getDrawPrizeInfo").selector,
        gridottoFacet.interface.getFunction("getUserCreatedDraws").selector,
        gridottoFacet.interface.getFunction("getParticipantsRange").selector,
        
        // Phase 3 functions (LSP7/LSP8)
        gridottoFacet.interface.getFunction("createTokenDraw").selector,
        gridottoFacet.interface.getFunction("createNFTDraw").selector,
        gridottoFacet.interface.getFunction("buyTokenDrawTicket").selector,
        gridottoFacet.interface.getFunction("buyNFTDrawTicket").selector,
        gridottoFacet.interface.getFunction("executeTokenDraw").selector,
        gridottoFacet.interface.getFunction("executeNFTDraw").selector,
        gridottoFacet.interface.getFunction("claimTokenPrize").selector,
        gridottoFacet.interface.getFunction("claimNFTPrize").selector,
        
        // Phase 4 functions (Advanced)
        gridottoFacet.interface.getFunction("createAdvancedDraw").selector
    ];
    
    console.log(`\n✅ Found ${gridottoSelectors.length} GridottoFacet functions`);
    
    // Get current facets
    const diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", addresses.diamond);
    const facets = await diamondLoupeFacet.facets();
    
    // Find old GridottoFacet
    let oldGridottoAddress = ethers.ZeroAddress;
    let oldSelectors: string[] = [];
    
    for (const facet of facets) {
        const selectors = facet.functionSelectors;
        // Check if this facet has GridottoFacet functions
        if (selectors.includes(gridottoFacet.interface.getFunction("buyTicket").selector)) {
            oldGridottoAddress = facet.facetAddress;
            oldSelectors = selectors;
            console.log("\n📍 Found old GridottoFacet:", oldGridottoAddress);
            console.log(`   With ${oldSelectors.length} functions`);
            break;
        }
    }
    
    // Prepare diamond cut
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", addresses.diamond);
    const diamondCuts = [];
    
    // Remove old facet if exists
    if (oldGridottoAddress !== ethers.ZeroAddress) {
        diamondCuts.push({
            facetAddress: ethers.ZeroAddress,
            action: 2, // Remove
            functionSelectors: oldSelectors
        });
    }
    
    // Add new facet
    diamondCuts.push({
        facetAddress: newGridottoAddress,
        action: 0, // Add
        functionSelectors: gridottoSelectors
    });
    
    console.log("\n=== Updating Diamond ===");
    const tx = await diamondCutFacet.diamondCut(diamondCuts, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ GridottoFacet updated in Diamond");
    
    // Update addresses.json
    const fs = require("fs");
    const updatedAddresses = {
        ...addresses,
        gridottoFacet: newGridottoAddress
    };
    
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(updatedAddresses, null, 2)
    );
    
    console.log("\n✅ GridottoFacet update complete!");
    console.log("📝 Updated addresses.json");
    console.log("\n🚀 Phase 3-4 features are now available!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });