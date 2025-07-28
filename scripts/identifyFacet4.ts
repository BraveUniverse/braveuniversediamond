import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Identifying Facet 4");
  console.log("======================");

  const FACET_ADDRESS = "0x1BfD2cb273361Af8F1771854Cc4eaAfc4f619c53";
  
  // Known function signatures from GridottoCoreV2Facet
  const knownSignatures = [
    { name: "createTokenDraw", sig: "function createTokenDraw(address,uint256,uint256,uint256,uint256,uint256,uint256)" },
    { name: "createNFTDraw", sig: "function createNFTDraw(address,bytes32[],uint256,uint256,uint256,uint256,uint256)" },
    { name: "createLYXDraw", sig: "function createLYXDraw(uint256,uint256,uint256,uint256,uint256)" },
    { name: "buyTickets", sig: "function buyTickets(uint256,uint256)" },
    { name: "cancelDraw", sig: "function cancelDraw(uint256)" },
    { name: "getDrawDetails", sig: "function getDrawDetails(uint256)" },
    { name: "getUserDrawHistory", sig: "function getUserDrawHistory(address)" }
  ];

  const iface = new ethers.Interface([]);
  
  console.log("\nChecking function signatures:");
  console.log("==============================");
  
  for (const func of knownSignatures) {
    try {
      const fragment = ethers.FunctionFragment.from(func.sig);
      const selector = iface.getFunction(fragment.name, fragment.inputs)?.selector || 
                      ethers.id(func.sig).substring(0, 10);
      console.log(`${func.name}: ${selector}`);
    } catch (error) {
      console.log(`${func.name}: Error calculating selector`);
    }
  }

  // Let's check if this is indeed GridottoCoreV2Facet by calling it
  console.log("\n🎯 Testing if Facet 4 is GridottoCoreV2Facet...");
  
  try {
    const contract = await ethers.getContractAt("GridottoCoreV2Facet", FACET_ADDRESS);
    
    // Try to get draw details for draw ID 1
    const drawDetails = await contract.getDrawDetails(1);
    console.log("\n✅ SUCCESS! This is GridottoCoreV2Facet");
    console.log("Draw 1 details:");
    console.log("- Creator:", drawDetails.creator);
    console.log("- Draw Type:", drawDetails.drawType);
    console.log("- Ticket Price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
  } catch (error: any) {
    console.log("\n❌ This doesn't appear to be GridottoCoreV2Facet");
    console.log("Error:", error.message);
  }

  // Alternative: Use it through the diamond
  console.log("\n🔷 Testing through Diamond...");
  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";
  
  try {
    const coreV2 = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const drawDetails = await coreV2.getDrawDetails(1);
    console.log("\n✅ GridottoCoreV2Facet is accessible through Diamond!");
    console.log("Draw 1 details:");
    console.log("- Creator:", drawDetails.creator);
    console.log("- Draw Type:", drawDetails.drawType);
    console.log("- Ticket Price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
  } catch (error: any) {
    console.log("\n❌ GridottoCoreV2Facet not accessible through Diamond");
    console.log("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });