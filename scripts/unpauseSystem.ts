import { ethers } from "hardhat";

async function main() {
  console.log("🔓 Unpausing System");
  console.log("===================");

  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  const [signer] = await ethers.getSigners();
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Signer:", signer.address);

  try {
    // Try different admin facet versions
    console.log("\n🔧 Trying to unpause system...");
    
    // First try GridottoAdminFacetV2
    try {
      const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
      const tx = await adminFacet.unpauseSystem();
      await tx.wait();
      console.log("✅ System unpaused using GridottoAdminFacetV2!");
    } catch (error: any) {
      console.log("GridottoAdminFacetV2 failed:", error.reason || error.message);
      
      // Try GridottoAdminFacet (v1)
      try {
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        const tx = await adminFacet.unpauseSystem();
        await tx.wait();
        console.log("✅ System unpaused using GridottoAdminFacet!");
      } catch (error2: any) {
        console.error("❌ Could not unpause:", error2.reason || error2.message);
      }
    }
    
    // Test if system is working
    console.log("\n🧪 Testing system...");
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    console.log("\n📊 Platform Draws:");
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    
    // Try buying a ticket
    if (info.weeklyDrawId > 0) {
      console.log("\n🎟️  Buying test ticket...");
      const ticketPrice = ethers.parseEther("0.25");
      const tx = await coreFacet.buyTickets(info.weeklyDrawId, 1, { value: ticketPrice });
      await tx.wait();
      console.log("✅ Ticket purchased successfully!");
      
      // Check draw details
      const drawDetails = await coreFacet.getDrawDetails(info.weeklyDrawId);
      console.log("\n📋 Weekly Draw Details:");
      console.log("- Tickets Sold:", drawDetails.ticketsSold.toString());
      console.log("- Prize Pool:", ethers.formatEther(drawDetails.prizePool), "LYX");
      
      // Check monthly tickets
      const tickets = await platformFacet.getUserMonthlyTickets(signer.address);
      console.log("\n🎫 Your Monthly Tickets:");
      console.log("- From Weekly:", tickets.fromWeekly.toString());
      console.log("- Total:", tickets.total.toString());
    }
    
    console.log("\n✅ System is active and working!");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }

  console.log("\n✨ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });