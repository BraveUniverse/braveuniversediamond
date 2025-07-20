import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔍 Verifying ALL Functions in Diamond...\n");
    
    // Load deployment addresses
    const deploymentPath = path.join(__dirname, "../deployments/lukso-testnet-addresses.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    const diamondAddress = deploymentData.contracts?.BraveUniverseDiamond || "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get DiamondLoupe facet
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Get all facets
    const facets = await diamondLoupe.facets();
    
    console.log(`Diamond Address: ${diamondAddress}`);
    console.log(`Total Facets: ${facets.length}\n`);
    
    // Count total functions
    let totalFunctions = 0;
    for (const facet of facets) {
        totalFunctions += facet.functionSelectors.length;
    }
    
    console.log(`Total Functions Deployed: ${totalFunctions}\n`);
    
    // Check specific critical functions
    const criticalFunctions = [
        { name: "buyTicket", contract: "GridottoFacet" },
        { name: "executeWeeklyDraw", contract: "GridottoFacet" },
        { name: "executeMonthlyDraw", contract: "GridottoFacet" },
        { name: "createUserDraw", contract: "GridottoMissingFacet" },
        { name: "createTokenDraw", contract: "GridottoMissingFacet" },
        { name: "createNFTDraw", contract: "GridottoPhase3Facet" },
        { name: "createAdvancedDraw", contract: "GridottoPhase4Facet" },
        { name: "executeUserDraw", contract: "GridottoExecutionFacet" },
        { name: "forceExecuteDraw", contract: "GridottoExecutionFacet" },
        { name: "refundDraw", contract: "GridottoPhase3Facet" },
        { name: "claimRefund", contract: "GridottoPhase3Facet" },
        { name: "getExpiredDrawsWaitingExecution", contract: "GridottoUIHelperFacet" },
        { name: "getDrawsForCleanup", contract: "GridottoUIHelperFacet" }
    ];
    
    console.log("📋 Critical Functions Status:\n");
    
    for (const { name, contract } of criticalFunctions) {
        try {
            // Try to get the contract factory
            const factory = await ethers.getContractFactory(contract).catch(() => null);
            
            if (factory) {
                const func = factory.interface.getFunction(name);
                const facetAddress = await diamondLoupe.facetAddress(func.selector);
                
                if (facetAddress !== ethers.ZeroAddress) {
                    console.log(`✅ ${name} (${contract}): Deployed at ${facetAddress}`);
                } else {
                    console.log(`❌ ${name} (${contract}): NOT DEPLOYED`);
                }
            } else {
                console.log(`⚠️  ${name} (${contract}): Cannot check - contract not found`);
            }
        } catch (e) {
            console.log(`❌ ${name} (${contract}): Error checking`);
        }
    }
    
    // Check for executeWeeklyDraw specifically
    console.log("\n🔍 Checking for executeWeeklyDraw...");
    
    // Try to find it in any facet
    let foundExecuteWeekly = false;
    for (const facet of facets) {
        for (const selector of facet.functionSelectors) {
            // Check if this might be executeWeeklyDraw
            try {
                const gridottoFacet = await ethers.getContractFactory("GridottoFacet");
                const funcs = gridottoFacet.interface.fragments.filter(f => f.type === "function");
                
                for (const func of funcs) {
                    if (func.name === "executeWeeklyDraw" && gridottoFacet.interface.getFunction(func.name).selector === selector) {
                        console.log(`✅ Found executeWeeklyDraw at ${facet.facetAddress}`);
                        foundExecuteWeekly = true;
                        break;
                    }
                }
            } catch (e) {}
        }
    }
    
    if (!foundExecuteWeekly) {
        console.log("❌ executeWeeklyDraw NOT FOUND in any facet");
    }
    
    console.log("\n✅ Verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });