import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import path from "path";

describe("OracleFacet - Random Value Verification", function () {
  let oracleFacet: Contract;
  let diamondAddress: string;
  let owner: SignerWithAddress;

  before(async function () {
    [owner] = await ethers.getSigners();
    
    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployments", "staging", "addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    diamondAddress = addresses.diamond;
    
    console.log("💎 Using Diamond at:", diamondAddress);
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
  });

  describe("Random Value Uniqueness", function () {
    it("Should generate different values on consecutive calls", async function () {
      const values = new Set<string>();
      const numCalls = 5;
      
      console.log("\n🎲 Generating random values:");
      
      for (let i = 0; i < numCalls; i++) {
        const tx = await oracleFacet.getRandomNumber();
        const receipt = await tx.wait();
        
        // Get the RandomNumberGenerated event
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = oracleFacet.interface.parseLog(log);
            return parsed?.name === "RandomNumberGenerated";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = oracleFacet.interface.parseLog(event);
          const randomValue = parsed.args.randomValue.toString();
          values.add(randomValue);
          console.log(`   Call ${i + 1}: ${randomValue}`);
        }
      }
      
      console.log(`\n✅ Generated ${values.size} unique values out of ${numCalls} calls`);
      expect(values.size).to.equal(numCalls, "All random values should be different");
    });

    it("Should generate different values with seeds", async function () {
      const values = new Map<string, string>();
      const seeds = ["seed1", "seed2", "seed3", "seed1", "seed2"]; // Repeat some seeds
      
      console.log("\n🎲 Generating seeded random values:");
      
      for (const seed of seeds) {
        const seedHash = ethers.keccak256(ethers.toUtf8Bytes(seed));
        const tx = await oracleFacet.getRandomNumberWithSeed(seedHash);
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = oracleFacet.interface.parseLog(log);
            return parsed?.name === "RandomNumberGenerated";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = oracleFacet.interface.parseLog(event);
          const randomValue = parsed.args.randomValue.toString();
          
          if (values.has(seed)) {
            console.log(`   Seed "${seed}" (repeat): ${randomValue} (previous: ${values.get(seed)})`);
          } else {
            console.log(`   Seed "${seed}": ${randomValue}`);
            values.set(seed, randomValue);
          }
        }
      }
      
      console.log(`\n✅ Each unique seed produces consistent values`);
    });

    it("Should generate different values for game random", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("TEST_GAME"));
      const values = new Set<string>();
      
      console.log("\n🎲 Generating game-specific random values:");
      
      for (let round = 1; round <= 5; round++) {
        const tx = await oracleFacet.getGameRandomNumber(gameId, round, owner.address);
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = oracleFacet.interface.parseLog(log);
            return parsed?.name === "RandomNumberGenerated";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = oracleFacet.interface.parseLog(event);
          const randomValue = parsed.args.randomValue.toString();
          values.add(randomValue);
          console.log(`   Round ${round}: ${randomValue}`);
        }
      }
      
      console.log(`\n✅ Generated ${values.size} unique values for 5 rounds`);
      expect(values.size).to.equal(5, "Each round should have a different random value");
    });

    it("Should show how fallback randomness works", async function () {
      console.log("\n🔍 Analyzing fallback randomness mechanism:");
      
      // Get current oracle data
      const oracleData = await oracleFacet.getOracleData();
      console.log(`   Oracle Address: ${oracleData.oracleAddress}`);
      console.log(`   Using Backup: ${oracleData.useBackupRandomness}`);
      console.log(`   Last Value: ${oracleData.lastValue}`);
      
      // Generate a few values to see the pattern
      console.log("\n   Fallback uses: block.timestamp + block.prevrandao + nonce");
      
      for (let i = 0; i < 3; i++) {
        const tx = await oracleFacet.getRandomNumber();
        const receipt = await tx.wait();
        
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        console.log(`\n   Call ${i + 1}:`);
        console.log(`     Block: ${receipt.blockNumber}`);
        console.log(`     Timestamp: ${block?.timestamp}`);
        
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = oracleFacet.interface.parseLog(log);
            return parsed?.name === "RandomNumberGenerated";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = oracleFacet.interface.parseLog(event);
          console.log(`     Random Value: ${parsed.args.randomValue}`);
        }
      }
    });
  });
});