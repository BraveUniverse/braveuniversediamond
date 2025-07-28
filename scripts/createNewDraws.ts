import { ethers } from "hardhat";

async function main() {
  console.log("🎮 Creating New Platform Draws");
  console.log("==============================");

  const [deployer] = await ethers.getSigners();
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Executor:", deployer.address);

  const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
  const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);

  // Get current draws
  const info = await platformFacet.getPlatformDrawsInfo();
  console.log("\n📊 Current Draws:");
  console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
  console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());

  // Check if weekly draw ended
  if (info.weeklyDrawId > 0) {
    const weeklyDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
    const now = Math.floor(Date.now() / 1000);
    
    if (now >= weeklyDraw.endTime) {
      console.log("\n⏰ Weekly draw has ended!");
      console.log("Executing weekly draw...");
      
      try {
        const tx = await platformFacet.executeWeeklyDraw();
        await tx.wait();
        console.log("✅ Weekly draw executed!");
        
        // Get new draw info
        const newInfo = await platformFacet.getPlatformDrawsInfo();
        console.log("\n📊 New Draws:");
        console.log("- Weekly Draw ID:", newInfo.weeklyDrawId.toString());
        console.log("- Monthly Draw ID:", newInfo.monthlyDrawId.toString());
        
        // Get new weekly draw details
        const newWeeklyDraw = await coreFacet.getDrawDetails(newInfo.weeklyDrawId);
        console.log("\n📋 New Weekly Draw:");
        console.log("- Start:", new Date(Number(newWeeklyDraw.startTime) * 1000).toLocaleString());
        console.log("- End:", new Date(Number(newWeeklyDraw.endTime) * 1000).toLocaleString());
        console.log("- Prize Pool:", ethers.formatEther(newWeeklyDraw.prizePool), "LYX");
        
      } catch (error: any) {
        console.error("❌ Error executing weekly draw:", error.message);
      }
    } else {
      console.log("\n✅ Weekly draw still active");
      console.log("- End time:", new Date(Number(weeklyDraw.endTime) * 1000).toLocaleString());
    }
  }

  console.log("\n✨ Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });