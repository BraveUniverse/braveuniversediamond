import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking Facet Addresses...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    try {
        const facets = await diamondLoupe.facets();
        
        console.log(`Total Facets: ${facets.length}\n`);
        
        // Known facet mappings
        const knownFacets: { [key: string]: string } = {
            "0x528B2aD05dB526a2245c6621cB7D320E127d3be8": "DiamondCutFacet",
            "0xC5B9bb6d38B0f9E908BCa96E2154fF1C5ceca9D1": "DiamondLoupeFacet", 
            "0x6D2E0C2205A0660A6C5F0a0fAAA61D8107cC8260": "OwnershipFacet",
            "0x7440762Df9E369E1b7BA2942d2Bf4605B51880C2": "GridottoExecutionFacet",
            "0x19dD5210C8301db68725D4e1e36B6022BB731C3f": "GridottoFacet",
            "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D": "GridottoUIHelperFacet",
            "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B": "AdminFacet",
            "0x6A654c9b8F9Cfe304429fAbe3F20B4d092996E2d": "GridottoMissingFacet",
            "0x362630096659c10F2b11d57e3a13a94F11E62685": "GridottoLeaderboardFacet",
            "0x5514528F3101FB6a16A4B13685dC15450589FC87": "GridottoViewFacet (old)",
            "0x5Fce5CE5F5b13458218DB5856D84Ca25476BBcFa": "GridottoFixedViewFacet",
            "0x43a60b7adFf659Daa896CA7d6D0b83A0337415a0": "GridottoFixedPurchaseFacet"
        };
        
        // Categorize facets
        const essentialFacets = [];
        const toRemove = [];
        const unknown = [];
        
        for (const facet of facets) {
            const address = facet.facetAddress;
            const name = knownFacets[address] || "Unknown";
            const functionCount = facet.functionSelectors.length;
            
            console.log(`${name}:`);
            console.log(`  Address: ${address}`);
            console.log(`  Functions: ${functionCount}`);
            
            // Categorize
            if (["DiamondCutFacet", "DiamondLoupeFacet", "OwnershipFacet", "GridottoExecutionFacet", "GridottoLeaderboardFacet"].includes(name)) {
                essentialFacets.push(address);
                console.log(`  Status: ✅ KEEP`);
            } else if (name !== "Unknown") {
                toRemove.push(address);
                console.log(`  Status: ❌ REMOVE`);
            } else {
                unknown.push(address);
                console.log(`  Status: ⚠️  UNKNOWN`);
            }
            
            console.log("");
        }
        
        console.log("\n📊 SUMMARY:");
        console.log("===========");
        console.log(`Essential facets to keep: ${essentialFacets.length}`);
        console.log(`Facets to remove: ${toRemove.length}`);
        console.log(`Unknown facets: ${unknown.length}`);
        
        console.log("\n🗑️  Facets to remove:");
        toRemove.forEach(addr => console.log(`  - ${addr} (${knownFacets[addr]})`));
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);