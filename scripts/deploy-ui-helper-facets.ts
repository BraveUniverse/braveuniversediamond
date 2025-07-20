import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Diamond addresses
const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Deploying UI Helper Facets...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "LYX");
    
    // Deploy GridottoUIHelperFacet
    console.log("\n1. Deploying GridottoUIHelperFacet...");
    const UIHelperFacet = await ethers.getContractFactory("GridottoUIHelperFacet");
    const uiHelperFacet = await UIHelperFacet.deploy();
    await uiHelperFacet.waitForDeployment();
    const uiHelperAddress = await uiHelperFacet.getAddress();
    console.log("GridottoUIHelperFacet deployed to:", uiHelperAddress);
    
    // Deploy GridottoBatchFacet
    console.log("\n2. Deploying GridottoBatchFacet...");
    const BatchFacet = await ethers.getContractFactory("GridottoBatchFacet");
    const batchFacet = await BatchFacet.deploy();
    await batchFacet.waitForDeployment();
    const batchAddress = await batchFacet.getAddress();
    console.log("GridottoBatchFacet deployed to:", batchAddress);
    
    // Get function selectors
    console.log("\n3. Getting function selectors...");
    
    // Get actual function selectors from contract
    const uiHelperContract = await ethers.getContractAt("GridottoUIHelperFacet", uiHelperAddress);
    const uiHelperInterface = uiHelperContract.interface;
    
    const uiHelperSelectors = [
        uiHelperInterface.getFunction("getUserCreatedDraws").selector,
        uiHelperInterface.getFunction("getActiveUserDraws").selector,
        uiHelperInterface.getFunction("getAllClaimablePrizes").selector,
        uiHelperInterface.getFunction("getUserDrawStats").selector,
        uiHelperInterface.getFunction("getOfficialDrawInfo").selector
    ];
    
    // Get batch facet selectors
    const batchContract = await ethers.getContractAt("GridottoBatchFacet", batchAddress);
    const batchInterface = batchContract.interface;
    
    const batchSelectors = [
        batchInterface.getFunction("claimAll").selector,
        batchInterface.getFunction("batchTransferLYX").selector,
        batchInterface.getFunction("batchGetUserDrawInfo").selector
    ];
    
    // Prepare diamond cut
    console.log("\n4. Preparing diamond cut...");
    const diamondCut = [
        {
            facetAddress: uiHelperAddress,
            action: 0, // Add
            functionSelectors: uiHelperSelectors
        },
        {
            facetAddress: batchAddress,
            action: 0, // Add
            functionSelectors: batchSelectors
        }
    ];
    
    // Get DiamondCutFacet
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    console.log("\n5. Executing diamond cut...");
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    console.log("Diamond cut tx:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Diamond cut completed! Gas used:", receipt.gasUsed.toString());
    
    // Save deployment info
    const deploymentInfo = {
        network: "lukso-testnet",
        deploymentDate: new Date().toISOString(),
        contracts: {
            GridottoUIHelperFacet: uiHelperAddress,
            GridottoBatchFacet: batchAddress
        },
        functionSelectors: {
            uiHelper: uiHelperSelectors,
            batch: batchSelectors
        },
        diamondCutTx: tx.hash
    };
    
    const deploymentPath = path.join(__dirname, "../deployments/ui-helper-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", deploymentPath);
    
    // Verify facets were added
    console.log("\n6. Verifying facets...");
    const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    
    const facets = await loupeFacet.facets();
    console.log("Total facets:", facets.length);
    
    const uiHelperFacetInfo = facets.find((f: any) => f.facetAddress === uiHelperAddress);
    const batchFacetInfo = facets.find((f: any) => f.facetAddress === batchAddress);
    
    if (uiHelperFacetInfo) {
        console.log("✅ UIHelperFacet added successfully with", uiHelperFacetInfo.functionSelectors.length, "functions");
    } else {
        console.log("❌ UIHelperFacet not found!");
    }
    
    if (batchFacetInfo) {
        console.log("✅ BatchFacet added successfully with", batchFacetInfo.functionSelectors.length, "functions");
    } else {
        console.log("❌ BatchFacet not found!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });