import { ethers } from "hardhat";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🚀 Deploying Phase 3 & 4 Facets\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("💎 Diamond:", addresses.diamond);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX\n");
    
    // Deploy Phase 3 Facet
    console.log("=== Deploying GridottoPhase3Facet ===");
    const Phase3Facet = await ethers.getContractFactory("GridottoPhase3Facet");
    const phase3Facet = await Phase3Facet.deploy();
    await phase3Facet.waitForDeployment();
    const phase3Address = await phase3Facet.getAddress();
    console.log("✅ Phase3Facet deployed:", phase3Address);
    
    // Deploy Phase 4 Facet
    console.log("\n=== Deploying GridottoPhase4Facet ===");
    const Phase4Facet = await ethers.getContractFactory("GridottoPhase4Facet");
    const phase4Facet = await Phase4Facet.deploy();
    await phase4Facet.waitForDeployment();
    const phase4Address = await phase4Facet.getAddress();
    console.log("✅ Phase4Facet deployed:", phase4Address);
    
    // Get Phase 3 selectors
    const phase3Selectors = [
        phase3Facet.interface.getFunction("createTokenDraw").selector,
        phase3Facet.interface.getFunction("createNFTDraw").selector,
        phase3Facet.interface.getFunction("buyTokenDrawTicket").selector,
        phase3Facet.interface.getFunction("buyNFTDrawTicket").selector,
        phase3Facet.interface.getFunction("executeTokenDraw").selector,
        phase3Facet.interface.getFunction("executeNFTDraw").selector,
        phase3Facet.interface.getFunction("claimTokenPrize").selector,
        phase3Facet.interface.getFunction("claimNFTPrize").selector
    ];
    
    // Get Phase 4 selectors
    const phase4Selectors = [
        phase4Facet.interface.getFunction("createAdvancedDraw").selector,
        phase4Facet.interface.getFunction("getDrawTiers").selector,
        phase4Facet.interface.getFunction("getTierNFTAssignment").selector
    ];
    
    console.log(`\n✅ Found ${phase3Selectors.length} Phase 3 functions`);
    console.log(`✅ Found ${phase4Selectors.length} Phase 4 functions`);
    
    // Prepare diamond cuts
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", addresses.diamond);
    
    const diamondCuts = [
        {
            facetAddress: phase3Address,
            action: 0, // Add
            functionSelectors: phase3Selectors
        },
        {
            facetAddress: phase4Address,
            action: 0, // Add
            functionSelectors: phase4Selectors
        }
    ];
    
    console.log("\n=== Adding Facets to Diamond ===");
    const tx = await diamondCutFacet.diamondCut(diamondCuts, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ Phase 3 & 4 Facets added to Diamond");
    
    // Update addresses.json
    const fs = require("fs");
    const updatedAddresses = {
        ...addresses,
        phase3Facet: phase3Address,
        phase4Facet: phase4Address
    };
    
    fs.writeFileSync(
        "./deployments/luksoTestnet/addresses.json",
        JSON.stringify(updatedAddresses, null, 2)
    );
    
    console.log("\n✅ Phase 3 & 4 deployment complete!");
    console.log("📝 Updated addresses.json");
    console.log("\n🎮 All Gridotto features are now available:");
    console.log("  - Phase 1-2: Basic lottery & user draws");
    console.log("  - Phase 3: LSP7 token & LSP8 NFT draws");
    console.log("  - Phase 4: Advanced multi-winner draws");
    console.log("  - Admin: Full management system");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });