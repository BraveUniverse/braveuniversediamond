import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Updating contracts with new changes...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.Diamond;
    
    // Deploy updated facets
    console.log("\n1. Deploying updated GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    console.log("GridottoFacet deployed to:", await gridottoFacet.getAddress());
    
    console.log("\n2. Deploying updated GridottoUIHelperFacet...");
    const GridottoUIHelperFacet = await ethers.getContractFactory("GridottoUIHelperFacet");
    const uiHelperFacet = await GridottoUIHelperFacet.deploy();
    await uiHelperFacet.waitForDeployment();
    console.log("GridottoUIHelperFacet deployed to:", await uiHelperFacet.getAddress());
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
    
    // Prepare diamond cut
    const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };
    
    // Get function selectors
    const getSelectors = (contract: any) => {
        const signatures = Object.keys(contract.interface.fragments)
            .filter(name => name !== 'constructor')
            .map(name => contract.interface.fragments[name])
            .filter((fragment: any) => fragment.type === 'function')
            .map((fragment: any) => contract.interface.getFunction(fragment.name).selector);
        return signatures;
    };
    
    const cuts = [
        {
            facetAddress: await gridottoFacet.getAddress(),
            action: FacetCutAction.Replace,
            functionSelectors: getSelectors(gridottoFacet)
        },
        {
            facetAddress: await uiHelperFacet.getAddress(),
            action: FacetCutAction.Replace,
            functionSelectors: getSelectors(uiHelperFacet)
        }
    ];
    
    console.log("\n3. Executing diamond cut...");
    const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("Diamond cut executed successfully!");
    
    // Update deployment addresses
    deploymentData.GridottoFacet = await gridottoFacet.getAddress();
    deploymentData.GridottoUIHelperFacet = await uiHelperFacet.getAddress();
    deploymentData.lastUpdate = new Date().toISOString();
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("\n✅ All updates completed successfully!");
    
    // Summary of changes
    console.log("\n📋 Summary of Changes:");
    console.log("- Weekly draws (not daily)");
    console.log("- Platform fee: 5%");
    console.log("- Executor fee: 5% (max 5 LYX for LYX draws)");
    console.log("- Creator fee: max 10%");
    console.log("- No draw creation fee");
    console.log("- Dynamic prize pools based on ticket sales");
    console.log("- Winner tracking for leaderboard");
    console.log("- getRecentWinners() function added");
    console.log("- getAdvancedDrawInfo() function added with detailed returns");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });