import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
const OLD_UI_HELPER_ADDRESS = "0xc874cD999d7f0E0dD2770a3597d16707a8517f2a";

async function main() {
    console.log("Updating UI Helper Facet with new functions...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Deploy new GridottoUIHelperFacet
    console.log("\n1. Deploying new GridottoUIHelperFacet...");
    const UIHelperFacet = await ethers.getContractFactory("GridottoUIHelperFacet");
    const newUIHelper = await UIHelperFacet.deploy();
    await newUIHelper.waitForDeployment();
    const newUIHelperAddress = await newUIHelper.getAddress();
    console.log("New GridottoUIHelperFacet deployed to:", newUIHelperAddress);
    
    // Get all function selectors
    console.log("\n2. Getting function selectors...");
    const uiHelperInterface = newUIHelper.interface;
    
    const oldSelectors = [
        uiHelperInterface.getFunction("getUserCreatedDraws").selector,
        uiHelperInterface.getFunction("getActiveUserDraws").selector,
        uiHelperInterface.getFunction("getAllClaimablePrizes").selector,
        uiHelperInterface.getFunction("getUserDrawStats").selector,
        uiHelperInterface.getFunction("getOfficialDrawInfo").selector
    ];
    
    const newSelectors = [
        uiHelperInterface.getFunction("getUserDrawExecutorReward").selector,
        uiHelperInterface.getFunction("getDrawParticipants").selector,
        uiHelperInterface.getFunction("canUserParticipate").selector,
        uiHelperInterface.getFunction("getUserParticipationHistory").selector
    ];
    
    console.log("Old selectors to replace:", oldSelectors.length);
    console.log("New selectors to add:", newSelectors.length);
    
    // Prepare diamond cut
    console.log("\n3. Preparing diamond cut...");
    const diamondCut = [
        {
            facetAddress: ethers.ZeroAddress,
            action: 2, // Remove
            functionSelectors: oldSelectors
        },
        {
            facetAddress: newUIHelperAddress,
            action: 0, // Add
            functionSelectors: [...oldSelectors, ...newSelectors]
        }
    ];
    
    // Execute diamond cut
    const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
    
    console.log("\n4. Executing diamond cut...");
    const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
    console.log("Diamond cut tx:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Diamond cut completed! Gas used:", receipt.gasUsed.toString());
    
    // Save updated info
    const updateInfo = {
        network: "lukso-testnet",
        updateDate: new Date().toISOString(),
        oldFacet: OLD_UI_HELPER_ADDRESS,
        newFacet: newUIHelperAddress,
        newFunctions: [
            "getUserDrawExecutorReward(uint256)",
            "getDrawParticipants(uint256,uint256,uint256)",
            "canUserParticipate(uint256,address)",
            "getUserParticipationHistory(address,uint256,uint256)"
        ],
        diamondCutTx: tx.hash
    };
    
    const updatePath = path.join(__dirname, "../deployments/ui-helper-update.json");
    fs.writeFileSync(updatePath, JSON.stringify(updateInfo, null, 2));
    console.log("\nUpdate info saved to:", updatePath);
    
    // Verify update
    console.log("\n5. Verifying update...");
    const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
    const facets = await loupeFacet.facets();
    
    const updatedFacet = facets.find((f: any) => f.facetAddress === newUIHelperAddress);
    if (updatedFacet) {
        console.log("✅ UIHelperFacet updated successfully with", updatedFacet.functionSelectors.length, "functions");
    } else {
        console.log("❌ Update failed!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });