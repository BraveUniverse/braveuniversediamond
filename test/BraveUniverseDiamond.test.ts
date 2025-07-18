import { expect } from "chai";
import { ethers } from "hardhat";
import { BraveUniverseDiamond, DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BraveUniverse Diamond", function () {
  let diamond: BraveUniverseDiamond;
  let diamondCutFacet: DiamondCutFacet;
  let diamondLoupeFacet: DiamondLoupeFacet;
  let ownershipFacet: OwnershipFacet;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let diamondAddress: string;

  before(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy facets
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.waitForDeployment();

    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.waitForDeployment();

    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.waitForDeployment();

    // Get function selectors manually
    const diamondCutSelectors = ["0x1f931c1c"]; // diamondCut(FacetCut[],address,bytes)
    const diamondLoupeSelectors = [
      "0x7a0ed627", // facets()
      "0xadfca15e", // facetFunctionSelectors(address)
      "0x52ef6b2c", // facetAddresses()
      "0xcdffacc6", // facetAddress(bytes4)
      "0x01ffc9a7"  // supportsInterface(bytes4)
    ];
    const ownershipSelectors = [
      "0x8da5cb5b", // owner()
      "0xf2fde38b"  // transferOwnership(address)
    ];

    // Prepare diamond cut
    const diamondCut = [
      {
        facetAddress: await diamondCutFacet.getAddress(),
        action: 0, // Add
        functionSelectors: diamondCutSelectors
      },
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: 0, // Add
        functionSelectors: diamondLoupeSelectors
      },
      {
        facetAddress: await ownershipFacet.getAddress(),
        action: 0, // Add
        functionSelectors: ownershipSelectors
      }
    ];

    // Deploy diamond
    const BraveUniverseDiamond = await ethers.getContractFactory("BraveUniverseDiamond");
    diamond = await BraveUniverseDiamond.deploy(owner.address, diamondCut);
    await diamond.waitForDeployment();
    diamondAddress = await diamond.getAddress();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(diamondAddress).to.be.properAddress;
    });

    it("Should have correct owner", async function () {
      const ownershipContract = await ethers.getContractAt("OwnershipFacet", diamondAddress);
      expect(await ownershipContract.owner()).to.equal(owner.address);
    });

    it("Should have correct number of facets", async function () {
      const loupeContract = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
      const facets = await loupeContract.facets();
      expect(facets.length).to.equal(3);
    });
  });

  describe("Diamond Loupe Functions", function () {
    let loupeContract: DiamondLoupeFacet;

    before(async function () {
      loupeContract = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    });

    it("Should return all facets", async function () {
      const facets = await loupeContract.facets();
      expect(facets.length).to.equal(3);
      
      const facetAddresses = facets.map((f: any) => f.facetAddress);
      expect(facetAddresses).to.include(await diamondCutFacet.getAddress());
      expect(facetAddresses).to.include(await diamondLoupeFacet.getAddress());
      expect(facetAddresses).to.include(await ownershipFacet.getAddress());
    });

    it("Should return facet addresses", async function () {
      const addresses = await loupeContract.facetAddresses();
      expect(addresses.length).to.equal(3);
    });

    it("Should return function selectors for each facet", async function () {
      const diamondCutAddress = await diamondCutFacet.getAddress();
      const selectors = await loupeContract.facetFunctionSelectors(diamondCutAddress);
      expect(selectors.length).to.be.greaterThan(0);
    });

    it("Should return correct facet for function selector", async function () {
      const diamondCutSelector = diamondCutFacet.interface.getFunction("diamondCut")!.selector;
      const facetAddress = await loupeContract.facetAddress(diamondCutSelector);
      expect(facetAddress).to.equal(await diamondCutFacet.getAddress());
    });
  });

  describe("Ownership Functions", function () {
    let ownershipContract: OwnershipFacet;

    before(async function () {
      ownershipContract = await ethers.getContractAt("OwnershipFacet", diamondAddress);
    });

    it("Should return correct owner", async function () {
      expect(await ownershipContract.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      await expect(ownershipContract.connect(owner).transferOwnership(user1.address))
        .to.emit(ownershipContract, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);
      
      expect(await ownershipContract.owner()).to.equal(user1.address);
      
      // Transfer back to original owner
      await ownershipContract.connect(user1).transferOwnership(owner.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      await expect(
        ownershipContract.connect(user2).transferOwnership(user2.address)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });

  describe("Access Control", function () {
    let diamondCutContract: DiamondCutFacet;

    before(async function () {
      diamondCutContract = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    });

    it("Should reject diamondCut from non-owner", async function () {
      await expect(
        diamondCutContract.connect(user1).diamondCut([], ethers.ZeroAddress, "0x")
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("Should allow diamondCut from owner", async function () {
      // Empty cut should work without errors
      await expect(
        diamondCutContract.connect(owner).diamondCut([], ethers.ZeroAddress, "0x")
      ).to.not.be.reverted;
    });
  });

  describe("ERC165 Support", function () {
    let loupeContract: DiamondLoupeFacet;

    before(async function () {
      loupeContract = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    });

    it("Should support ERC165", async function () {
      expect(await loupeContract.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
    });

    it("Should support IDiamondCut", async function () {
      expect(await loupeContract.supportsInterface("0x1f931c1c")).to.be.true; // IDiamondCut
    });

    it("Should support IDiamondLoupe", async function () {
      expect(await loupeContract.supportsInterface("0x48e2b093")).to.be.true; // IDiamondLoupe
    });

    it("Should support IERC173", async function () {
      expect(await loupeContract.supportsInterface("0x7f5828d0")).to.be.true; // IERC173
    });
  });
}); 