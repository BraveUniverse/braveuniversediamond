import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("GridottoFacet", function () {
  let diamond: Contract;
  let gridottoFacet: Contract;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  const TICKET_PRICE = ethers.parseEther("0.01"); // 0.01 LYX
  const MONTHLY_PRIZE = ethers.parseEther("1.0"); // 1 LYX

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy core facets first
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.waitForDeployment();

    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.waitForDeployment();

    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.waitForDeployment();

    // Deploy GridottoFacet
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();

    // Get function selectors using Hardhat interface
    const diamondCutSelectors = ["0x1f931c1c"]; // diamondCut
    const diamondLoupeSelectors = ["0x7a0ed627", "0xadfca15e", "0x52ef6b2c", "0xcdffacc6", "0x01ffc9a7"];
    const ownershipSelectors = ["0x8da5cb5b", "0xf2fde38b"]; // owner, transferOwnership

    const GridottoContract = await ethers.getContractFactory("GridottoFacet");
    const gridottoInterface = GridottoContract.interface;
    
    const gridottoSelectors = [
      gridottoInterface.getFunction("initializeGridotto")?.selector,
      gridottoInterface.getFunction("getDrawInfo")?.selector,
      gridottoInterface.getFunction("getCurrentDrawPrize")?.selector,
      gridottoInterface.getFunction("getMonthlyPrize")?.selector,
      gridottoInterface.getFunction("getTicketPrice")?.selector,
      gridottoInterface.getFunction("getActiveUserDraws")?.selector,
      gridottoInterface.getFunction("getOfficialDrawInfo")?.selector,
      gridottoInterface.getFunction("purchaseTickets")?.selector,
      gridottoInterface.getFunction("finalizeDraw")?.selector,
      gridottoInterface.getFunction("updateMonthlyPrize")?.selector,
      gridottoInterface.getFunction("updateTicketPrice")?.selector,
      gridottoInterface.getFunction("getTotalRevenue")?.selector,
      gridottoInterface.getFunction("getCurrentDrawId")?.selector,
      gridottoInterface.getFunction("withdrawBalance")?.selector,
    ].filter(Boolean);

    // Prepare diamond cut
    const cut = [
      {
        facetAddress: await diamondCutFacet.getAddress(),
        action: 0, // Add
        functionSelectors: diamondCutSelectors,
      },
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: 0, // Add
        functionSelectors: diamondLoupeSelectors,
      },
      {
        facetAddress: await ownershipFacet.getAddress(),
        action: 0, // Add
        functionSelectors: ownershipSelectors,
      },
      {
        facetAddress: await gridottoFacet.getAddress(),
        action: 0, // Add
        functionSelectors: gridottoSelectors,
      },
    ];

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("BraveUniverseDiamond");
    diamond = await Diamond.deploy(owner.address, cut);
    await diamond.waitForDeployment();

    // Attach GridottoFacet interface to diamond
    gridottoFacet = GridottoContract.attach(await diamond.getAddress());
  });

  describe("Initialization", function () {
    it("Should initialize Gridotto system correctly", async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);

      const ticketPrice = await gridottoFacet.getTicketPrice();
      const monthlyPrize = await gridottoFacet.getMonthlyPrize();
      const currentDrawId = await gridottoFacet.getCurrentDrawId();

      expect(ticketPrice).to.equal(TICKET_PRICE);
      expect(monthlyPrize).to.equal(MONTHLY_PRIZE);
      expect(currentDrawId).to.equal(1);
    });

    it("Should only allow owner to initialize", async function () {
      await expect(
        gridottoFacet.connect(user1).initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE)
      ).to.be.revertedWithCustomError(gridottoFacet, "NotAuthorized");
    });

    it("Should create first draw upon initialization", async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);

      const drawInfo = await gridottoFacet.getDrawInfo();
      expect(drawInfo.drawId).to.equal(1);
      expect(drawInfo.isActive).to.be.true;
      expect(drawInfo.totalPrize).to.equal(MONTHLY_PRIZE);
      expect(drawInfo.participantCount).to.equal(0);
    });
  });

  describe("Draw Information Queries", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should return correct draw info", async function () {
      const drawInfo = await gridottoFacet.getDrawInfo();
      expect(drawInfo.drawId).to.equal(1);
      expect(drawInfo.isActive).to.be.true;
      expect(drawInfo.totalPrize).to.equal(MONTHLY_PRIZE);
    });

    it("Should return correct current draw prize", async function () {
      const prize = await gridottoFacet.getCurrentDrawPrize();
      expect(prize).to.equal(MONTHLY_PRIZE);
    });

    it("Should return correct monthly prize", async function () {
      const monthlyPrize = await gridottoFacet.getMonthlyPrize();
      expect(monthlyPrize).to.equal(MONTHLY_PRIZE);
    });

    it("Should return correct ticket price", async function () {
      const ticketPrice = await gridottoFacet.getTicketPrice();
      expect(ticketPrice).to.equal(TICKET_PRICE);
    });

    it("Should return official draw info by ID", async function () {
      const drawInfo = await gridottoFacet.getOfficialDrawInfo(1);
      expect(drawInfo.drawId).to.equal(1);
      expect(drawInfo.isActive).to.be.true;
    });

    it("Should revert for invalid draw ID", async function () {
      await expect(
        gridottoFacet.getOfficialDrawInfo(999)
      ).to.be.revertedWithCustomError(gridottoFacet, "DrawNotFound");
    });
  });

  describe("Ticket Purchase - Multi-User Testing", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should allow users to purchase tickets", async function () {
      const ticketCount = 3;
      const cost = TICKET_PRICE * BigInt(ticketCount);

      await expect(
        gridottoFacet.connect(user1).purchaseTickets(ticketCount, { value: cost })
      ).to.emit(gridottoFacet, "TicketPurchased")
        .withArgs(user1.address, 1, ticketCount);

      const activeDraws = await gridottoFacet.getActiveUserDraws(user1.address);
      expect(activeDraws.length).to.equal(1);
      expect(activeDraws[0].ticketCount).to.equal(ticketCount);
      expect(activeDraws[0].drawId).to.equal(1);
    });

    it("Should handle multiple users purchasing tickets", async function () {
      const user1Tickets = 2;
      const user2Tickets = 5;
      const user3Tickets = 1;

      // User1 buys tickets
      await gridottoFacet.connect(user1).purchaseTickets(user1Tickets, {
        value: TICKET_PRICE * BigInt(user1Tickets),
      });

      // User2 buys tickets
      await gridottoFacet.connect(user2).purchaseTickets(user2Tickets, {
        value: TICKET_PRICE * BigInt(user2Tickets),
      });

      // User3 buys tickets
      await gridottoFacet.connect(user3).purchaseTickets(user3Tickets, {
        value: TICKET_PRICE * BigInt(user3Tickets),
      });

      // Check draw info
      const drawInfo = await gridottoFacet.getDrawInfo();
      expect(drawInfo.participantCount).to.equal(3);

      // Check individual user draws
      const user1Draws = await gridottoFacet.getActiveUserDraws(user1.address);
      const user2Draws = await gridottoFacet.getActiveUserDraws(user2.address);
      const user3Draws = await gridottoFacet.getActiveUserDraws(user3.address);

      expect(user1Draws[0].ticketCount).to.equal(user1Tickets);
      expect(user2Draws[0].ticketCount).to.equal(user2Tickets);
      expect(user3Draws[0].ticketCount).to.equal(user3Tickets);
    });

    it("Should refund excess payment", async function () {
      const ticketCount = 1;
      const cost = TICKET_PRICE;
      const overpayment = ethers.parseEther("0.1");
      const totalSent = cost + overpayment;

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await gridottoFacet.connect(user1).purchaseTickets(ticketCount, {
        value: totalSent,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const actualCost = balanceBefore - balanceAfter;

      // Should only pay for tickets + gas, overpayment refunded
      expect(actualCost).to.be.closeTo(cost + gasUsed, ethers.parseEther("0.001"));
    });

    it("Should revert for insufficient payment", async function () {
      const ticketCount = 3;
      const insufficientPayment = TICKET_PRICE; // Only enough for 1 ticket

      await expect(
        gridottoFacet.connect(user1).purchaseTickets(ticketCount, {
          value: insufficientPayment,
        })
      ).to.be.revertedWithCustomError(gridottoFacet, "InsufficientPayment");
    });

    it("Should revert for zero tickets", async function () {
      await expect(
        gridottoFacet.connect(user1).purchaseTickets(0, { value: 0 })
      ).to.be.revertedWithCustomError(gridottoFacet, "InvalidTicketCount");
    });
  });

  describe("Access Control Testing", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should only allow owner to update monthly prize", async function () {
      const newPrize = ethers.parseEther("2.0");

      // Owner can update
      await expect(gridottoFacet.updateMonthlyPrize(newPrize))
        .to.emit(gridottoFacet, "PrizeUpdated")
        .withArgs(newPrize);

      // Non-owner cannot update
      await expect(
        gridottoFacet.connect(user1).updateMonthlyPrize(newPrize)
      ).to.be.revertedWithCustomError(gridottoFacet, "NotAuthorized");
    });

    it("Should only allow owner to update ticket price", async function () {
      const newPrice = ethers.parseEther("0.02");

      // Owner can update
      await gridottoFacet.updateTicketPrice(newPrice);
      expect(await gridottoFacet.getTicketPrice()).to.equal(newPrice);

      // Non-owner cannot update
      await expect(
        gridottoFacet.connect(user1).updateTicketPrice(newPrice)
      ).to.be.revertedWithCustomError(gridottoFacet, "NotAuthorized");
    });

    it("Should only allow owner to finalize draw", async function () {
      // Non-owner cannot finalize
      await expect(
        gridottoFacet.connect(user1).finalizeDraw()
      ).to.be.revertedWithCustomError(gridottoFacet, "NotAuthorized");
    });

    it("Should only allow owner to withdraw balance", async function () {
      // Add some balance by purchasing tickets
      await gridottoFacet.connect(user1).purchaseTickets(1, { value: TICKET_PRICE });

      // Non-owner cannot withdraw
      await expect(
        gridottoFacet.connect(user1).withdrawBalance()
      ).to.be.revertedWithCustomError(gridottoFacet, "NotAuthorized");
    });
  });

  describe("Storage Correctness", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should maintain correct storage state after multiple operations", async function () {
      // Initial state
      let totalRevenue = await gridottoFacet.getTotalRevenue();
      expect(totalRevenue).to.equal(0);

      // User1 purchases tickets
      const user1Tickets = 3;
      const user1Cost = TICKET_PRICE * BigInt(user1Tickets);
      await gridottoFacet.connect(user1).purchaseTickets(user1Tickets, {
        value: user1Cost,
      });

      // Check revenue update
      totalRevenue = await gridottoFacet.getTotalRevenue();
      expect(totalRevenue).to.equal(user1Cost);

      // User2 purchases tickets
      const user2Tickets = 2;
      const user2Cost = TICKET_PRICE * BigInt(user2Tickets);
      await gridottoFacet.connect(user2).purchaseTickets(user2Tickets, {
        value: user2Cost,
      });

      // Check cumulative revenue
      totalRevenue = await gridottoFacet.getTotalRevenue();
      expect(totalRevenue).to.equal(user1Cost + user2Cost);

      // Check draw prize accumulation
      const currentPrize = await gridottoFacet.getCurrentDrawPrize();
      expect(currentPrize).to.equal(MONTHLY_PRIZE + user1Cost + user2Cost);
    });

    it("Should correctly track user draws across multiple purchases", async function () {
      // User makes first purchase
      await gridottoFacet.connect(user1).purchaseTickets(2, {
        value: TICKET_PRICE * 2n,
      });

      let activeDraws = await gridottoFacet.getActiveUserDraws(user1.address);
      expect(activeDraws.length).to.equal(1);

      // User makes second purchase in same draw
      await gridottoFacet.connect(user1).purchaseTickets(1, {
        value: TICKET_PRICE,
      });

      activeDraws = await gridottoFacet.getActiveUserDraws(user1.address);
      expect(activeDraws.length).to.equal(2); // Two separate purchases
    });
  });

  describe("Gas Usage Analysis", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should track gas usage for ticket purchase", async function () {
      const tx = await gridottoFacet.connect(user1).purchaseTickets(1, {
        value: TICKET_PRICE,
      });
      const receipt = await tx.wait();
      
      console.log(`Gas used for purchaseTickets: ${receipt!.gasUsed}`);
      expect(receipt!.gasUsed).to.be.lessThan(300000); // Should be reasonably efficient for storage operations
    });

    it("Should track gas usage for view functions", async function () {
      // View functions should be efficient
      const drawInfo = await gridottoFacet.getDrawInfo.staticCall();
      const prize = await gridottoFacet.getCurrentDrawPrize.staticCall();
      const ticketPrice = await gridottoFacet.getTicketPrice.staticCall();
      
      // These should not consume significant gas in actual calls
      expect(drawInfo.drawId).to.equal(1);
      expect(prize).to.equal(MONTHLY_PRIZE);
      expect(ticketPrice).to.equal(TICKET_PRICE);
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    beforeEach(async function () {
      await gridottoFacet.initializeGridotto(TICKET_PRICE, MONTHLY_PRIZE);
    });

    it("Should handle zero-value transactions correctly", async function () {
      await expect(
        gridottoFacet.connect(user1).purchaseTickets(1, { value: 0 })
      ).to.be.revertedWithCustomError(gridottoFacet, "InsufficientPayment");
    });

    it("Should handle large ticket purchases", async function () {
      const largeTicketCount = 1000;
      const cost = TICKET_PRICE * BigInt(largeTicketCount);

      await gridottoFacet.connect(user1).purchaseTickets(largeTicketCount, {
        value: cost,
      });

      const activeDraws = await gridottoFacet.getActiveUserDraws(user1.address);
      expect(activeDraws[0].ticketCount).to.equal(largeTicketCount);
    });

    it("Should return empty array for user with no draws", async function () {
      const activeDraws = await gridottoFacet.getActiveUserDraws(user1.address);
      expect(activeDraws.length).to.equal(0);
    });
  });
});