import { ethers } from "hardhat";

async function main() {
    console.log("Checking method ID: 0xd6be15d1\n");
    
    // Check common function signatures
    const functions = [
        "buyUserDrawTicket(uint256,uint256)",
        "buyTokenDrawTicket(uint256,uint256)",
        "buyNFTDrawTicket(uint256,uint256)",
        "purchaseTickets(uint256,uint256)",
        "buyTickets(uint256,uint256)"
    ];
    
    for (const func of functions) {
        const selector = ethers.id(func).slice(0, 10);
        console.log(`${func}: ${selector}`);
        if (selector === "0xd6be15d1") {
            console.log("✅ MATCH FOUND!");
        }
    }
    
    // Also check if this function exists in diamond
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    try {
        const facetAddress = await diamondLoupe.facetAddress("0xd6be15d1");
        console.log(`\nFunction with selector 0xd6be15d1 is deployed at: ${facetAddress}`);
        
        if (facetAddress === ethers.ZeroAddress) {
            console.log("❌ This function is NOT deployed in the diamond!");
        }
    } catch (e) {
        console.log("Error checking diamond");
    }
}

main().catch(console.error);