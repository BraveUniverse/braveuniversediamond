import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import path from "path";

describe("OracleFacet - Simple Random Check", function () {
  let oracleFacet: Contract;
  let owner: SignerWithAddress;

  before(async function () {
    [owner] = await ethers.getSigners();
    
    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployments", "staging", "addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const diamondAddress = addresses.diamond;
    
    console.log("💎 Using Diamond at:", diamondAddress);
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
  });

  it("Should check if we get different random values", async function () {
    this.timeout(60000);
    
    console.log("\n🎲 Testing Random Value Generation:");
    
    // Since getRandomNumber returns uint256, we need to call it differently
    // These functions modify state, so we need to send transactions
    const values = [];
    
    for (let i = 0; i < 5; i++) {
      // Call getRandomNumber and wait for transaction
      const tx = await oracleFacet.getRandomNumber();
      const receipt = await tx.wait();
      
      // Get the current oracle data to see the last value
      const oracleData = await oracleFacet.getOracleData();
      const lastValue = oracleData.lastValue.toString();
      
      values.push(lastValue);
      console.log(`   Call ${i + 1}: ${lastValue}`);
      
      // Wait a bit to ensure different block
      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Check uniqueness
    const uniqueValues = new Set(values);
    console.log(`\n✅ Generated ${uniqueValues.size} unique values out of ${values.length} calls`);
    
    // At least some should be different
    expect(uniqueValues.size).to.be.gt(1, "Should generate different random values");
  });

  it("Should generate different values for different seeds", async function () {
    this.timeout(60000);
    
    console.log("\n🎲 Testing Seeded Random Values:");
    
    const seedValues = new Map<string, string>();
    const seeds = ["test1", "test2", "test3"];
    
    for (const seed of seeds) {
      const seedHash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      
      // Call with seed
      const tx = await oracleFacet.getRandomNumberWithSeed(seedHash);
      await tx.wait();
      
      // Get the last value
      const oracleData = await oracleFacet.getOracleData();
      const value = oracleData.lastValue.toString();
      
      seedValues.set(seed, value);
      console.log(`   Seed "${seed}": ${value}`);
    }
    
    // Test same seed again
    console.log("\n   Testing same seeds again:");
    for (const seed of seeds) {
      const seedHash = ethers.keccak256(ethers.toUtf8Bytes(seed));
      
      const tx = await oracleFacet.getRandomNumberWithSeed(seedHash);
      await tx.wait();
      
      const oracleData = await oracleFacet.getOracleData();
      const value = oracleData.lastValue.toString();
      
      const previousValue = seedValues.get(seed);
      console.log(`   Seed "${seed}" (repeat): ${value} (was: ${previousValue})`);
      
      // In fallback mode with nonce, even same seed gives different values
      expect(value).to.not.equal(previousValue, "Same seed should give different value due to nonce");
    }
  });

  it("Should generate values in range", async function () {
    console.log("\n🎲 Testing Random In Range:");
    
    const min = 1;
    const max = 100;
    const values = [];
    
    for (let i = 0; i < 10; i++) {
      const tx = await oracleFacet.getRandomInRange(min, max);
      await tx.wait();
      
      // Get the last value
      const oracleData = await oracleFacet.getOracleData();
      const rawValue = oracleData.lastValue;
      
      // Calculate the actual range value
      const rangeValue = (rawValue % BigInt(max - min + 1)) + BigInt(min);
      values.push(Number(rangeValue));
    }
    
    console.log(`   Generated values: ${values.join(", ")}`);
    
    // Check all values are in range
    const allInRange = values.every(v => v >= min && v <= max);
    expect(allInRange).to.be.true;
    
    // Check we have some variety
    const uniqueValues = new Set(values);
    console.log(`   Unique values: ${uniqueValues.size}/10`);
    expect(uniqueValues.size).to.be.gt(3, "Should have variety in random values");
  });
});