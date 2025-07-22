import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking View Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const viewFacetAddress = "0x9717c6423731E01bbC0562AC9D863662D10029d7";
    
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    const viewFacet = await ethers.getContractAt("GridottoViewFacet", viewFacetAddress);
    
    // Get function selectors
    const viewSelectors = [
        { name: "getDrawDetails", selector: viewFacet.interface.getFunction("getDrawDetails").selector },
        { name: "getDrawTiming", selector: viewFacet.interface.getFunction("getDrawTiming").selector },
        { name: "getUserDrawInfo", selector: viewFacet.interface.getFunction("getUserDrawInfo").selector },
        { name: "getDrawParticipantsWithTickets", selector: viewFacet.interface.getFunction("getDrawParticipantsWithTickets").selector },
        { name: "canExecuteDraw", selector: viewFacet.interface.getFunction("canExecuteDraw").selector }
    ];
    
    console.log("Checking functions:");
    const newFunctions = [];
    
    for (const func of viewSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(func.selector);
        if (facetAddress === ethers.ZeroAddress) {
            console.log(`❌ ${func.name} (${func.selector}) - NOT FOUND`);
            newFunctions.push(func.selector);
        } else {
            console.log(`✅ ${func.name} (${func.selector}) - Found at ${facetAddress}`);
        }
    }
    
    console.log(`\n📝 ${newFunctions.length} new functions can be added`);
    
    if (newFunctions.length > 0) {
        console.log("\nNew function selectors:");
        newFunctions.forEach(s => console.log(`- ${s}`));
    }
}

main().catch(console.error);