import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing New Fee System");
  console.log("=========================");

  const [deployer] = await ethers.getSigners();
  const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
  
  console.log("Diamond:", DIAMOND_ADDRESS);
  console.log("Tester:", deployer.address);

  // Get interfaces
  const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
  const platformFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
  const resetFacet = await ethers.getContractAt("GridottoResetFacet", DIAMOND_ADDRESS);

  // Get system info
  console.log("\n📊 System Status:");
  const sysInfo = await resetFacet.getSystemInfo();
  console.log("- Next Draw ID:", sysInfo.nextDrawId.toString());
  console.log("- Weekly Draw ID:", sysInfo.weeklyDrawId.toString());
  console.log("- Monthly Draw ID:", sysInfo.monthlyDrawId.toString());
  console.log("- Platform Fees:", ethers.formatEther(sysInfo.platformFeesLYX), "LYX");
  console.log("- Monthly Pool:", ethers.formatEther(sysInfo.monthlyPoolBalance), "LYX");
  console.log("- Contract Balance:", ethers.formatEther(sysInfo.contractBalance), "LYX");

  // Get platform draws info
  const info = await platformFacet.getPlatformDrawsInfo();
  console.log("\n🎮 Platform Draws:");
  console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
  console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());

  // Test weekly draw ticket purchase
  console.log("\n🎟️  Testing Weekly Draw Ticket Purchase...");
  const ticketPrice = ethers.parseEther("0.25");
  const ticketCount = 2;
  const totalCost = ticketPrice * BigInt(ticketCount);
  
  console.log(`Buying ${ticketCount} tickets for ${ethers.formatEther(totalCost)} LYX...`);
  
  // Get draw details before
  const drawBefore = await coreFacet.getDrawDetails(info.weeklyDrawId);
  console.log("\n📋 Before Purchase:");
  console.log("- Prize Pool:", ethers.formatEther(drawBefore.prizePool), "LYX");
  console.log("- Tickets Sold:", drawBefore.ticketsSold.toString());
  console.log("- Executor Fee Collected:", ethers.formatEther(drawBefore.executorFeeCollected || 0n), "LYX");
  
  // Get system balances before
  const sysInfoBefore = await resetFacet.getSystemInfo();
  
  // Buy tickets
  const tx = await coreFacet.buyTickets(info.weeklyDrawId, ticketCount, { value: totalCost });
  await tx.wait();
  console.log("✅ Tickets purchased!");
  
  // Get draw details after
  const drawAfter = await coreFacet.getDrawDetails(info.weeklyDrawId);
  const sysInfoAfter = await resetFacet.getSystemInfo();
  
  console.log("\n📋 After Purchase:");
  console.log("- Prize Pool:", ethers.formatEther(drawAfter.prizePool), "LYX");
  console.log("- Prize Pool Increase:", ethers.formatEther(drawAfter.prizePool - drawBefore.prizePool), "LYX");
  console.log("- Tickets Sold:", drawAfter.ticketsSold.toString());
  console.log("- Executor Fee Collected:", ethers.formatEther(drawAfter.executorFeeCollected || 0n), "LYX");
  console.log("- Executor Fee Increase:", ethers.formatEther((drawAfter.executorFeeCollected || 0n) - (drawBefore.executorFeeCollected || 0n)), "LYX");
  
  // Calculate and verify fees
  console.log("\n💰 Fee Breakdown:");
  const platformFeeIncrease = sysInfoAfter.platformFeesLYX - sysInfoBefore.platformFeesLYX;
  const monthlyPoolIncrease = sysInfoAfter.monthlyPoolBalance - sysInfoBefore.monthlyPoolBalance;
  const executorFeeIncrease = (drawAfter.executorFeeCollected || 0n) - (drawBefore.executorFeeCollected || 0n);
  const prizePoolIncrease = drawAfter.prizePool - drawBefore.prizePool;
  
  console.log("- Platform Fee (5%):", ethers.formatEther(platformFeeIncrease), "LYX");
  console.log("- Executor Fee (5%):", ethers.formatEther(executorFeeIncrease), "LYX");
  console.log("- Monthly Pool (20%):", ethers.formatEther(monthlyPoolIncrease), "LYX");
  console.log("- Prize Pool (70%):", ethers.formatEther(prizePoolIncrease), "LYX");
  
  // Verify total
  const totalFees = platformFeeIncrease + executorFeeIncrease + monthlyPoolIncrease + prizePoolIncrease;
  console.log("\n✅ Total Accounted:", ethers.formatEther(totalFees), "LYX");
  console.log("✅ Total Paid:", ethers.formatEther(totalCost), "LYX");
  
  if (totalFees === totalCost) {
    console.log("\n✅ FEE SYSTEM WORKING CORRECTLY!");
    console.log("All fees are deducted upfront and allocated properly.");
  } else {
    console.log("\n❌ FEE MISMATCH!");
    console.log("Difference:", ethers.formatEther(totalCost - totalFees), "LYX");
  }

  // Show executor fee for this draw
  console.log("\n🎯 Draw-Specific Executor Fee:");
  console.log(`Draw ID ${info.weeklyDrawId}: ${ethers.formatEther(drawAfter.executorFeeCollected || 0n)} LYX collected`);
  console.log("This amount will be paid to the executor when the draw is executed.");

  console.log("\n✨ Test Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });