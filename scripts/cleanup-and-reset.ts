import { ethers } from "hardhat";

async function main() {
    console.log("🧹 Starting Gridotto Cleanup and Reset...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const targetAddress = "0x666eA581Ab742695373bF63cCc885968fFDB966c";
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get contracts
    const adminFacet = await ethers.getContractAt("AdminFacet", diamondAddress);
    const gridottoFacet = await ethers.getContractAt("GridottoFacet", diamondAddress);
    const uiHelper = await ethers.getContractAt("GridottoUIHelperFacet", diamondAddress);
    
    try {
        // Step 1: Get all draws and cancel them
        console.log("📋 Step 1: Finding and cancelling all draws...");
        
        // Cancel user draws
        for (let i = 1; i <= 50; i++) {
            try {
                const draw = await gridottoFacet.getUserDraw(i);
                if (draw.creator !== ethers.ZeroAddress && !draw.isCompleted) {
                    console.log(`Cancelling user draw #${i}...`);
                    const tx = await adminFacet.cancelDrawAsAdmin(i, "System reset");
                    await tx.wait();
                    console.log(`✅ Cancelled draw #${i}`);
                }
            } catch (e) {
                // Draw doesn't exist or already completed
            }
        }
        
        // Cancel token draws
        for (let i = 1; i <= 50; i++) {
            try {
                const draw = await gridottoFacet.getTokenDraw(i);
                if (draw.creator !== ethers.ZeroAddress && !draw.isCompleted) {
                    console.log(`Cancelling token draw #${i}...`);
                    const tx = await adminFacet.cancelDrawAsAdmin(i, "System reset");
                    await tx.wait();
                    console.log(`✅ Cancelled token draw #${i}`);
                }
            } catch (e) {
                // Draw doesn't exist or already completed
            }
        }
        
        // Step 2: Get contract balance
        console.log("\n💰 Step 2: Checking contract balance...");
        const balance = await ethers.provider.getBalance(diamondAddress);
        console.log(`Contract balance: ${ethers.formatEther(balance)} LYX`);
        
        if (balance > 0n) {
            // Step 3: Emergency withdraw all funds
            console.log(`\n💸 Step 3: Withdrawing ${ethers.formatEther(balance)} LYX to ${targetAddress}...`);
            const withdrawTx = await gridottoFacet.emergencyWithdraw(targetAddress, balance);
            await withdrawTx.wait();
            console.log("✅ Funds withdrawn successfully!");
            
            // Verify new balance
            const newBalance = await ethers.provider.getBalance(diamondAddress);
            console.log(`New contract balance: ${ethers.formatEther(newBalance)} LYX`);
            
            const targetBalance = await ethers.provider.getBalance(targetAddress);
            console.log(`Target address balance: ${ethers.formatEther(targetBalance)} LYX`);
        } else {
            console.log("No funds to withdraw");
        }
        
        // Step 4: Reset counters (if possible)
        console.log("\n🔄 Step 4: System reset complete!");
        console.log("All draws cancelled and funds withdrawn.");
        console.log("\n📝 You can now create new draws from scratch.");
        
    } catch (error: any) {
        console.error("Error during cleanup:", error.message);
        
        // If we're not the owner, provide instructions
        if (error.message.includes("LibDiamond: Must be contract owner")) {
            console.log("\n⚠️  You need to be the contract owner to perform these operations.");
            console.log("Current deployer:", deployer.address);
            console.log("\nPlease run this script with the owner account.");
        }
    }
}

main().catch(console.error);