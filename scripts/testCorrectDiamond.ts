import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Correct Diamond");
  console.log("==========================");

  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  console.log("Diamond Address:", DIAMOND_ADDRESS);

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Test Platform Draws
  console.log("\n📊 Platform Draws Status:");
  try {
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const info = await platformFacet.getPlatformDrawsInfo();
    
    console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
    console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
    console.log("- Weekly End Time:", info.weeklyEndTime > 0 ? new Date(Number(info.weeklyEndTime) * 1000).toLocaleString() : "Not set");
    console.log("- Monthly End Time:", info.monthlyEndTime > 0 ? new Date(Number(info.monthlyEndTime) * 1000).toLocaleString() : "Not set");
    console.log("- Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
    console.log("- Weekly Draw Count:", info.weeklyCount.toString());
    
    // Check if monthly draw needs to be created
    if (info.monthlyDrawId == 0) {
      console.log("\n⚠️  Monthly draw not created yet!");
      console.log("This is the old system behavior. Let's check if we can execute monthly draw...");
      
      // Try to execute monthly draw (which should create it)
      try {
        console.log("\n🎲 Attempting to execute monthly draw to create it...");
        const tx = await platformFacet.executeMonthlyDraw();
        await tx.wait();
        console.log("✅ Monthly draw executed/created!");
        
        // Check again
        const newInfo = await platformFacet.getPlatformDrawsInfo();
        console.log("\nUpdated status:");
        console.log("- Monthly Draw ID:", newInfo.monthlyDrawId.toString());
        console.log("- Monthly End Time:", newInfo.monthlyEndTime > 0 ? new Date(Number(newInfo.monthlyEndTime) * 1000).toLocaleString() : "Not set");
      } catch (error: any) {
        console.log("❌ Cannot execute monthly draw:", error.reason || error.message);
      }
    }
  } catch (error: any) {
    console.error("❌ Platform Draws Error:", error.message);
  }

  // Test Core Functions
  console.log("\n🎯 Testing Core Functions:");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    
    // Try to get draw details for weekly draw
    if (true) { // Always try
      const drawDetails = await coreFacet.getDrawDetails(1);
      console.log("\n✅ Weekly Draw Details:");
      console.log("- Creator:", drawDetails.creator);
      console.log("- Draw Type:", drawDetails.drawType, "(3 = PLATFORM_WEEKLY)");
      console.log("- Ticket Price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
      console.log("- Tickets Sold:", drawDetails.ticketsSold.toString());
      console.log("- Prize Pool:", ethers.formatEther(drawDetails.prizePool), "LYX");
    }
  } catch (error: any) {
    console.error("❌ Core Functions Error:", error.message);
  }

  // Test buying tickets
  console.log("\n🎟️  Testing Ticket Purchase:");
  try {
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    
    const info = await platformFacet.getPlatformDrawsInfo();
    if (info.weeklyDrawId > 0) {
      const ticketPrice = ethers.parseEther("0.25");
      console.log("Buying 1 ticket for weekly draw...");
      
      const tx = await coreFacet.buyTickets(info.weeklyDrawId, 1, { value: ticketPrice });
      await tx.wait();
      console.log("✅ Ticket purchased successfully!");
      
      // Check monthly tickets
      const monthlyTickets = await platformFacet.getUserMonthlyTickets(signer.address);
      console.log("\n🎫 Your Monthly Tickets:");
      console.log("- From Weekly:", monthlyTickets.fromWeekly.toString());
      console.log("- From Creating:", monthlyTickets.fromCreating.toString());
      console.log("- From Participating:", monthlyTickets.fromParticipating.toString());
      console.log("- Total:", monthlyTickets.total.toString());
    }
  } catch (error: any) {
    console.error("❌ Ticket Purchase Error:", error.message);
  }

  console.log("\n✨ Test Complete!");
  console.log("==================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });