import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("GridottoPlatformDraws Update Test", function () {
  let platformDrawsFacet: Contract;
  let coreFacet: Contract;
  let executionFacet: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Use existing diamond address from deployment
  const DIAMOND_ADDRESS = "0xda142c5978D707E83618390F4f8796bD7eb3a790";

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Get facet instances from existing diamond
    platformDrawsFacet = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    executionFacet = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
  });

  describe("Platform Draws Initialization", function () {
    it("Should check if platform draws are already initialized", async function () {
      try {
        const info = await platformDrawsFacet.getPlatformDrawsInfo();
        console.log("Current Platform Draws Info:");
        console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
        console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
        console.log("- Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
        
        if (info.weeklyDrawId > 0 || info.monthlyDrawId > 0) {
          console.log("\n⚠️  Platform draws already initialized!");
          this.skip();
        }
      } catch (error) {
        console.log("Platform draws not yet initialized or facet not added");
      }
    });

    it("Should initialize both weekly and monthly draws", async function () {
      try {
        // Check if already initialized
        const infoBefore = await platformDrawsFacet.getPlatformDrawsInfo();
        if (infoBefore.weeklyDrawId > 0) {
          console.log("Already initialized, skipping...");
          this.skip();
        }
      } catch (error) {
        // Not initialized, continue
      }

      // Initialize platform draws
      const tx = await platformDrawsFacet.connect(owner).initializePlatformDraws();
      await tx.wait();
      
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      // Both draws should be active
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
      
      console.log("\n✅ Platform draws initialized successfully!");
      console.log("- Weekly Draw ID:", info.weeklyDrawId.toString());
      console.log("- Monthly Draw ID:", info.monthlyDrawId.toString());
      
      // Check end times
      const currentTime = Math.floor(Date.now() / 1000);
      expect(Number(info.weeklyEndTime)).to.be.closeTo(currentTime + 7 * 24 * 60 * 60, 300);
      expect(Number(info.monthlyEndTime)).to.be.closeTo(currentTime + 28 * 24 * 60 * 60, 300);
      
      // Initial monthly pool should be 0
      expect(info.monthlyPoolBalance).to.equal(0);
      expect(info.weeklyCount).to.equal(0);
    });
  });

  describe("Draw Details Verification", function () {
    it("Should verify weekly draw configuration", async function () {
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      if (info.weeklyDrawId == 0) {
        console.log("No weekly draw found, skipping...");
        this.skip();
      }
      
      const weeklyDraw = await coreFacet.getDrawDetails(info.weeklyDrawId);
      
      expect(weeklyDraw.drawType).to.equal(3); // PLATFORM_WEEKLY
      expect(weeklyDraw.ticketPrice).to.equal(ethers.parseEther("0.25"));
      expect(weeklyDraw.minParticipants).to.equal(0);
      expect(weeklyDraw.creator.toLowerCase()).to.equal(DIAMOND_ADDRESS.toLowerCase());
      
      console.log("\n✅ Weekly draw configuration verified");
    });

    it("Should verify monthly draw configuration", async function () {
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      if (info.monthlyDrawId == 0) {
        console.log("No monthly draw found, skipping...");
        this.skip();
      }
      
      const monthlyDraw = await coreFacet.getDrawDetails(info.monthlyDrawId);
      
      expect(monthlyDraw.drawType).to.equal(4); // PLATFORM_MONTHLY
      expect(monthlyDraw.ticketPrice).to.equal(0); // Free entry
      expect(monthlyDraw.minParticipants).to.equal(0);
      expect(monthlyDraw.creator.toLowerCase()).to.equal(DIAMOND_ADDRESS.toLowerCase());
      
      console.log("\n✅ Monthly draw configuration verified");
    });
  });

  describe("Weekly Draw Participation", function () {
    it("Should allow users to buy weekly draw tickets", async function () {
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      if (info.weeklyDrawId == 0) {
        console.log("No weekly draw found, skipping...");
        this.skip();
      }
      
      const ticketPrice = ethers.parseEther("0.25");
      const ticketCount = 2;
      
      // Buy tickets
      await coreFacet.connect(user1).buyTickets(
        info.weeklyDrawId, 
        ticketCount, 
        { value: ticketPrice * BigInt(ticketCount) }
      );
      
      // Verify tickets purchased
      const drawDetails = await coreFacet.getDrawDetails(info.weeklyDrawId);
      expect(drawDetails.ticketsSold).to.be.gte(ticketCount);
      
      console.log("\n✅ Weekly draw ticket purchase successful");
      console.log("- Tickets purchased:", ticketCount);
      console.log("- Total tickets sold:", drawDetails.ticketsSold.toString());
    });
  });

  describe("Monthly Ticket Awards", function () {
    it("Should award monthly tickets for draw creation", async function () {
      // Create a draw to get monthly tickets
      await coreFacet.connect(user2).createLYXDraw(
        ethers.parseEther("0.1"), // ticket price
        100, // max tickets
        3600, // 1 hour duration
        2, // min participants
        500 // 5% platform fee
      );
      
      const monthlyTickets = await platformDrawsFacet.getUserMonthlyTickets(user2.address);
      expect(monthlyTickets.fromCreating).to.equal(1);
      
      console.log("\n✅ Monthly tickets awarded for draw creation");
      console.log("- Tickets from creating:", monthlyTickets.fromCreating.toString());
      console.log("- Total monthly tickets:", monthlyTickets.total.toString());
    });
  });

  describe("Summary", function () {
    it("Should display final platform draws status", async function () {
      const info = await platformDrawsFacet.getPlatformDrawsInfo();
      
      console.log("\n📊 Final Platform Draws Status:");
      console.log("=====================================");
      console.log("Weekly Draw ID:", info.weeklyDrawId.toString());
      console.log("Monthly Draw ID:", info.monthlyDrawId.toString());
      console.log("Weekly End Time:", new Date(Number(info.weeklyEndTime) * 1000).toLocaleString());
      console.log("Monthly End Time:", new Date(Number(info.monthlyEndTime) * 1000).toLocaleString());
      console.log("Monthly Pool Balance:", ethers.formatEther(info.monthlyPoolBalance), "LYX");
      console.log("Weekly Draw Count:", info.weeklyCount.toString());
      console.log("=====================================");
      
      // Always have 2 active draws
      expect(info.weeklyDrawId).to.be.gt(0);
      expect(info.monthlyDrawId).to.be.gt(0);
    });
  });
});