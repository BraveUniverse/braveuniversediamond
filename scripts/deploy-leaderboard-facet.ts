import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Leaderboard Facet...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get contracts
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    
    try {
        // Deploy GridottoLeaderboardFacet
        console.log("📦 Deploying GridottoLeaderboardFacet...");
        const GridottoLeaderboardFacet = await ethers.getContractFactory("GridottoLeaderboardFacet");
        const leaderboardFacet = await GridottoLeaderboardFacet.deploy();
        await leaderboardFacet.waitForDeployment();
        const leaderboardFacetAddress = await leaderboardFacet.getAddress();
        console.log("GridottoLeaderboardFacet deployed to:", leaderboardFacetAddress);
        
        // Get function selectors (excluding getPlatformStats which already exists)
        const leaderboardSelectors = [
            leaderboardFacet.interface.getFunction("getTopWinners").selector,
            leaderboardFacet.interface.getFunction("getTopTicketBuyers").selector,
            leaderboardFacet.interface.getFunction("getTopDrawCreators").selector,
            leaderboardFacet.interface.getFunction("getTopExecutors").selector
        ];
        
        console.log("\n📝 Leaderboard function selectors:");
        leaderboardSelectors.forEach(selector => {
            console.log(`- ${selector}`);
        });
        
        // Prepare diamond cut
        const cut = [{
            facetAddress: leaderboardFacetAddress,
            action: 0, // Add
            functionSelectors: leaderboardSelectors
        }];
        
        console.log("\n💎 Executing diamond cut...");
        const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
        
        for (const selector of leaderboardSelectors) {
            const facetAddress = await diamondLoupe.facetAddress(selector);
            if (facetAddress === leaderboardFacetAddress) {
                console.log(`✅ Function ${selector} deployed successfully`);
            } else {
                console.log(`❌ Function ${selector} NOT found`);
            }
        }
        
        console.log("\n🎉 Leaderboard facet deployed successfully!");
        console.log("\nAvailable functions:");
        console.log("- getTopWinners(uint256 limit)");
        console.log("- getTopTicketBuyers(uint256 limit)");
        console.log("- getTopDrawCreators(uint256 limit)");
        console.log("- getTopExecutors(uint256 limit)");
        console.log("- getPlatformStats()");
        
    } catch (error: any) {
        console.error("Error deploying leaderboard facet:", error.message);
        
        if (error.message.includes("LibDiamond: Must be contract owner")) {
            console.log("\n⚠️  You need to be the contract owner to perform diamond cuts.");
        }
    }
}

main().catch(console.error);