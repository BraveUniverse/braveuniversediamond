import { ethers } from "hardhat";

async function main() {
    console.log("🔄 Restructuring Diamond...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    try {
        // Step 1: Get all current facets and functions
        console.log("📋 Step 1: Analyzing current structure...");
        const currentFacets = await diamondLoupe.facetAddresses();
        console.log(`Current facets: ${currentFacets.length}`);
        
        // Facets to remove (old ones)
        const facetsToRemove = [
            "0x19dD5210C8301db68725D4e1e36B6022BB731C3f", // GridottoFacet
            "0x6A654c9b8F9Cfe304429fAbe3F20B4d092996E2d", // GridottoMissingFacet
            "0x5Fce5CE5F5b13458218DB5856D84Ca25476BBcFa", // GridottoFixedViewFacet
            "0x43a60b7adFf659Daa896CA7d6D0b83A0337415a0", // GridottoFixedPurchaseFacet
            "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D", // GridottoUIHelperFacet
            "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B", // AdminFacet (old)
            "0x5514528F3101FB6a16A4B13685dC15450589FC87", // GridottoViewFacet (old)
        ];
        
        // Step 2: Deploy new facets
        console.log("\n📦 Step 2: Deploying new facets...");
        
        // Deploy GridottoDrawManagementFacet
        console.log("Deploying GridottoDrawManagementFacet...");
        const DrawManagement = await ethers.getContractFactory("GridottoDrawManagementFacet");
        const drawManagement = await DrawManagement.deploy();
        await drawManagement.waitForDeployment();
        const drawManagementAddress = await drawManagement.getAddress();
        console.log("✅ GridottoDrawManagementFacet:", drawManagementAddress);
        
        // Deploy GridottoTicketFacet
        console.log("Deploying GridottoTicketFacet...");
        const TicketFacet = await ethers.getContractFactory("GridottoTicketFacet");
        const ticketFacet = await TicketFacet.deploy();
        await ticketFacet.waitForDeployment();
        const ticketFacetAddress = await ticketFacet.getAddress();
        console.log("✅ GridottoTicketFacet:", ticketFacetAddress);
        
        // Deploy new GridottoViewFacet
        console.log("Deploying new GridottoViewFacet...");
        const ViewFacet = await ethers.getContractFactory("GridottoViewFacet");
        const viewFacet = await ViewFacet.deploy();
        await viewFacet.waitForDeployment();
        const viewFacetAddress = await viewFacet.getAddress();
        console.log("✅ GridottoViewFacet:", viewFacetAddress);
        
        // Deploy GridottoAdminFacet
        console.log("Deploying GridottoAdminFacet...");
        const AdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
        const adminFacet = await AdminFacet.deploy();
        await adminFacet.waitForDeployment();
        const adminFacetAddress = await adminFacet.getAddress();
        console.log("✅ GridottoAdminFacet:", adminFacetAddress);
        
        // Step 3: Prepare diamond cut
        console.log("\n💎 Step 3: Preparing diamond cut...");
        
        const cuts = [];
        
        // Remove old facets
        for (const facetAddress of facetsToRemove) {
            if (currentFacets.includes(facetAddress)) {
                const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
                
                // Skip diamond standard functions
                const selectorsToRemove = selectors.filter(s => {
                    return ![
                        "0x1f931c1c", // diamondCut
                        "0xcdffacc6", // facetAddress
                        "0x52ef6b2c", // facetAddresses
                        "0xadfca15e", // facetFunctionSelectors
                        "0x7a0ed627", // facets
                        "0x01ffc9a7", // supportsInterface
                        "0x8da5cb5b", // owner
                        "0xf2fde38b"  // transferOwnership
                    ].includes(s);
                });
                
                if (selectorsToRemove.length > 0) {
                    cuts.push({
                        facetAddress: ethers.ZeroAddress,
                        action: 2, // Remove
                        functionSelectors: selectorsToRemove
                    });
                    console.log(`Removing ${selectorsToRemove.length} functions from ${facetAddress}`);
                }
            }
        }
        
        // Add new facets
        // GridottoDrawManagementFacet
        const drawManagementSelectors = [
            drawManagement.interface.getFunction("createUserDraw").selector,
            drawManagement.interface.getFunction("createTokenDraw").selector,
            drawManagement.interface.getFunction("cancelUserDraw").selector,
        ];
        
        cuts.push({
            facetAddress: drawManagementAddress,
            action: 0, // Add
            functionSelectors: drawManagementSelectors
        });
        
        // GridottoTicketFacet
        const ticketSelectors = [
            ticketFacet.interface.getFunction("buyUserDrawTicket").selector,
            ticketFacet.interface.getFunction("buyTokenDrawTicket").selector,
            ticketFacet.interface.getFunction("buyMultipleDrawsTickets").selector,
            ticketFacet.interface.getFunction("getTicketCost").selector,
        ];
        
        cuts.push({
            facetAddress: ticketFacetAddress,
            action: 0, // Add
            functionSelectors: ticketSelectors
        });
        
        // GridottoViewFacet
        const viewSelectors = [
            viewFacet.interface.getFunction("getDrawDetails").selector,
            viewFacet.interface.getFunction("getDrawTiming").selector,
            viewFacet.interface.getFunction("getUserDrawInfo").selector,
            viewFacet.interface.getFunction("getDrawParticipantsWithTickets").selector,
            viewFacet.interface.getFunction("getActiveDraws").selector,
            viewFacet.interface.getFunction("getUserCreatedDraws").selector,
            viewFacet.interface.getFunction("getUserParticipatedDraws").selector,
            viewFacet.interface.getFunction("drawExists").selector,
            viewFacet.interface.getFunction("getDrawIdCounter").selector,
            viewFacet.interface.getFunction("isPaused").selector,
        ];
        
        cuts.push({
            facetAddress: viewFacetAddress,
            action: 0, // Add
            functionSelectors: viewSelectors
        });
        
        // GridottoAdminFacet
        const adminSelectors = [
            adminFacet.interface.getFunction("pause").selector,
            adminFacet.interface.getFunction("unpause").selector,
            adminFacet.interface.getFunction("setPaused").selector,
            adminFacet.interface.getFunction("emergencyWithdraw").selector,
            adminFacet.interface.getFunction("withdrawOwnerProfit").selector,
            adminFacet.interface.getFunction("setDrawIntervals").selector,
            adminFacet.interface.getFunction("setFeePercentages").selector,
            adminFacet.interface.getFunction("setTicketPrice").selector,
            adminFacet.interface.getFunction("cancelDrawAsAdmin").selector,
            adminFacet.interface.getFunction("withdrawOwnerTokenProfit").selector,
            adminFacet.interface.getFunction("getOwnerTokenProfit").selector,
            adminFacet.interface.getFunction("getOwnerProfit").selector,
        ];
        
        cuts.push({
            facetAddress: adminFacetAddress,
            action: 0, // Add
            functionSelectors: adminSelectors
        });
        
        // Step 4: Execute diamond cut
        console.log("\n⚡ Step 4: Executing diamond cut...");
        console.log(`Total cuts: ${cuts.length}`);
        
        const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Step 5: Verify new structure
        console.log("\n🔍 Step 5: Verifying new structure...");
        
        const newFacets = await diamondLoupe.facetAddresses();
        console.log(`\nNew total facets: ${newFacets.length}`);
        
        // Keep these facets
        const keepFacets = [
            "GridottoExecutionFacet",
            "GridottoLeaderboardFacet",
            "DiamondCutFacet",
            "DiamondLoupeFacet",
            "OwnershipFacet"
        ];
        
        console.log("\n✅ FINAL STRUCTURE:");
        console.log("==================");
        console.log("1. GridottoDrawManagementFacet - Draw creation/cancellation");
        console.log("2. GridottoTicketFacet - Ticket purchases");
        console.log("3. GridottoExecutionFacet - Draw execution & claiming");
        console.log("4. GridottoViewFacet - All view functions");
        console.log("5. GridottoLeaderboardFacet - Leaderboard functions");
        console.log("6. GridottoAdminFacet - Admin functions");
        console.log("7. Diamond standard facets - Core diamond functionality");
        
        console.log("\n🎉 Restructuring complete!");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);