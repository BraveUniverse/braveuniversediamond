import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("GridottoPlatformDrawsFacet", function () {
  let diamond: Contract;
  let platformDrawsFacet: Contract;
  let coreFacet: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy diamond and facets
    // ... deployment code ...
    
    // Get facet instances
    platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", diamond.address);
    coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", diamond.address);
  });

  describe("Platform Draws Initialization", function () {
    it("Should initialize both weekly and monthly draws", async function () {
      await platformDrawsFacet.connect(owner).initializePlatformDraws();
      
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      // Both draws should be active
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
      
      // Check end times
      const currentTime = Math.floor(Date.now() / 1000);
      expect(info.weeklyEndTime).to.be.closeTo(currentTime + 7 * 24 * 60 * 60, 60);
      expect(info.monthlyEndTime).to.be.closeTo(currentTime + 28 * 24 * 60 * 60, 60);
      
      // Initial monthly pool should be 0
      expect(info.monthlyPoolBalance).to.equal(0);
      expect(info.weeklyCount).to.equal(0);
    });

    it("Should have correct draw configurations", async function () {
      await platformDrawsFacet.connect(owner).initializePlatformDraws();
      
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      // Check weekly draw
      const weeklyDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
      expect(weeklyDraw.drawType).to.equal(3); // PLATFORM_WEEKLY
      expect(weeklyDraw.ticketPrice).to.equal(ethers.utils.parseEther("0.25"));
      expect(weeklyDraw.minParticipants).to.equal(0);
      
      // Check monthly draw
      const monthlyDraw = await coreFacet.getDrawDetails(info.monthlyDrawId);
      expect(monthlyDraw.drawType).to.equal(4); // PLATFORM_MONTHLY
      expect(monthlyDraw.ticketPrice).to.equal(0); // Free entry
      expect(monthlyDraw.minParticipants).to.equal(0);
    });
  });

  describe("Weekly Draw Execution", function () {
    beforeEach(async function () {
      await platformDrawsFacet.connect(owner).initializePlatformDraws();
    });

    it("Should accumulate monthly pool from weekly draws", async function () {
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      const weeklyDrawId = info.weeklyDrawId;
      
      // Users buy tickets
      const ticketPrice = ethers.utils.parseEther("0.25");
      await coreFacet.connect(user1).buyTickets(weeklyDrawId, 10, { value: ticketPrice.mul(10) });
      await coreFacet.connect(user2).buyTickets(weeklyDrawId, 10, { value: ticketPrice.mul(10) });
      
      // Time travel to end of week
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Execute weekly draw
      await platformDrawsFacet.executeWeeklyDraw();
      
      // Check monthly pool increased (20% of total)
      const newInfo = await platformDrawsFacet.getPlatformDrawsInfo();
      const totalPool = ticketPrice.mul(20);
      const expectedMonthlyContribution = totalPool.mul(2000).div(10000); // 20%
      expect(newInfo.monthlyPoolBalance).to.equal(expectedMonthlyContribution);
      
      // New weekly draw should be created
      expect(newInfo.weeklyDrawId).to.be.gt(weeklyDrawId);
      expect(newInfo.weeklyCount).to.equal(1);
    });
  });

  describe("Monthly Draw Execution", function () {
    beforeEach(async function () {
      await platformDrawsFacet.connect(owner).initializePlatformDraws();
    });

    it("Should execute monthly draw and create new one", async function () {
      const initialInfo = await platformDrawsFacet.getPlatformDrawsInfo();
      const initialMonthlyId = initialInfo.monthlyDrawId;
      
      // Award some monthly tickets
      await coreFacet.connect(user1).createLYXDraw(
        ethers.utils.parseEther("0.1"),
        100,
        3600,
        2,
        500
      );
      
      // Time travel to end of month
      await ethers.provider.send("evm_increaseTime", [28 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Execute monthly draw
      await platformDrawsFacet.executeMonthlyDraw();
      
      // Check new monthly draw created
      const newInfo = await platformDrawsFacet.getPlatformDrawsInfo();
      expect(newInfo.monthlyDrawId).to.be.gt(initialMonthlyId);
      expect(newInfo.monthlyDrawId).to.not.equal(0);
      
      // Check end time is 28 days from now
      const currentTime = Math.floor(Date.now() / 1000);
      expect(newInfo.monthlyEndTime).to.be.closeTo(currentTime + 28 * 24 * 60 * 60, 60);
      
      // Monthly pool should be reset to 0
      expect(newInfo.monthlyPoolBalance).to.equal(0);
    });
  });

  describe("Continuous Operation", function () {
    it("Should always have 2 active draws", async function () {
      await platformDrawsFacet.connect(owner).initializePlatformDraws();
      
      // Initial state
      let info = await platformDrawsFacet.getPlatformDrawsInfo();
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
      
      // Execute weekly draw
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Buy ticket to have participants
      await coreFacet.connect(user1).buyTickets(info.weeklyDrawId, 1, { 
        value: ethers.utils.parseEther("0.25") 
      });
      
      await platformDrawsFacet.executeWeeklyDraw();
      
      // Still 2 active draws
      info = await platformDrawsFacet.getPlatformDrawsInfo();
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
      
      // Execute monthly draw
      await ethers.provider.send("evm_increaseTime", [28 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Create a draw to get monthly tickets
      await coreFacet.connect(user1).createLYXDraw(
        ethers.utils.parseEther("0.1"),
        100,
        3600,
        2,
        500
      );
      
      await platformDrawsFacet.executeMonthlyDraw();
      
      // Still 2 active draws
      info = await platformDrawsFacet.getPlatformDrawsInfo();
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
    });
  });
});