import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";

async function main() {
    console.log("Deploying BraveUniverseDiamond to LUKSO Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy DiamondCutFacet
    console.log("\nDeploying DiamondCutFacet...");
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.waitForDeployment();
    console.log("DiamondCutFacet deployed to:", await diamondCutFacet.getAddress());
    
    // Deploy Diamond with DiamondCutFacet
    console.log("\nDeploying BraveUniverseDiamond...");
    const Diamond = await ethers.getContractFactory("BraveUniverseDiamond");
    
    // Add DiamondCutFacet as initial facet
    const diamondCutFacetSelectors = getSelectors(diamondCutFacet).selectors;
    const diamondCut = [{
        facetAddress: await diamondCutFacet.getAddress(),
        action: FacetCutAction.Add,
        functionSelectors: diamondCutFacetSelectors
    }];
    
    const diamond = await Diamond.deploy(deployer.address, diamondCut);
    await diamond.waitForDeployment();
    const diamondAddress = await diamond.getAddress();
    console.log("BraveUniverseDiamond deployed to:", diamondAddress);
    
    // Deploy facets
    console.log("\nDeploying facets...");
    
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.waitForDeployment();
    console.log("DiamondLoupeFacet deployed to:", await diamondLoupeFacet.getAddress());
    
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const ownershipFacet = await OwnershipFacet.deploy();
    await ownershipFacet.waitForDeployment();
    console.log("OwnershipFacet deployed to:", await ownershipFacet.getAddress());
    
    const OracleFacet = await ethers.getContractFactory("OracleFacet");
    const oracleFacet = await OracleFacet.deploy();
    await oracleFacet.waitForDeployment();
    console.log("OracleFacet deployed to:", await oracleFacet.getAddress());
    
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    console.log("GridottoFacet deployed to:", await gridottoFacet.getAddress());
    
    // Prepare diamond cut
    const cut = [
        {
            facetAddress: await diamondLoupeFacet.getAddress(),
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(diamondLoupeFacet).selectors
        },
        {
            facetAddress: await ownershipFacet.getAddress(),
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(ownershipFacet).selectors
        },
        {
            facetAddress: await oracleFacet.getAddress(),
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(oracleFacet).selectors
        },
        {
            facetAddress: await gridottoFacet.getAddress(),
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(gridottoFacet).selectors
        }
    ];
    
    // Execute diamond cut
    console.log("\nAdding facets to Diamond...");
    const diamondCutContract = await ethers.getContractAt("IDiamondCut", diamondAddress);
    const tx = await diamondCutContract.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("Facets added to Diamond!");
    
    // Initialize facets
    console.log("\nInitializing facets...");
    
    const oracle = await ethers.getContractAt("OracleFacet", diamondAddress);
    const initOracleTx = await oracle.initializeOracle();
    await initOracleTx.wait();
    console.log("OracleFacet initialized!");
    
    const gridotto = await ethers.getContractAt("GridottoFacet", diamondAddress);
    const initGridottoTx = await gridotto.initializeGridotto();
    await initGridottoTx.wait();
    console.log("GridottoFacet initialized!");
    
    // Display deployment info
    console.log("\n=== Deployment Complete ===");
    console.log("Diamond Address:", diamondAddress);
    console.log("\nFacet Addresses:");
    console.log("- DiamondCutFacet:", await diamondCutFacet.getAddress());
    console.log("- DiamondLoupeFacet:", await diamondLoupeFacet.getAddress());
    console.log("- OwnershipFacet:", await ownershipFacet.getAddress());
    console.log("- OracleFacet:", await oracleFacet.getAddress());
    console.log("- GridottoFacet:", await gridottoFacet.getAddress());
    
    // Save deployment info
    console.log("\n=== Save this information ===");
    console.log(`export const DIAMOND_ADDRESS = "${diamondAddress}";`);
    console.log(`export const GRIDOTTO_FACET = "${await gridottoFacet.getAddress()}";`);
    console.log(`export const ORACLE_FACET = "${await oracleFacet.getAddress()}";`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });