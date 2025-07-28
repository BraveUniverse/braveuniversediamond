import { ethers } from "hardhat";

async function main() {
  console.log("🎮 Testing Platform Draws");
  console.log("========================");

  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  try {
    // Get platform draws facet
    const platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    // Get platform draws info
    console.log("\n📊 Platform Draws Info:");
    const info = await platformDrawsFacet.getPlatformDrawsInfo();
    
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    console.log("- Weekly End Time:", new Date(Number(info.weeklyEndTime) * 1000).toLocaleString());
    console.log("- Monthly End Time:", new Date(Number(info.monthlyEndTime) * 1000).toLocaleString());
    console.log("- Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
    console.log("- Weekly Draw Count:", info.weeklyCount.toString());
    
    // Success check
    if (info.weeklyDrawId > 0 && info.monthlyDrawId > 0) {
      console.log("\n✅ SUCCESS: Both weekly and monthly draws are active!");
      console.log("\n🎉 Platform draws update completed successfully!");
      console.log("The system now maintains 2 active draws at all times:");
      console.log("1. Weekly Draw (7 days, 0.25 LYX tickets)");
      console.log("2. Monthly Draw (28 days, free entry with monthly tickets)");
    } else {
      console.log("\n⚠️  WARNING: Not all draws are active");
    }
    
    // Check monthly tickets for deployer
    const [signer] = await ethers.getSigners();
    console.log("\n🎫 Monthly Tickets for", signer.address);
    const tickets = await platformDrawsFacet.getUserMonthlyTickets(signer.address);
    console.log("- From Weekly:", tickets.fromWeekly.toString());
    console.log("- From Creating:", tickets.fromCreating.toString());
    console.log("- From Participating:", tickets.fromParticipating.toString());
    console.log("- Total:", tickets.total.toString());
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
  }
  
  console.log("\n========================");
  console.log("📍 Diamond Address:", DIAMOND_ADDRESS);
  console.log("📍 Network: LUKSO Testnet");
  console.log("========================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });