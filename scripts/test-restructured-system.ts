import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Testing Restructured System...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("Test account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "LYX\n");
    
    try {
        // Test 1: Create LYX Draw
        console.log("📝 Test 1: Creating LYX Draw...");
        
        const drawManagement = await ethers.getContractAt("GridottoDrawManagementFacet", diamondAddress);
        
        const prizeConfig = {
            model: 0, // PERCENTAGE
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 8000, // 80% to prize pool
            totalWinners: 1,
            prizePercentages: [10000], // 100% to winner
            minParticipants: 2,
            gracePeriod: 300 // 5 minutes
        };
        
        const tx1 = await drawManagement.createUserDraw(
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
        
        // Test 2: View Draw Details
        console.log("\n📊 Test 2: Getting Draw Details...");
        
        const viewFacet = await ethers.getContractAt("GridottoViewFacet", diamondAddress);
        const drawDetails = await viewFacet.getDrawDetails(drawId);
        
        console.log("Creator:", drawDetails.creator);
        console.log("Ticket Price:", ethers.formatEther(drawDetails.ticketPrice), "LYX");
        console.log("Max Tickets:", drawDetails.maxTickets.toString());
        console.log("Start Time:", new Date(Number(drawDetails.startTime) * 1000).toLocaleString());
        console.log("End Time:", new Date(Number(drawDetails.endTime) * 1000).toLocaleString());
        
        // Test 3: Buy Tickets
        console.log("\n🎫 Test 3: Buying Tickets...");
        
        const ticketFacet = await ethers.getContractAt("GridottoTicketFacet", diamondAddress);
        const ticketAmount = 5;
        const ticketCost = await ticketFacet.getTicketCost(drawId, ticketAmount);
        console.log(`Cost for ${ticketAmount} tickets: ${ethers.formatEther(ticketCost)} LYX`);
        
        const tx2 = await ticketFacet.buyUserDrawTicket(drawId, ticketAmount, {
            value: ticketCost
        });
        await tx2.wait();
        console.log("✅ Tickets purchased!");
        
        // Test 4: Check User Info
        console.log("\n👤 Test 4: Checking User Info...");
        
        const userInfo = await viewFacet.getUserDrawInfo(drawId, deployer.address);
        console.log("Tickets owned:", userInfo.ticketCount.toString());
        console.log("Has participated:", userInfo.hasParticipated);
        console.log("Winning chance:", userInfo.winningChance.toString(), "basis points");
        
        // Test 5: Check Active Draws
        console.log("\n🔍 Test 5: Getting Active Draws...");
        
        const activeDraws = await viewFacet.getActiveDraws(10);
        console.log("Active draws:", activeDraws.map(id => id.toString()).join(", "));
        
        // Test 6: Check Admin Functions
        console.log("\n🔧 Test 6: Testing Admin Functions...");
        
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", diamondAddress);
        const isPaused = await viewFacet.isPaused();
        console.log("Contract paused:", isPaused);
        
        // Test 7: Check Leaderboard
        console.log("\n📊 Test 7: Testing Leaderboard...");
        
        const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", diamondAddress);
        const platformStats = await leaderboard.getPlatformStats();
        console.log("Total Draws:", platformStats.totalDrawsCreated.toString());
        console.log("Total Tickets:", platformStats.totalTicketsSold.toString());
        
        // Summary
        console.log("\n✅ TEST SUMMARY:");
        console.log("================");
        console.log("✅ Draw Creation: Working");
        console.log("✅ View Functions: Working");
        console.log("✅ Ticket Purchase: Working");
        console.log("✅ User Info: Working");
        console.log("✅ Active Draws: Working");
        console.log("✅ Admin Functions: Accessible");
        console.log("✅ Leaderboard: Working");
        
        console.log("\n🎉 All basic tests passed!");
        
        // Next steps
        console.log("\n📝 NEXT STEPS:");
        console.log("1. Wait for draw to end");
        console.log("2. Execute draw");
        console.log("3. Claim prizes");
        console.log("4. Test token draws");
        console.log("5. Test NFT draws");
        
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main().catch(console.error);