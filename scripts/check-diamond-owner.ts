import { ethers } from "hardhat";

async function main() {
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const ownershipFacet = await ethers.getContractAt("OwnershipFacet", DIAMOND_ADDRESS);
    const owner = await ownershipFacet.owner();
    
    const [signer1, signer2, signer3] = await ethers.getSigners();
    
    console.log("💎 Diamond Owner:", owner);
    console.log("\n📋 Mevcut hesaplar:");
    console.log("1.", signer1.address, owner === signer1.address ? "✅ OWNER" : "");
    console.log("2.", signer2.address, owner === signer2.address ? "✅ OWNER" : "");
    console.log("3.", signer3.address, owner === signer3.address ? "✅ OWNER" : "");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });