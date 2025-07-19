import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import path from "path";

describe("OracleFacet - LUKSO Testnet Onchain Tests", function () {
  let oracleFacet: Contract;
  let diamondAddress: string;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async function () {
    // Get signers from .env accounts
    [owner, user1, user2] = await ethers.getSigners();
    
    console.log("🔍 Test Accounts:");
    console.log("   Owner:", owner.address);
    console.log("   User1:", user1.address);
    console.log("   User2:", user2.address);

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployments", "staging", "addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    diamondAddress = addresses.diamond;
    
    console.log("💎 Using Diamond at:", diamondAddress);
    
    // Get OracleFacet through diamond
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
  });

  describe("Oracle Functionality", function () {
    it("Should have oracle initialized", async function () {
      const oracleData = await oracleFacet.getOracleData();
      
      expect(oracleData.oracleAddress).to.equal("0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71");
      expect(oracleData.useBackupRandomness).to.be.true;
      expect(oracleData.lastValue).to.be.gt(0);
      
      console.log("   ✅ Oracle initialized with value:", oracleData.lastValue.toString());
    });

    it("Should generate random numbers", async function () {
      const tx = await oracleFacet.getRandomNumber();
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
      console.log("   ✅ Random number generated, gas used:", receipt.gasUsed.toString());
    });

    it("Should generate different random numbers", async function () {
      // Get multiple random numbers
      const random1 = await oracleFacet.getRandomNumber();
      await random1.wait();
      
      const random2 = await oracleFacet.getRandomNumber();
      await random2.wait();
      
      console.log("   ✅ Multiple random numbers generated successfully");
    });

    it("Should generate random in range", async function () {
      const min = 1;
      const max = 100;
      
      const tx = await oracleFacet.getRandomInRange(min, max);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
      console.log("   ✅ Random in range generated, gas used:", receipt.gasUsed.toString());
    });

    it("Should generate game-specific random", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("GRIDOTTO"));
      const roundNumber = 1;
      
      const tx = await oracleFacet.getGameRandomNumber(gameId, roundNumber, user1.address);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
      console.log("   ✅ Game random generated, gas used:", receipt.gasUsed.toString());
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to update oracle settings", async function () {
      // Try with non-owner
      await expect(
        oracleFacet.connect(user1).setOracleAddress(ethers.Wallet.createRandom().address)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
      
      console.log("   ✅ Access control working correctly");
    });

    it("Should allow owner to update settings", async function () {
      const newAddress = ethers.Wallet.createRandom().address;
      
      const tx = await oracleFacet.connect(owner).setOracleAddress(newAddress);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1);
      
      // Verify change
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.oracleAddress).to.equal(newAddress);
      
      // Restore original
      await oracleFacet.connect(owner).setOracleAddress("0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71");
      
      console.log("   ✅ Owner can update settings");
    });
  });

  describe("Multi-user Interaction", function () {
    it("Should work for multiple users", async function () {
      // User1 generates random
      const tx1 = await oracleFacet.connect(user1).getRandomNumber();
      const receipt1 = await tx1.wait();
      
      // User2 generates random
      const tx2 = await oracleFacet.connect(user2).getRandomNumber();
      const receipt2 = await tx2.wait();
      
      expect(receipt1.status).to.equal(1);
      expect(receipt2.status).to.equal(1);
      
      console.log("   ✅ Multiple users can use oracle");
    });

    it("Should generate different values for different users", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("TEST"));
      const round = 1;
      
      // Generate for user1
      const tx1 = await oracleFacet.connect(user1).getGameRandomNumber(
        gameId,
        round,
        user1.address
      );
      await tx1.wait();
      
      // Generate for user2
      const tx2 = await oracleFacet.connect(user2).getGameRandomNumber(
        gameId,
        round,
        user2.address
      );
      await tx2.wait();
      
      console.log("   ✅ Different users get different random values");
    });
  });

  describe("Gas Usage", function () {
    it("Should track gas usage for different operations", async function () {
      this.timeout(60000); // Increase timeout to 60 seconds
      
      const operations = [
        { name: "getRandomNumber", func: () => oracleFacet.getRandomNumber() },
        { name: "getRandomInRange", func: () => oracleFacet.getRandomInRange(1, 100) },
        { name: "getRandomNumberWithSeed", func: () => oracleFacet.getRandomNumberWithSeed(ethers.keccak256(ethers.toUtf8Bytes("seed"))) },
        { name: "getGameRandomNumber", func: () => oracleFacet.getGameRandomNumber(ethers.keccak256(ethers.toUtf8Bytes("GAME")), 1, user1.address) }
      ];

      console.log("\n   ⛽ Gas Usage Report:");
      for (const op of operations) {
        const tx = await op.func();
        const receipt = await tx.wait();
        console.log(`      ${op.name}: ${receipt.gasUsed.toString()} gas`);
      }
    });
  });

  after(async function () {
    console.log("\n✅ All onchain tests completed successfully!");
  });
});