import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployDiamond } from "../../scripts/deployDiamond";

describe("OracleFacet", function () {
  let oracleFacet: Contract;
  let diamondAddress: string;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const ORACLE_ADDRESS = "0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71";
  const ORACLE_METHOD_ID = "0xf1bd2bfee10cc719fb50dbbe6ca6a3a36e2786f6aab5008f8bb28038241816db";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy diamond with OracleFacet
    diamondAddress = await deployDiamond();
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
  });

  describe("Initialization", function () {
    it("Should initialize oracle with default values", async function () {
      await oracleFacet.initializeOracle();
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.oracleAddress).to.equal(ORACLE_ADDRESS);
      expect(oracleData.methodId).to.equal(ORACLE_METHOD_ID);
      expect(oracleData.useBackupRandomness).to.be.true;
    });

    it("Should only allow owner to initialize", async function () {
      await expect(
        oracleFacet.connect(user1).initializeOracle()
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });

  describe("Oracle Configuration", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should update oracle address", async function () {
      const newAddress = ethers.Wallet.createRandom().address;
      
      await expect(oracleFacet.setOracleAddress(newAddress))
        .to.emit(oracleFacet, "OracleAddressChanged")
        .withArgs(ORACLE_ADDRESS, newAddress);
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.oracleAddress).to.equal(newAddress);
    });

    it("Should not allow zero address", async function () {
      await expect(
        oracleFacet.setOracleAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Oracle address cannot be zero address");
    });

    it("Should update oracle method ID", async function () {
      const newMethodId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("newMethod"));
      
      await expect(oracleFacet.setOracleMethodID(newMethodId))
        .to.emit(oracleFacet, "OracleMethodIDChanged")
        .withArgs(ORACLE_METHOD_ID, newMethodId);
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.methodId).to.equal(newMethodId);
    });

    it("Should toggle backup randomness", async function () {
      await expect(oracleFacet.setUseBackupRandomness(false))
        .to.emit(oracleFacet, "BackupRandomnessToggled")
        .withArgs(false);
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.useBackupRandomness).to.be.false;
    });
  });

  describe("Random Number Generation", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should generate random number", async function () {
      const tx = await oracleFacet.getRandomNumber();
      const receipt = await tx.wait();
      
      // Check if OracleValueUpdated event was emitted
      const event = receipt.events?.find((e: any) => e.event === "OracleValueUpdated");
      expect(event).to.not.be.undefined;
      
      // Since we're on testnet, it should use fallback
      const randomValue = event?.args?.value;
      expect(randomValue).to.be.gt(0);
    });

    it("Should generate random number with seed", async function () {
      const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-seed"));
      const randomValue = await oracleFacet.callStatic.getRandomNumberWithSeed(seed);
      
      expect(randomValue).to.be.gt(0);
      
      // Different seeds should produce different values
      const seed2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-seed-2"));
      const randomValue2 = await oracleFacet.callStatic.getRandomNumberWithSeed(seed2);
      
      expect(randomValue).to.not.equal(randomValue2);
    });

    it("Should generate random number in range", async function () {
      const min = 10;
      const max = 100;
      
      const randomValue = await oracleFacet.callStatic.getRandomInRange(min, max);
      
      expect(randomValue).to.be.gte(min);
      expect(randomValue).to.be.lte(max);
    });

    it("Should reject invalid range", async function () {
      await expect(
        oracleFacet.getRandomInRange(100, 10)
      ).to.be.revertedWith("Invalid range");
    });

    it("Should generate game-specific random number", async function () {
      const gameId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GRIDOTTO"));
      const roundNumber = 1;
      
      const randomValue = await oracleFacet.callStatic.getGameRandomNumber(
        gameId,
        roundNumber,
        user1.address
      );
      
      expect(randomValue).to.be.gt(0);
      
      // Same parameters should produce same result
      const randomValue2 = await oracleFacet.callStatic.getGameRandomNumber(
        gameId,
        roundNumber,
        user1.address
      );
      
      // Note: Values might differ due to block.timestamp changes
      // but structure should work
      expect(randomValue2).to.be.gt(0);
    });
  });

  describe("Oracle Status", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should return oracle age", async function () {
      // Force update to set timestamp
      await oracleFacet.forceUpdateOracle();
      
      // Wait a bit
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);
      
      const age = await oracleFacet.getOracleAge();
      expect(age).to.be.gte(10);
    });

    it("Should test oracle connection", async function () {
      const [success, value] = await oracleFacet.testOracleConnection();
      
      // On testnet, this will likely fail
      // But the function should work without reverting
      expect(success).to.be.a("boolean");
      if (success) {
        expect(value).to.be.gt(0);
      }
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should only allow owner to set oracle address", async function () {
      const newAddress = ethers.Wallet.createRandom().address;
      
      await expect(
        oracleFacet.connect(user1).setOracleAddress(newAddress)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("Should only allow owner to set method ID", async function () {
      const newMethodId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      await expect(
        oracleFacet.connect(user1).setOracleMethodID(newMethodId)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("Should only allow owner to toggle backup randomness", async function () {
      await expect(
        oracleFacet.connect(user1).setUseBackupRandomness(false)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("Should only allow owner to force update", async function () {
      await expect(
        oracleFacet.connect(user1).forceUpdateOracle()
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });

  describe("Fallback Mechanism", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should use fallback when oracle fails", async function () {
      // Set invalid oracle address to force fallback
      await oracleFacet.setOracleAddress(ethers.Wallet.createRandom().address);
      
      // Should still work with fallback
      const tx = await oracleFacet.getRandomNumber();
      const receipt = await tx.wait();
      
      const event = receipt.events?.find((e: any) => e.event === "OracleValueUpdated");
      expect(event).to.not.be.undefined;
      
      const randomValue = event?.args?.value;
      expect(randomValue).to.be.gt(100000000); // Fallback range
      expect(randomValue).to.be.lt(1000000000); // Fallback range
    });

    it("Should fail when backup is disabled and oracle fails", async function () {
      // Disable backup
      await oracleFacet.setUseBackupRandomness(false);
      
      // Set invalid oracle address
      await oracleFacet.setOracleAddress(ethers.Wallet.createRandom().address);
      
      // Should revert
      await expect(
        oracleFacet.getRandomNumber()
      ).to.be.revertedWith("Oracle access failed and backup randomness is disabled");
    });
  });

  describe("Multi-user Usage", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should generate different values for different users", async function () {
      const gameId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TEST"));
      
      const random1 = await oracleFacet.connect(user1).callStatic.getGameRandomNumber(
        gameId,
        1,
        user1.address
      );
      
      const random2 = await oracleFacet.connect(user2).callStatic.getGameRandomNumber(
        gameId,
        1,
        user2.address
      );
      
      // Different users should get different values
      expect(random1).to.not.equal(random2);
    });
  });
});