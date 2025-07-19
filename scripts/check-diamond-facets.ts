import { ethers } from "hardhat";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🔍 Checking Diamond Facets...\n");
    
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", addresses.diamond);
    
    const facets = await diamondLoupe.facets();
    
    console.log("Total facets:", facets.length);
    console.log("\nFacets:");
    
    for (const facet of facets) {
        console.log("\n📦 Facet:", facet.facetAddress);
        console.log("Functions:", facet.functionSelectors.length);
        
        // Show first few selectors
        console.log("Sample selectors:");
        for (let i = 0; i < Math.min(5, facet.functionSelectors.length); i++) {
            console.log(" -", facet.functionSelectors[i]);
        }
        
        // Check if it's GridottoFacet by known address
        if (facet.facetAddress.toLowerCase() === addresses.facets.gridotto.toLowerCase()) {
            console.log("✅ This is GridottoFacet (from addresses.json)");
        }
    }
    
    // Try to find GridottoFacet by checking for specific functions
    console.log("\n🔍 Looking for GridottoFacet functions...");
    
    try {
        const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
        
        // Try to call a view function
        const ticketPrice = await gridotto.getTicketPrice();
        console.log("✅ GridottoFacet found! Ticket price:", ethers.formatEther(ticketPrice), "LYX");
        
        // Check pending prizes
        const [deployer] = await ethers.getSigners();
        const pendingPrize = await gridotto.getPendingPrize(deployer.address);
        console.log("Pending prize for deployer:", ethers.formatEther(pendingPrize), "LYX");
        
    } catch (error: any) {
        console.log("❌ GridottoFacet functions not accessible:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });