import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Simplified Facets...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    const diamondCut = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    try {
        // Step 1: Deploy new facets
        console.log("📦 Step 1: Deploying simplified facets...");
        
        // Deploy GridottoDrawManagementFacetSimple
        console.log("Deploying GridottoDrawManagementFacetSimple...");
        const DrawManagement = await ethers.getContractFactory("GridottoDrawManagementFacetSimple");
        const drawManagement = await DrawManagement.deploy();
        await drawManagement.waitForDeployment();
        const drawManagementAddress = await drawManagement.getAddress();
        console.log("✅ GridottoDrawManagementFacetSimple:", drawManagementAddress);
        
        // Deploy GridottoTicketFacetSimple
        console.log("Deploying GridottoTicketFacetSimple...");
        const TicketFacet = await ethers.getContractFactory("GridottoTicketFacetSimple");
        const ticketFacet = await TicketFacet.deploy();
        await ticketFacet.waitForDeployment();
        const ticketFacetAddress = await ticketFacet.getAddress();
        console.log("✅ GridottoTicketFacetSimple:", ticketFacetAddress);
        
        // Deploy new GridottoViewFacet
        console.log("Deploying GridottoViewFacet...");
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
        
        // Step 2: Get functions to remove
        console.log("\n📋 Step 2: Getting functions to remove...");
        
        // Facets to remove
        const facetsToRemove = [
            "0x19dD5210C8301db68725D4e1e36B6022BB731C3f", // GridottoFacet
            "0x6A654c9b8F9Cfe304429fAbe3F20B4d092996E2d", // GridottoMissingFacet
            "0x5Fce5CE5F5b13458218DB5856D84Ca25476BBcFa", // GridottoFixedViewFacet
            "0x43a60b7adFf659Daa896CA7d6D0b83A0337415a0", // GridottoFixedPurchaseFacet
            "0x3d06FbdeAD6bD7e71E75C4576607713E7bbaF49D", // GridottoUIHelperFacet
            "0x71E30D0055d57C796EB9F9fB94AD128B4C377F9B", // AdminFacet (old)
            "0x5514528F3101FB6a16A4B13685dC15450589FC87", // GridottoViewFacet (old)
        ];
        
        const cuts = [];
        
        // Remove old functions
        for (const facetAddress of facetsToRemove) {
            try {
                const selectors = await diamondLoupe.facetFunctionSelectors(facetAddress);
                if (selectors.length > 0) {
                    cuts.push({
                        facetAddress: ethers.ZeroAddress,
                        action: 2, // Remove
                        functionSelectors: selectors
                    });
                    console.log(`Removing ${selectors.length} functions from ${facetAddress}`);
                }
            } catch (e) {
                console.log(`Facet ${facetAddress} not found, skipping`);
            }
        }
        
        // Step 3: Add new functions
        console.log("\n📝 Step 3: Adding new functions...");
        
        // GridottoDrawManagementFacetSimple
        const drawManagementSelectors = [
            drawManagement.interface.getFunction("createUserDraw").selector,
            drawManagement.interface.getFunction("createTokenDraw").selector,
            drawManagement.interface.getFunction("cancelUserDraw").selector,
            drawManagement.interface.getFunction("cancelDrawAsAdmin").selector,
        ];
        
        cuts.push({
            facetAddress: drawManagementAddress,
            action: 0, // Add
            functionSelectors: drawManagementSelectors
        });
        console.log(`Adding ${drawManagementSelectors.length} draw management functions`);
        
        // GridottoTicketFacetSimple
        const ticketSelectors = [
            ticketFacet.interface.getFunction("buyUserDrawTicket").selector,
            ticketFacet.interface.getFunction("buyTokenDrawTicket").selector,
            ticketFacet.interface.getFunction("getTicketCost").selector,
        ];
        
        cuts.push({
            facetAddress: ticketFacetAddress,
            action: 0, // Add
            functionSelectors: ticketSelectors
        });
        console.log(`Adding ${ticketSelectors.length} ticket functions`);
        
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
        console.log(`Adding ${viewSelectors.length} view functions`);
        
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
            adminFacet.interface.getFunction("getOwnerProfit").selector,
        ];
        
        cuts.push({
            facetAddress: adminFacetAddress,
            action: 0, // Add
            functionSelectors: adminSelectors
        });
        console.log(`Adding ${adminSelectors.length} admin functions`);
        
        // Step 4: Execute diamond cut
        console.log("\n💎 Step 4: Executing diamond cut...");
        console.log(`Total cuts: ${cuts.length}`);
        
        const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond cut successful!");
        
        // Step 5: Verify
        console.log("\n🔍 Step 5: Verifying deployment...");
        
        const newFacets = await diamondLoupe.facetAddresses();
        console.log(`Total facets after restructuring: ${newFacets.length}`);
        
        console.log("\n✅ FINAL STRUCTURE:");
        console.log("==================");
        console.log("1. GridottoDrawManagementFacetSimple - Draw creation/cancellation");
        console.log("2. GridottoTicketFacetSimple - Ticket purchases");
        console.log("3. GridottoExecutionFacet - Draw execution & claiming");
        console.log("4. GridottoViewFacet - All view functions");
        console.log("5. GridottoLeaderboardFacet - Leaderboard functions");
        console.log("6. GridottoAdminFacet - Admin functions");
        console.log("7. Diamond standard facets - Core diamond functionality");
        
        console.log("\n🎉 Deployment complete!");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);