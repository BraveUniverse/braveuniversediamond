import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking Existing Functions...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
    
    // Deploy test facets to get selectors
    const DrawManagement = await ethers.getContractFactory("GridottoDrawManagementFacetSimple");
    const drawManagement = await DrawManagement.deploy();
    await drawManagement.waitForDeployment();
    
    const TicketFacet = await ethers.getContractFactory("GridottoTicketFacetSimple");
    const ticketFacet = await TicketFacet.deploy();
    await ticketFacet.waitForDeployment();
    
    const ViewFacet = await ethers.getContractFactory("GridottoViewFacet");
    const viewFacet = await ViewFacet.deploy();
    await viewFacet.waitForDeployment();
    
    const AdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
    const adminFacet = await AdminFacet.deploy();
    await adminFacet.waitForDeployment();
    
    // Check which functions already exist
    console.log("📋 Checking Draw Management Functions:");
    const drawManagementSelectors = [
        { name: "createUserDraw", selector: drawManagement.interface.getFunction("createUserDraw").selector },
        { name: "createTokenDraw", selector: drawManagement.interface.getFunction("createTokenDraw").selector },
        { name: "cancelUserDraw", selector: drawManagement.interface.getFunction("cancelUserDraw").selector },
        { name: "cancelDrawAsAdmin", selector: drawManagement.interface.getFunction("cancelDrawAsAdmin").selector },
    ];
    
    for (const func of drawManagementSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(func.selector);
        if (facetAddress !== ethers.ZeroAddress) {
            console.log(`❌ ${func.name} already exists at ${facetAddress}`);
        } else {
            console.log(`✅ ${func.name} can be added`);
        }
    }
    
    console.log("\n📋 Checking Ticket Functions:");
    const ticketSelectors = [
        { name: "buyUserDrawTicket", selector: ticketFacet.interface.getFunction("buyUserDrawTicket").selector },
        { name: "buyTokenDrawTicket", selector: ticketFacet.interface.getFunction("buyTokenDrawTicket").selector },
        { name: "getTicketCost", selector: ticketFacet.interface.getFunction("getTicketCost").selector },
    ];
    
    for (const func of ticketSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(func.selector);
        if (facetAddress !== ethers.ZeroAddress) {
            console.log(`❌ ${func.name} already exists at ${facetAddress}`);
        } else {
            console.log(`✅ ${func.name} can be added`);
        }
    }
    
    console.log("\n📋 Checking View Functions:");
    const viewSelectors = [
        { name: "getDrawDetails", selector: viewFacet.interface.getFunction("getDrawDetails").selector },
        { name: "getDrawTiming", selector: viewFacet.interface.getFunction("getDrawTiming").selector },
        { name: "getUserDrawInfo", selector: viewFacet.interface.getFunction("getUserDrawInfo").selector },
        { name: "getDrawParticipantsWithTickets", selector: viewFacet.interface.getFunction("getDrawParticipantsWithTickets").selector },
        { name: "getActiveDraws", selector: viewFacet.interface.getFunction("getActiveDraws").selector },
        { name: "getUserCreatedDraws", selector: viewFacet.interface.getFunction("getUserCreatedDraws").selector },
        { name: "getUserParticipatedDraws", selector: viewFacet.interface.getFunction("getUserParticipatedDraws").selector },
        { name: "drawExists", selector: viewFacet.interface.getFunction("drawExists").selector },
        { name: "getDrawIdCounter", selector: viewFacet.interface.getFunction("getDrawIdCounter").selector },
        { name: "isPaused", selector: viewFacet.interface.getFunction("isPaused").selector },
    ];
    
    for (const func of viewSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(func.selector);
        if (facetAddress !== ethers.ZeroAddress) {
            console.log(`❌ ${func.name} already exists at ${facetAddress}`);
        } else {
            console.log(`✅ ${func.name} can be added`);
        }
    }
    
    console.log("\n📋 Checking Admin Functions:");
    const adminSelectors = [
        { name: "pause", selector: adminFacet.interface.getFunction("pause").selector },
        { name: "unpause", selector: adminFacet.interface.getFunction("unpause").selector },
        { name: "setPaused", selector: adminFacet.interface.getFunction("setPaused").selector },
        { name: "emergencyWithdraw", selector: adminFacet.interface.getFunction("emergencyWithdraw").selector },
        { name: "withdrawOwnerProfit", selector: adminFacet.interface.getFunction("withdrawOwnerProfit").selector },
        { name: "setDrawIntervals", selector: adminFacet.interface.getFunction("setDrawIntervals").selector },
        { name: "setFeePercentages", selector: adminFacet.interface.getFunction("setFeePercentages").selector },
        { name: "setTicketPrice", selector: adminFacet.interface.getFunction("setTicketPrice").selector },
        { name: "getOwnerProfit", selector: adminFacet.interface.getFunction("getOwnerProfit").selector },
    ];
    
    for (const func of adminSelectors) {
        const facetAddress = await diamondLoupe.facetAddress(func.selector);
        if (facetAddress !== ethers.ZeroAddress) {
            console.log(`❌ ${func.name} already exists at ${facetAddress}`);
        } else {
            console.log(`✅ ${func.name} can be added`);
        }
    }
}

main().catch(console.error);