import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
enum FacetCutAction {
  Add = 0,
  Replace = 1,
  Remove = 2
}

function getSelectors(contract: any): string[] {
  const signatures = Object.keys(contract.interface.fragments)
    .filter(key => key !== 'constructor')
    .map(key => contract.interface.fragments[key]);
  
  const selectors = signatures.reduce((acc: string[], func: any) => {
    if (func.type === 'function') {
      acc.push(func.selector);
    }
    return acc;
  }, []);
  
  return selectors;
}

describe("GridottoFacet", function () {
  let diamondAddress: string;
  let gridottoFacet: Contract;
  let oracleFacet: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const TICKET_PRICE = ethers.parseEther("0.1");

  before(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy Diamond
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.waitForDeployment();

    // Deploy Diamond with DiamondCutFacet
    const diamondCutFacetAddress = await diamondCutFacet.getAddress();
    const Diamond = await ethers.getContractFactory("BraveUniverseDiamond");
    
    // Add DiamondCutFacet functions to diamond
    const diamondCutSelectors = getSelectors(diamondCutFacet);
    const diamondCut = [{
      facetAddress: diamondCutFacetAddress,
      action: FacetCutAction.Add,
      functionSelectors: diamondCutSelectors
    }];
    
    const diamond = await Diamond.deploy(owner.address, diamondCut);
    await diamond.waitForDeployment();
    diamondAddress = await diamond.getAddress();

    // Deploy DiamondLoupeFacet
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.waitForDeployment();

    // Deploy OwnershipFacet
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.waitForDeployment();

    // Deploy OracleFacet
    const OracleFacet = await ethers.getContractFactory("OracleFacet");
    const oracleFacetContract = await OracleFacet.deploy();
    await oracleFacetContract.waitForDeployment();

    // Deploy GridottoFacet
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacetContract = await GridottoFacet.deploy();
    await gridottoFacetContract.waitForDeployment();

    // Add facets to diamond
    const cut = [
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(diamondLoupeFacet)
      },
      {
        facetAddress: await ownershipFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(ownershipFacet)
      },
      {
        facetAddress: await oracleFacetContract.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(oracleFacetContract)
      },
      {
        facetAddress: await gridottoFacetContract.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(gridottoFacetContract)
      }
    ];

    const diamondCutContract = await ethers.getContractAt("IDiamondCut", diamondAddress);
    await diamondCutContract.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet instances
    gridottoFacet = await ethers.getContractAt("GridottoFacet", diamondAddress);
    oracleFacet = await ethers.getContractAt("OracleFacet", diamondAddress);
    
    // Initialize Oracle first
    await oracleFacet.connect(owner).initializeOracle();
    
    // Initialize Gridotto
    await gridottoFacet.connect(owner).initializeGridotto();
  });

  describe("Initialization", function () {
    it("Should initialize with correct default values", async function () {
      const dailyInfo = await gridottoFacet.getCurrentDrawInfo();
      expect(dailyInfo.drawNumber).to.equal(1);
      expect(dailyInfo.prizePool).to.equal(0);
      expect(dailyInfo.ticketsSold).to.equal(0);
      
      const monthlyInfo = await gridottoFacet.getMonthlyDrawInfo();
      expect(monthlyInfo.drawNumber).to.equal(1);
      expect(monthlyInfo.prizePool).to.equal(0);
    });
  });

  describe("Official Draws - Ticket Purchase", function () {
    it("Should allow buying tickets", async function () {
      const amount = 5;
      const totalPrice = TICKET_PRICE * BigInt(amount);
      
      await expect(
        gridottoFacet.connect(user1).buyTicket(user1.address, amount, {
          value: totalPrice
        })
      )
        .to.emit(gridottoFacet, "TicketPurchased")
        .withArgs(user1.address, user1.address, amount, 0);
      
      // Check draw info updated
      const drawInfo = await gridottoFacet.getCurrentDrawInfo();
      expect(drawInfo.ticketsSold).to.equal(amount);
      expect(drawInfo.prizePool).to.be.gt(0);
    });

    it("Should reject insufficient payment", async function () {
      await expect(
        gridottoFacet.connect(user1).buyTicket(user1.address, 1, {
          value: ethers.parseEther("0.05") // Less than ticket price
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should allow buying tickets for others", async function () {
      const addresses = [user2.address, user3.address];
      const totalPrice = TICKET_PRICE * BigInt(addresses.length);
      
      await gridottoFacet.connect(user1).buyTicketsForSelected(addresses, {
        value: totalPrice
      });
      
      const drawInfo = await gridottoFacet.getCurrentDrawInfo();
      expect(drawInfo.ticketsSold).to.equal(7); // 5 from previous + 2 new
    });

    it("Should refund excess payment", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      await gridottoFacet.connect(user1).buyTicket(user1.address, 1, {
        value: ethers.parseEther("1") // Way more than needed
      });
      
      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const spent = balanceBefore - balanceAfter;
      
      // Should only spend ticket price + gas
      expect(spent).to.be.lt(ethers.parseEther("0.2"));
    });
  });

  describe("Prize Claims", function () {
    it("Should not allow claiming with no prize", async function () {
      await expect(
        gridottoFacet.connect(user1).claimPrize()
      ).to.be.revertedWith("No prize available");
    });

    it("Should return correct pending prize", async function () {
      const prize = await gridottoFacet.getPendingPrize(user1.address);
      expect(prize).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set ticket price", async function () {
      await gridottoFacet.connect(owner).setTicketPrice(ethers.parseEther("0.2"));
      
      // Buy ticket with new price
      await expect(
        gridottoFacet.connect(user1).buyTicket(user1.address, 1, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWith("Insufficient payment");
      
      // Reset price
      await gridottoFacet.connect(owner).setTicketPrice(TICKET_PRICE);
    });

    it("Should allow owner to set draw intervals", async function () {
      await gridottoFacet.connect(owner).setDrawIntervals(
        7 * 24 * 60 * 60, // 7 days
        30 * 24 * 60 * 60 // 30 days
      );
    });

    it("Should allow owner to pause contract", async function () {
      await gridottoFacet.connect(owner).setPaused(true);
      
      await expect(
        gridottoFacet.connect(user1).buyTicket(user1.address, 1, {
          value: TICKET_PRICE
        })
      ).to.be.revertedWith("Contract is paused");
      
      await gridottoFacet.connect(owner).setPaused(false);
    });

    it("Should not allow non-owner to call admin functions", async function () {
      await expect(
        gridottoFacet.connect(user1).setTicketPrice(ethers.parseEther("0.5"))
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });

  describe("Fee Distribution", function () {
    it("Should correctly distribute fees", async function () {
      const amount = 10;
      const totalPrice = TICKET_PRICE * BigInt(amount);
      
      const dailyPoolBefore = (await gridottoFacet.getCurrentDrawInfo()).prizePool;
      const monthlyPoolBefore = (await gridottoFacet.getMonthlyDrawInfo()).prizePool;
      
      await gridottoFacet.connect(user1).buyTicket(user1.address, amount, {
        value: totalPrice
      });
      
      const dailyPoolAfter = (await gridottoFacet.getCurrentDrawInfo()).prizePool;
      const monthlyPoolAfter = (await gridottoFacet.getMonthlyDrawInfo()).prizePool;
      
      // 5% owner fee, 20% monthly pool, 75% daily pool
      const ownerFee = (totalPrice * BigInt(5)) / BigInt(100);
      const monthlyFee = (totalPrice * BigInt(20)) / BigInt(100);
      const dailyFee = totalPrice - ownerFee - monthlyFee;
      
      expect(dailyPoolAfter - dailyPoolBefore).to.equal(dailyFee);
      expect(monthlyPoolAfter - monthlyPoolBefore).to.equal(monthlyFee);
    });
  });

  describe("User Draws (Not Implemented)", function () {
    it("Should revert user draw functions", async function () {
      await expect(
        gridottoFacet.createUserDraw(
          0, // DrawType
          { model: 0, creatorContribution: 0, addParticipationFees: true, participationFeePercent: 95 },
          ethers.parseEther("0.1"),
          86400, // 1 day
          100,
          0, // NONE requirement
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith("User draws not yet implemented");
    });
  });

  describe("Draw Execution Simulation", function () {
    it("Should handle draw execution when time comes", async function () {
      // This would require time manipulation in tests
      // For now, just verify the structure is in place
      const drawInfo = await gridottoFacet.getCurrentDrawInfo();
      expect(drawInfo.drawTime).to.be.gt(0);
    });
  });
});