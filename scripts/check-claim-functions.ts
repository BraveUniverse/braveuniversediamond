import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking existing claim functions in Diamond");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    // Get DiamondLoupeFacet
    const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);

    // Get new facet to check selectors
    const GridottoPrizeClaimFacet = await ethers.getContractFactory("GridottoPrizeClaimFacet");
    const tempFacet = await GridottoPrizeClaimFacet.deploy();
    await tempFacet.waitForDeployment();

    // Functions we want to add
    const functionsToCheck = [
        { name: "claimPrize", selector: tempFacet.interface.getFunction("claimPrize").selector },
        { name: "claimExecutorFees", selector: tempFacet.interface.getFunction("claimExecutorFees").selector },
        { name: "getClaimableExecutorFees", selector: tempFacet.interface.getFunction("getClaimableExecutorFees").selector },
        { name: "getUnclaimedPrizes", selector: tempFacet.interface.getFunction("getUnclaimedPrizes").selector },
        { name: "batchClaimPrizes", selector: tempFacet.interface.getFunction("batchClaimPrizes").selector },
        { name: "getTotalClaimableAmount", selector: tempFacet.interface.getFunction("getTotalClaimableAmount").selector }
    ];

    console.log("\n📋 Checking functions:");
    const existingFunctions = [];
    const newFunctions = [];

    for (const func of functionsToCheck) {
        try {
            const facetAddress = await loupeFacet.facetAddress(func.selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`❌ ${func.name} (${func.selector}) - EXISTS in facet: ${facetAddress}`);
                existingFunctions.push(func);
            } else {
                console.log(`✅ ${func.name} (${func.selector}) - Available`);
                newFunctions.push(func);
            }
        } catch (error) {
            console.log(`✅ ${func.name} (${func.selector}) - Available`);
            newFunctions.push(func);
        }
    }

    console.log("\n📊 Summary:");
    console.log(`- Existing functions: ${existingFunctions.length}`);
    console.log(`- New functions: ${newFunctions.length}`);

    if (existingFunctions.length > 0) {
        console.log("\n⚠️  Existing functions need to be removed first:");
        for (const func of existingFunctions) {
            console.log(`  - ${func.name}: ${func.selector}`);
        }
    }

    if (newFunctions.length > 0) {
        console.log("\n✅ Functions that can be added:");
        for (const func of newFunctions) {
            console.log(`  - ${func.name}: ${func.selector}`);
        }
    }

    // Check RefundFacet functions
    console.log("\n🔍 Checking RefundFacet functions:");
    const refundFunctions = [
        "claimRefund",
        "claimNFTRefund",
        "getRefundableDraws",
        "getRefundableNFTDraws"
    ];

    for (const funcName of refundFunctions) {
        try {
            // Try to get the function from RefundFacet
            const refundFacet = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
            const selector = refundFacet.interface.getFunction(funcName).selector;
            const facetAddress = await loupeFacet.facetAddress(selector);
            if (facetAddress !== ethers.ZeroAddress) {
                console.log(`  - ${funcName}: ${selector} (in ${facetAddress})`);
            }
        } catch (error) {
            // Function doesn't exist
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });