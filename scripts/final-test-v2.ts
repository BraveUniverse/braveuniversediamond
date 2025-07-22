import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Final Test V2...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Test account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "LYX\n");
    
    try {
        // Test 1: Create LYX Draw
        console.log("📝 Test 1: Creating LYX Draw...");
        
        // Use the correct facet - check where createUserDraw is
        const createDrawFacet = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
        
        const prizeConfig = {
            model: 1, // PARTICIPANT_FUNDED
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 8000, // 80% to prize pool
            totalWinners: 1,
            prizePercentages: [10000], // 100% to winner
            minParticipants: 2,
            gracePeriod: 300 // 5 minutes
        };
        
        const tx1 = await createDrawFacet.createUserDraw(
            2, // USER_LYX (enum value)
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            100, // max tickets
            3600, // 1 hour
            prizeConfig,
            0, // No requirement
            ethers.ZeroAddress,
            0,
            [],
            { value: 0 }
        );
        
        const receipt1 = await tx1.wait();
        console.log("✅ Draw created! TX:", receipt1.hash);
        
        // Get draw ID from event
        let drawId = 0;
        for (const log of receipt1.logs) {
            if (log.topics && log.topics.length >= 2) {
                const id = parseInt(log.topics[1], 16);
                if (id > 0 && id < 1000) {
                    drawId = id;
                    break;
                }
            }
        }
        console.log("Draw ID:", drawId);
        
        // Test 2: Get Draw Details
        console.log("\n📊 Test 2: Getting Draw Details...");
        
        const mainFacet = await ethers.getContractAt("IGridottoFacet", diamondAddress);
        const drawDetails = await mainFacet.getDrawDetails(drawId);
        
        console.log("Creator:", drawDetails.creator);
        console.log("Ticket Price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
        console.log("Max Tickets:", drawDetails.maxTickets.toString());
        console.log("Start Time:", new Date(Number(drawDetails.startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(drawDetails.endTime) * 1000).toLocaleString());
        
        // Test 3: Buy Tickets
        console.log("\n🎫 Test 3: Buying Tickets...");
        
        const ticketAmount = 5;
        const ticketCost = drawDetails.ticketPrice * BigInt(ticketAmount);
        
        const tx2 = await mainFacet.buyUserDrawTicket(drawId, ticketAmount, {
            value: ticketCost
        });
        await tx2.wait();
        console.log("✅ Tickets purchased!");
        
        // Test 4: Check Ticket Count
        console.log("\n👤 Test 4: Checking Ticket Count...");
        
        const ticketCount = await mainFacet.getUserTickets(drawId, deployer.address);
        console.log("Tickets owned:", ticketCount.toString());
        
        // Test 5: Check Active Draws
        console.log("\n🔍 Test 5: Getting Active Draws...");
        
        const activeDraws = await mainFacet.getActiveDraws();
        console.log("Active draws:", activeDraws.length);
        if (activeDraws.length > 0) {
            console.log("Draw IDs:", activeDraws.slice(0, 10).map(id => id.toString()).join(", "));
        }
        
        // Test 6: Check Leaderboard
        console.log("\n📊 Test 6: Testing Leaderboard...");
        
        const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
        const platformStats = await leaderboard.getPlatformStats();
        console.log("Total Draws:", platformStats.totalDrawsCreated.toString());
        console.log("Total Tickets:", platformStats.totalTicketsSold.toString());
        console.log("Total Prizes:", ethers.formatEther(platformStats.totalPrizesDistributed), "LYX");
        
        // Test 7: Check Execution Facet
        console.log("\n⚡ Test 7: Checking Execution Facet...");
        
        const execution = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
        const canExecute = await execution.canExecuteDraw(drawId);
        console.log("Can execute draw:", canExecute);
        
        // Test 8: Create another draw with different settings
        console.log("\n🎲 Test 8: Creating Multi-Winner Draw...");
        
        const multiWinnerConfig = {
            model: 1, // PARTICIPANT_FUNDED
            creatorContribution: ethers.parseEther("1"), // 1 LYX initial prize
            addParticipationFees: true,
            participationFeePercent: 9000, // 90% to prize pool
            totalWinners: 3,
            prizePercentages: [5000, 3000, 2000], // 50%, 30%, 20%
            minParticipants: 5,
            gracePeriod: 600 // 10 minutes
        };
        
        const tx3 = await createDrawFacet.createUserDraw(
            2, // USER_LYX
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            200, // max tickets
            7200, // 2 hours
            multiWinnerConfig,
            0, // No requirement
            ethers.ZeroAddress,
            0,
            [],
            { value: ethers.parseEther("1") } // Creator contribution
        );
        
        const receipt3 = await tx3.wait();
        console.log("✅ Multi-winner draw created! TX:", receipt3.hash);
        
        // Test 9: Buy tickets for the new draw
        console.log("\n🎫 Test 9: Buying tickets for multi-winner draw...");
        
        let drawId2 = 0;
        for (const log of receipt3.logs) {
            if (log.topics && log.topics.length >= 2) {
                const id = parseInt(log.topics[1], 16);
                if (id > drawId) {
                    drawId2 = id;
                    break;
                }
            }
        }
        console.log("Multi-winner draw ID:", drawId2);
        
        const tx4 = await mainFacet.buyUserDrawTicket(drawId2, 10, {
            value: ethers.parseEther("0.5") // 10 tickets * 0.05 LYX
        });
        await tx4.wait();
        console.log("✅ 10 tickets purchased for multi-winner draw!");
        
        // Summary
        console.log("\n✅ SYSTEM STATUS:");
        console.log("=================");
        console.log("✅ Draw Creation: Working");
        console.log("✅ Ticket Purchase: Working");
        console.log("✅ View Functions: Working");
        console.log("✅ Leaderboard: Working");
        console.log("✅ Execution Check: Working");
        console.log("✅ Multi-Winner Draws: Working");
        console.log("✅ Creator Contributions: Working");
        
        console.log("\n📊 CURRENT FACET STRUCTURE:");
        console.log("===========================");
        console.log("1. GridottoFacet - Main draw operations (legacy)");
        console.log("2. GridottoMissingFacet - createUserDraw/createTokenDraw");
        console.log("3. GridottoExecutionFacet - Execute & claim");
        console.log("4. GridottoLeaderboardFacet - Leaderboard functions");
        console.log("5. GridottoUIHelperFacet - UI helper functions");
        console.log("6. AdminFacet - Admin operations");
        console.log("7. Diamond standard facets");
        
        console.log("\n📱 UI IMPLEMENTATION GUIDE:");
        console.log("==========================");
        console.log("// Draw Creation");
        console.log("const facet = await ethers.getContractAt('GridottoMissingFacet', diamondAddress);");
        console.log("await facet.createUserDraw(...);");
        console.log("");
        console.log("// Ticket Purchase & View");
        console.log("const mainFacet = await ethers.getContractAt('IGridottoFacet', diamondAddress);");
        console.log("await mainFacet.buyUserDrawTicket(drawId, amount, { value });");
        console.log("const details = await mainFacet.getDrawDetails(drawId);");
        console.log("");
        console.log("// Execution & Claiming");
        console.log("const execution = await ethers.getContractAt('GridottoExecutionFacet', diamondAddress);");
        console.log("await execution.executeUserDraw(drawId);");
        console.log("await execution.claimUserDrawPrize(drawId);");
        
        console.log("\n🎉 All systems operational!");
        
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch(console.error);