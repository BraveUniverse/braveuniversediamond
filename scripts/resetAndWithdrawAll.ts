import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Complete System Reset and Withdrawal");
  console.log("=======================================");

  const [deployer] = await ethers.getSigners();
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Deployer:", deployer.address);

  // Get contract balance
  const balance = await ethers.provider.getBalance(DIAMOND_ADDRESS);
  console.log("\n💰 Diamond Balance:", ethers.formatEther(balance), "LYX");

  if (balance > 0) {
    // Define recipient addresses (you can change these)
    const recipients = [
      "0x38e456661bc6e95A3aCf3B4673844Cb389b60243", // Deployer
      "0x0000000000000000000000000000000000000001", // Replace with actual address
      "0x0000000000000000000000000000000000000002"  // Replace with actual address
    ];
    
    const amountPerRecipient = balance / 3n;
    
    console.log("\n📤 Withdrawing funds...");
    console.log("Amount per recipient:", ethers.formatEther(amountPerRecipient), "LYX");
    
    try {
      const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
      
      // First withdraw all platform fees
      try {
        const tx = await adminFacet.withdrawPlatformFees();
        await tx.wait();
        console.log("✅ Platform fees withdrawn");
      } catch (error: any) {
        console.log("⚠️  No platform fees to withdraw or error:", error.reason);
      }
      
      // Get updated balance
      const newBalance = await ethers.provider.getBalance(DIAMOND_ADDRESS);
      console.log("\n💰 Remaining balance:", ethers.formatEther(newBalance), "LYX");
      
      // Note: We need a special function to withdraw all funds
      // For now, let's document what needs to be done
      console.log("\n⚠️  To withdraw all funds, we need to:");
      console.log("1. Add an emergency withdraw function");
      console.log("2. Or process through existing withdrawal mechanisms");
      
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  }

  console.log("\n🧹 Preparing complete system reset...");
  console.log("This will:");
  console.log("- Reset all draw IDs to 0");
  console.log("- Clear all user histories");
  console.log("- Reset all balances");
  console.log("- Re-initialize platform draws");
  
  console.log("\n⚠️  WARNING: This is a destructive operation!");
  console.log("All existing data will be lost!");

  // Create reset function
  console.log("\n📝 Creating reset script...");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });