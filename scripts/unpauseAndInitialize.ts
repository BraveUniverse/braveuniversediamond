import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Unpause System and Initialize Platform Draws");
  console.log("==============================================");

  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  const [signer] = await ethers.getSigners();
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Signer:", signer.address);

  // Step 1: Unpause the system
  console.log("\n🔓 Unpausing system...");
  try {
    const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
    
    // Check if paused
    const status = await adminFacet.getSystemStatus();
    console.log("Current status - Paused:", status.paused);
    
    if (status.paused) {
      const tx = await adminFacet.unpauseSystem();
      await tx.wait();
      console.log("✅ System unpaused!");
    } else {
      console.log("✅ System already unpaused");
    }
  } catch (error: any) {
    console.error("❌ Error unpausing:", error.message);
  }

  // Step 2: Check platform draws status
  console.log("\n📊 Checking platform draws...");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const info = await platformFacet.getPlatformDrawsInfo();
    
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    console.log("- Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
    
    // Step 3: Create monthly draw if needed
    if (info.monthlyDrawId == 0 && info.weeklyDrawId > 0) {
      console.log("\n📅 Creating monthly draw...");
      
      // First, we need to check if the current code supports direct monthly creation
      // If not, we might need to wait for 4 weekly draws
      console.log("Note: The old system requires 4 weekly draws before creating monthly.");
      console.log("Current weekly count:", info.weeklyCount.toString());
      
      // Try to manually trigger monthly draw creation
      try {
        // Check if initializePlatformDraws creates both
        const tx = await platformFacet.initializePlatformDraws();
        await tx.wait();
        console.log("✅ Platform draws re-initialized!");
      } catch (error: any) {
        console.log("❌ Cannot re-initialize:", error.reason || error.message);
        
        // Alternative: Execute weekly draws to reach count of 4
        if (info.weeklyCount < 4) {
          console.log("\n⚠️  Need to complete", 4 - Number(info.weeklyCount), "more weekly draws");
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Platform draws error:", error.message);
  }

  // Step 4: Test ticket purchase
  console.log("\n🎟️  Testing ticket purchase...");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    if (info.weeklyDrawId > 0) {
      const ticketPrice = ethers.parseEther("0.25");
      const tx = await coreFacet.buyTickets(info.weeklyDrawId, 1, { value: ticketPrice });
      await tx.wait();
      console.log("✅ Ticket purchased successfully!");
      
      // Check monthly tickets
      const tickets = await platformFacet.getUserMonthlyTickets(signer.address);
      console.log("\n🎫 Monthly tickets earned:");
      console.log("- From weekly:", tickets.fromWeekly.toString());
      console.log("- Total:", tickets.total.toString());
    }
  } catch (error: any) {
    console.error("❌ Ticket purchase error:", error.message);
  }

  // Final status
  console.log("\n📊 Final Status:");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    const status = await adminFacet.getSystemStatus();
    
    console.log("- System Paused:", status.paused);
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    console.log("- Weekly End:", new Date(Number(info.weeklyEndTime) * 1000).toLocaleString());
    console.log("- Monthly Pool:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
    
    if (info.monthlyDrawId > 0) {
      console.log("\n✅ SUCCESS: Both weekly and monthly draws are active!");
    } else {
      console.log("\n⚠️  Monthly draw still needs to be created");
      console.log("The updated code should create it automatically with initializePlatformDraws()");
    }
  } catch (error: any) {
    console.error("❌ Final status error:", error.message);
  }

  console.log("\n✨ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });