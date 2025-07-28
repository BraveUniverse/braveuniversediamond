import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying Platform Draws Update");
  console.log("===================================");

  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  // Get facet instances
  const platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
  const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);

  // Get platform draws info
  console.log("\n📊 Platform Draws Status:");
  const info = await platformDrawsFacet.getPlatformDrawsInfo();
  
  console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
  console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
  console.log("- Weekly End Time:", new Date(Number(info.weeklyEndTime) * 1000).toLocaleString());
  console.log("- Monthly End Time:", new Date(Number(info.monthlyEndTime) * 1000).toLocaleString());
  console.log("- Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
  console.log("- Weekly Draw Count:", info.weeklyCount.toString());

  // Verify both draws are active
  if (info.weeklyDrawId > 0 && info.monthlyDrawId > 0) {
    console.log("\n✅ SUCCESS: Both weekly and monthly draws are active!");
  } else {
    console.log("\n❌ ERROR: Not all draws are active!");
  }

  // Get weekly draw details
  if (info.weeklyDrawId > 0) {
    console.log("\n📋 Weekly Draw Details:");
    const weeklyDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
    console.log("- Draw Type:", weeklyDraw.drawType.toString(), "(3 = PLATFORM_WEEKLY)");
    console.log("- Ticket Price:", ethers.formatEther(weeklyDraw.ticketPrice), "LYX");
    console.log("- Max Tickets:", weeklyDraw.maxTickets.toString());
    console.log("- Min Participants:", weeklyDraw.minParticipants.toString());
    console.log("- Creator:", weeklyDraw.creator);
    console.log("- Tickets Sold:", weeklyDraw.ticketsSold.toString());
    console.log("- Prize Pool:", ethers.formatEther(weeklyDraw.prizePool), "LYX");
  }

  // Get monthly draw details
  if (info.monthlyDrawId > 0) {
    console.log("\n📋 Monthly Draw Details:");
    const monthlyDraw = await coreFacet.getDrawDetails(info.monthlyDrawId);
    console.log("- Draw Type:", monthlyDraw.drawType.toString(), "(4 = PLATFORM_MONTHLY)");
    console.log("- Ticket Price:", ethers.formatEther(monthlyDraw.ticketPrice), "LYX (should be 0)");
    console.log("- Max Tickets:", monthlyDraw.maxTickets.toString());
    console.log("- Min Participants:", monthlyDraw.minParticipants.toString());
    console.log("- Creator:", monthlyDraw.creator);
    console.log("- Prize Pool:", ethers.formatEther(monthlyDraw.prizePool), "LYX");
  }

  // Test buying weekly ticket
  console.log("\n🎟️  Testing Weekly Ticket Purchase...");
  try {
    const [signer] = await ethers.getSigners();
    const ticketPrice = ethers.parseEther("0.25");
    
    const tx = await coreFacet.buyTickets(info.weeklyDrawId, 1, { value: ticketPrice });
    await tx.wait();
    
    console.log("✅ Successfully bought 1 weekly ticket!");
    console.log("Transaction hash:", tx.hash);
    
    // Check updated draw details
    const updatedDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
    console.log("- Updated Tickets Sold:", updatedDraw.ticketsSold.toString());
    console.log("- Updated Prize Pool:", ethers.formatEther(updatedDraw.prizePool), "LYX");
  } catch (error: any) {
    console.log("❌ Failed to buy ticket:", error.message);
  }

  // Check monthly tickets
  console.log("\n🎫 Checking Monthly Tickets...");
  const [signer] = await ethers.getSigners();
  const monthlyTickets = await platformDrawsFacet.getUserMonthlyTickets(signer.address);
  console.log("- From Weekly:", monthlyTickets.fromWeekly.toString());
  console.log("- From Creating:", monthlyTickets.fromCreating.toString());
  console.log("- From Participating:", monthlyTickets.fromParticipating.toString());
  console.log("- Total:", monthlyTickets.total.toString());

  console.log("\n✨ Verification Complete!");
  console.log("===================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });