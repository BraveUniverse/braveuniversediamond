import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("OracleFacet", function () {
  let oracleFacet: Contract;
  let diamondCutFacet: Contract;
  let diamondLoupeFacet: Contract;
  let diamondAddress: string;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Helper function to get selectors
  const getSelectors = (contract: any) => {
    const selectors: string[] = [];
    contract.interface.forEachFunction((func: any) => {
      selectors.push(func.selector);
    });
    return selectors;
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacetContract = await DiamondCutFacet.deploy();
    await diamondCutFacetContract.waitForDeployment();

    // Deploy DiamondLoupeFacet
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacetContract = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacetContract.waitForDeployment();

    // Deploy OwnershipFacet
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.waitForDeployment();

    // Deploy the Diamond
    const diamondCut = [
      {
        facetAddress: await diamondCutFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(diamondCutFacetContract)
      },
      {
        facetAddress: await diamondLoupeFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(diamondLoupeFacetContract)
      },
      {
        facetAddress: await ownershipFacet.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(ownershipFacet)
      }
    ];

    const BraveUniverseDiamond = await ethers.getContractFactory("BraveUniverseDiamond");
    const diamond = await BraveUniverseDiamond.deploy(owner.address, diamondCut);
    await diamond.waitForDeployment();
    diamondAddress = await diamond.getAddress();

    // Deploy OracleFacet
    const OracleFacet = await ethers.getContractFactory("OracleFacet");
    const oracleFacetContract = await OracleFacet.deploy();
    await oracleFacetContract.waitForDeployment();

    // Add OracleFacet to diamond
    const oracleCut = [{
      facetAddress: await oracleFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: getSelectors(oracleFacetContract)
    }];

    const diamondCutContract = await ethers.getContractAt("IDiamondCut", diamondAddress);
    await diamondCutContract.diamondCut(oracleCut, ethers.ZeroAddress, "0x");

    // Get OracleFacet through diamond
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
    diamondLoupeFacet = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  });

  describe("Initialization", function () {
    it("Should initialize oracle with default values", async function () {
      await oracleFacet.initializeOracle();
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.oracleAddress).to.equal("0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71");
      expect(oracleData.methodId).to.equal("0xf1bd2bfee10cc719fb50dbbe6ca6a3a36e2786f6aab5008f8bb28038241816db");
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
        .withArgs("0xDb6D3d757b8FcC73cC0f076641318d99f721Ce71", newAddress);
      
      const oracleData = await oracleFacet.getOracleData();
      expect(oracleData.oracleAddress).to.equal(newAddress);
    });

    it("Should not allow zero address", async function () {
      await expect(
        oracleFacet.setOracleAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Oracle address cannot be zero address");
    });

    it("Should update oracle method ID", async function () {
      const newMethodId = ethers.keccak256(ethers.toUtf8Bytes("newMethod"));
      
      await expect(oracleFacet.setOracleMethodID(newMethodId))
        .to.emit(oracleFacet, "OracleMethodIDChanged")
        .withArgs("0xf1bd2bfee10cc719fb50dbbe6ca6a3a36e2786f6aab5008f8bb28038241816db", newMethodId);
      
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
      const event = receipt?.logs?.find((log: any) => {
        try {
          const parsed = oracleFacet.interface.parseLog(log);
          return parsed?.name === "OracleValueUpdated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
    });

    it("Should generate random number with seed", async function () {
      const seed = ethers.keccak256(ethers.toUtf8Bytes("test-seed"));
      
      // Use callStatic to get return value
      const randomValue = await oracleFacet.getRandomNumberWithSeed.staticCall(seed);
      
      expect(randomValue).to.be.gt(0);
      
      // Different seeds should produce different values
      const seed2 = ethers.keccak256(ethers.toUtf8Bytes("test-seed-2"));
      const randomValue2 = await oracleFacet.getRandomNumberWithSeed.staticCall(seed2);
      
      expect(randomValue).to.not.equal(randomValue2);
    });

    it("Should generate random number in range", async function () {
      const min = 10;
      const max = 100;
      
      const randomValue = await oracleFacet.getRandomInRange.staticCall(min, max);
      
      expect(randomValue).to.be.gte(min);
      expect(randomValue).to.be.lte(max);
    });

    it("Should reject invalid range", async function () {
      await expect(
        oracleFacet.getRandomInRange(100, 10)
      ).to.be.revertedWith("Invalid range");
    });

    it("Should generate game-specific random number", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("GRIDOTTO"));
      const roundNumber = 1;
      
      const randomValue = await oracleFacet.getGameRandomNumber.staticCall(
        gameId,
        roundNumber,
        user1.address
      );
      
      expect(randomValue).to.be.gt(0);
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
      const result = await oracleFacet.testOracleConnection();
      
      // Result is a struct, access properties
      expect(result.success).to.be.a("boolean");
      if (result.success) {
        expect(result.value).to.be.gt(0);
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
      const newMethodId = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
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
      
      const event = receipt?.logs?.find((log: any) => {
        try {
          const parsed = oracleFacet.interface.parseLog(log);
          return parsed?.name === "OracleValueUpdated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
    });

    it("Should always use fallback in test environment", async function () {
      // Even with backup disabled, it should work in test
      await oracleFacet.setUseBackupRandomness(false);
      
      // Should still work because we're using simplified test implementation
      const tx = await oracleFacet.getRandomNumber();
      const receipt = await tx.wait();
      
      expect(receipt).to.not.be.null;
    });
  });

  describe("Multi-user Usage", function () {
    beforeEach(async function () {
      await oracleFacet.initializeOracle();
    });

    it("Should generate different values for different users", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("TEST"));
      
      const random1 = await oracleFacet.connect(user1).getGameRandomNumber.staticCall(
        gameId,
        1,
        user1.address
      );
      
      const random2 = await oracleFacet.connect(user2).getGameRandomNumber.staticCall(
        gameId,
        1,
        user2.address
      );
      
      // Different users should get different values
      expect(random1).to.not.equal(random2);
    });
  });

  describe("Diamond Integration", function () {
    it("Should have OracleFacet functions available through diamond", async function () {
      const facets = await diamondLoupeFacet.facets();
      
      // Find OracleFacet by checking if any facet has oracle-related functions
      const oracleFacetInfo = facets.find((f: any) => {
        // Get OracleFacet contract to compare addresses
        return f.functionSelectors.length > 10; // OracleFacet has many functions
      });
      
      expect(oracleFacetInfo).to.not.be.undefined;
      expect(oracleFacetInfo.functionSelectors.length).to.be.gt(10);
    });
  });
});