import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Deploying updated GridottoExecutionFacet with Oracle and claimable prizes...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Deploy updated facet
    console.log("\n1. Deploying updated GridottoExecutionFacet...");
    const GridottoExecutionFacet = await ethers.getContractFactory("GridottoExecutionFacet");
    const executionFacet = await GridottoExecutionFacet.deploy();
    await executionFacet.waitForDeployment();
    const executionFacetAddress = await executionFacet.getAddress();
    console.log("GridottoExecutionFacet deployed to:", executionFacetAddress);
    
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
    
    const selectors = getSelectors(executionFacet);
    console.log("\n2. Function selectors:", selectors);
    
    // Replace existing functions
    const cuts = [
        {
            facetAddress: executionFacetAddress,
            action: FacetCutAction.Replace,
            functionSelectors: selectors
        }
    ];
    
    console.log("\n3. Executing diamond cut to replace execution functions...");
    try {
        const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Diamond cut executed successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Update deployment addresses
        if (!deploymentData.contracts) {
            deploymentData.contracts = {};
        }
        deploymentData.contracts.GridottoExecutionFacetUpdated = executionFacetAddress;
        deploymentData.lastUpdate = new Date().toISOString();
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
        
        console.log("\n✅ Deployment completed successfully!");
        console.log("\n📋 Summary of changes:");
        console.log("- GridottoExecutionFacet:", executionFacetAddress);
        console.log("\n🔧 Updates implemented:");
        console.log("1. Oracle integration for random number generation");
        console.log("   - Primary: OracleFacet.getRandomNumber()");
        console.log("   - Fallback: block.prevrandao + timestamp");
        console.log("\n2. All prizes are now CLAIMABLE:");
        console.log("   - LYX prizes: claimPrize()");
        console.log("   - Token prizes: claimTokenPrize(address)");
        console.log("   - NFT prizes: claimNFTPrize(address)");
        console.log("   - Gas fees paid by winners when claiming");
        console.log("\n3. Multi-winner support with tier-based distribution");
        console.log("4. Executor rewards (5%, max 5 LYX for native draws)");
        
    } catch (error: any) {
        console.error("Diamond cut failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });