import { ethers } from "hardhat";
import { FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🗑️ Removing old GridottoFacet from Diamond...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Get Diamond contracts
    const diamond = await ethers.getContractAt("IDiamondCut", addresses.diamond);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", addresses.diamond);
    
    // Get current facets
    const facets = await diamondLoupe.facets();
    console.log("Current facets:", facets.length);
    
    // Find old GridottoFacet
    const knownOldAddress = "0x44Fc94e996a8821376A14763238B8Ab6B3139492";
    let oldSelectors: string[] = [];
    
    for (const facet of facets) {
        if (facet.facetAddress.toLowerCase() === knownOldAddress.toLowerCase()) {
            // Create a new array to avoid readonly issues
            oldSelectors = [...facet.functionSelectors];
            console.log("\nFound old GridottoFacet:", facet.facetAddress);
            console.log("Functions to remove:", oldSelectors.length);
            break;
        }
    }
    
    if (oldSelectors.length === 0) {
        console.log("❌ Old GridottoFacet not found");
        return;
    }
    
    // Create remove cut
    const cut = {
        facetAddress: ethers.ZeroAddress,
        action: FacetCutAction.Remove,
        functionSelectors: oldSelectors
    };
    
    console.log("\n🔧 Removing old functions...");
    
    try {
        const tx = await diamond.diamondCut([cut], ethers.ZeroAddress, "0x");
        const receipt = await tx.wait();
        console.log("✅ Old GridottoFacet removed!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } catch (error: any) {
        console.log("❌ Remove failed:", error.message);
        return;
    }
    
    // Verify removal
    const newFacets = await diamondLoupe.facets();
    console.log("\nFacets after removal:", newFacets.length);
    console.log("✅ Ready to add new GridottoFacet");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });