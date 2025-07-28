import { ethers } from "hardhat";

async function main() {
  console.log("💎 Checking Old Diamond Balance");
  console.log("================================");

  const [deployer] = await ethers.getSigners();
  const OLD_DIAMOND = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Old Diamond:", OLD_DIAMOND);
  console.log("Owner:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(OLD_DIAMOND);
  console.log("\n💰 Current Balance:", ethers.formatEther(balance), "LYX");

  if (balance > 0) {
    console.log("\n📤 Withdrawing remaining funds...");
    
    try {
      // Try admin facet withdraw
      const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", OLD_DIAMOND);
      
      // First try to withdraw platform fees
      try {
        console.log("Attempting platform fee withdrawal...");
        const tx1 = await adminFacet.withdrawPlatformFees();
        await tx1.wait();
        console.log("✅ Platform fees withdrawn");
      } catch (error: any) {
        console.log("⚠️  No platform fees or error:", error.reason);
      }
      
      // Check if we have reset facet
      try {
        const resetFacet = await ethers.getContractAt("GridottoResetFacet", OLD_DIAMOND);
        const remainingBalance = await ethers.provider.getBalance(OLD_DIAMOND);
        
        if (remainingBalance > 0) {
          console.log("\n💸 Using emergency withdraw...");
          console.log("Remaining balance:", ethers.formatEther(remainingBalance), "LYX");
          
          // Withdraw to deployer address (3 times same address)
          const tx2 = await resetFacet.emergencyWithdrawAndDistribute(
            deployer.address,
            deployer.address,
            deployer.address
          );
          await tx2.wait();
          console.log("✅ Emergency withdrawal complete!");
        }
      } catch (error: any) {
        console.log("❌ Cannot use emergency withdraw:", error.message);
      }
      
    } catch (error: any) {
      console.error("❌ Withdrawal error:", error.message);
    }
  }

  // Final balance check
  const finalBalance = await ethers.provider.getBalance(OLD_DIAMOND);
  console.log("\n📊 Final Balance:", ethers.formatEther(finalBalance), "LYX");
  
  if (finalBalance === 0n) {
    console.log("✅ Old Diamond is empty, ready to abandon!");
  } else {
    console.log("⚠️  Still has balance, manual intervention may be needed");
  }

  console.log("\n✨ Check Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });