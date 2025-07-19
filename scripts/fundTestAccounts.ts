import { ethers } from "hardhat";

async function main() {
  const [owner, user1, user2] = await ethers.getSigners();
  
  console.log("💰 Funding test accounts...");
  console.log("Owner balance:", ethers.formatEther(await owner.provider.getBalance(owner.address)), "LYX");
  console.log("User1 balance:", ethers.formatEther(await user1.provider.getBalance(user1.address)), "LYX");
  console.log("User2 balance:", ethers.formatEther(await user2.provider.getBalance(user2.address)), "LYX");
  
  // Send 0.1 LYX to each test account
  const amount = ethers.parseEther("0.1");
  
  if (await user1.provider.getBalance(user1.address) < amount) {
    console.log("\n📤 Sending 0.1 LYX to User1...");
    const tx1 = await owner.sendTransaction({
      to: user1.address,
      value: amount
    });
    await tx1.wait();
    console.log("✅ Sent to User1");
  }
  
  if (await user2.provider.getBalance(user2.address) < amount) {
    console.log("\n📤 Sending 0.1 LYX to User2...");
    const tx2 = await owner.sendTransaction({
      to: user2.address,
      value: amount
    });
    await tx2.wait();
    console.log("✅ Sent to User2");
  }
  
  console.log("\n💰 Updated balances:");
  console.log("User1:", ethers.formatEther(await user1.provider.getBalance(user1.address)), "LYX");
  console.log("User2:", ethers.formatEther(await user2.provider.getBalance(user2.address)), "LYX");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });