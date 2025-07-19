import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🚀 Updating GridottoFacet with Phase 2 (User Draws)...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Deploy new GridottoFacet with user draw features
    console.log("\n📦 Deploying updated GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const newGridottoAddress = await gridottoFacet.getAddress();
    console.log("New GridottoFacet deployed to:", newGridottoAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", addresses.diamond);
    
    // Prepare diamond cut - Replace existing GridottoFacet
    const cut = [{
        facetAddress: newGridottoAddress,
        action: FacetCutAction.Replace,
        functionSelectors: getSelectors(gridottoFacet).selectors
    }];
    
    console.log("\n🔄 Replacing GridottoFacet in Diamond...");
    const tx = await diamond.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ GridottoFacet updated successfully!");
    
    // Test the new functionality
    console.log("\n🧪 Testing new functionality...");
    const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
    
    try {
        // Create a test user draw
        const prizeConfig = {
            model: 0, // CREATOR_FUNDED
            creatorContribution: ethers.parseEther("1"),
            addParticipationFees: true,
            participationFeePercent: 0 // No additional creator fee
        };
        
        const createTx = await gridotto.createUserDraw(
            2, // USER_LYX (enum value 2)
            prizeConfig,
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            3600, // 1 hour duration
            100, // max 100 tickets
            0, // NONE (no requirement)
            ethers.ZeroAddress,
            0,
            { value: ethers.parseEther("1") }
        );
        
        const receipt = await createTx.wait();
        console.log("✅ User draw created successfully!");
        
        // Find UserDrawCreated event
        const event = receipt.logs.find((log: any) => log.fragment?.name === "UserDrawCreated");
        if (event) {
            console.log("Draw ID:", event.args[0].toString());
        }
    } catch (error: any) {
        console.log("❌ Error creating user draw:", error.message);
    }
    
    console.log("\n📊 Update Summary:");
    console.log("- Old GridottoFacet:", addresses.facets.gridotto);
    console.log("- New GridottoFacet:", newGridottoAddress);
    console.log("- Diamond remains at:", addresses.diamond);
    
    console.log("\n✅ Phase 2 deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });