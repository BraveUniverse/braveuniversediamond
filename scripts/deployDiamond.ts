import { ethers } from "hardhat";

export async function deployDiamond() {
  const [deployer] = await ethers.getSigners();

  // Deploy facets
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();

  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();

  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();

  const OracleFacet = await ethers.getContractFactory("OracleFacet");
  const oracleFacet = await OracleFacet.deploy();
  await oracleFacet.waitForDeployment();

  // Get function selectors for ethers v6
  const getSelectors = (contract: any) => {
    const selectors: string[] = [];
    contract.interface.forEachFunction((func: any) => {
      if (func.name !== "init") {
        selectors.push(func.selector);
      }
    });
    return selectors;
  };

  // Prepare diamond cut
  const diamondCut = [
    {
      facetAddress: await diamondCutFacet.getAddress(),
      action: 0, // Add
      functionSelectors: getSelectors(diamondCutFacet)
    },
    {
      facetAddress: await diamondLoupeFacet.getAddress(),
      action: 0, // Add
      functionSelectors: getSelectors(diamondLoupeFacet)
    },
    {
      facetAddress: await ownershipFacet.getAddress(),
      action: 0, // Add
      functionSelectors: getSelectors(ownershipFacet)
    },
    {
      facetAddress: await oracleFacet.getAddress(),
      action: 0, // Add
      functionSelectors: getSelectors(oracleFacet)
    }
  ];

  // Deploy Diamond
  const BraveUniverseDiamond = await ethers.getContractFactory("BraveUniverseDiamond");
  const diamond = await BraveUniverseDiamond.deploy(deployer.address, diamondCut);
  await diamond.waitForDeployment();

  return await diamond.getAddress();
}