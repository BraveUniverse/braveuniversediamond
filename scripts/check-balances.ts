import { ethers } from "hardhat";

async function main() {
    console.log("💰 Hesap Bakiyeleri Kontrolü");
    console.log("=".repeat(40));

    const signers = await ethers.getSigners();
    
    for (let i = 0; i < signers.length; i++) {
        const address = signers[i].address;
        const balance = await ethers.provider.getBalance(address);
        
        console.log(`\nHesap ${i + 1}:`);
        console.log(`  Adres: ${address}`);
        console.log(`  Bakiye: ${ethers.formatEther(balance)} LYX`);
    }
    
    console.log("\n📊 Toplam hesap sayısı:", signers.length);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });