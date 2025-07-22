import { ethers } from "hardhat";

async function main() {
    console.log("🧹 Full System Cleanup...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const targetAddress = "0x666eA581Ab742695373bF63cCc885968fFDB966c";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Get contracts
    const adminFacet = await ethers.getContractAt("AdminFacet", diamondAddress);
    const gridottoFacet = await ethers.getContractAt("GridottoFacet", diamondAddress);
    
    try {
        // Step 1: Cancel all draws
        console.log("📋 Step 1: Cancelling all draws...");
        
        for (let i = 1; i <= 100; i++) {
            try {
                const draw = await gridottoFacet.getUserDraw(i);
                if (draw.creator !== ethers.ZeroAddress && !draw.isCompleted) {
                    console.log(`Cancelling draw #${i}...`);
                    const tx = await adminFacet.cancelDrawAsAdmin(i, "Full system reset");
                    await tx.wait();
                    console.log(`✅ Cancelled draw #${i}`);
                }
            } catch (e) {
                // Skip
            }
        }
        
        // Step 2: Withdraw all funds
        console.log("\n💰 Step 2: Withdrawing all funds...");
        const balance = await ethers.provider.getBalance(diamondAddress);
        console.log(`Contract balance: ${ethers.formatEther(balance)} LYX`);
        
        if (balance > 0n) {
            console.log(`Withdrawing to ${targetAddress}...`);
            const tx = await gridottoFacet.emergencyWithdraw(targetAddress, balance);
            await tx.wait();
            console.log("✅ Funds withdrawn!");
            
            const newBalance = await ethers.provider.getBalance(diamondAddress);
            console.log(`New balance: ${ethers.formatEther(newBalance)} LYX`);
        }
        
        console.log("\n✅ Cleanup complete!");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);