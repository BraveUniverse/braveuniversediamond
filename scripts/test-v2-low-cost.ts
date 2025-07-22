import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🧪 Low-Cost V2 System Test\n");

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "LYX\n");

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", DIAMOND_ADDRESS);

    // Test 1: Check platform draws
    console.log("📊 Test 1: Platform Draws Status");
    const platformInfo = await platform.getPlatformDrawsInfo();
    console.log("Weekly Draw ID:", platformInfo.weeklyDrawId.toString());
    console.log("Monthly Pool Balance:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");

    // Test 2: Buy 1 weekly ticket (0.25 LYX)
    console.log("\n📊 Test 2: Buy 1 Weekly Ticket");
    try {
        const weeklyDrawId = platformInfo.weeklyDrawId;
        const ticketPrice = ethers.parseEther("0.25");
        
        const tx = await core.buyTickets(weeklyDrawId, 1, { value: ticketPrice });
        const receipt = await tx.wait();
        console.log("✅ Bought 1 weekly ticket!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Check monthly tickets
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        console.log("Monthly tickets earned:", monthlyTickets.fromWeekly.toString());
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // Test 3: Create small LYX draw
    console.log("\n📊 Test 3: Create Small LYX Draw");
    let userDrawId;
    try {
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.001"), // 0.001 LYX per ticket
            10,
            60, // 1 minute
            1,  // Min 1 participant
            500,
            { value: ethers.parseEther("0.01") } // 0.01 LYX initial prize
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            userDrawId = parsed?.args.drawId;
            console.log(`✅ Created draw ${userDrawId}`);
            console.log("Gas used:", receipt.gasUsed.toString());
        }
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    // Test 4: Buy tickets for own draw
    if (userDrawId) {
        console.log("\n📊 Test 4: Buy 2 Tickets");
        try {
            const tx = await core.buyTickets(userDrawId, 2, { 
                value: ethers.parseEther("0.002") 
            });
            await tx.wait();
            console.log("✅ Bought 2 tickets!");
            
            const details = await core.getDrawDetails(userDrawId);
            console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
            console.log("Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }

        // Wait and execute
        console.log("\n⏳ Waiting 65 seconds for draw to end...");
        await new Promise(resolve => setTimeout(resolve, 65000));

        console.log("\n📊 Test 5: Execute Draw");
        try {
            const canExecute = await execution.canExecuteDraw(userDrawId);
            console.log("Can execute:", canExecute);
            
            if (canExecute) {
                const tx = await execution.executeDraw(userDrawId);
                const receipt = await tx.wait();
                console.log("✅ Draw executed!");
                console.log("Gas used:", receipt.gasUsed.toString());
                
                // Check winner
                const winners = await execution.getDrawWinners(userDrawId);
                console.log("Winner:", winners.winners[0]);
                console.log("Prize:", ethers.formatEther(winners.amounts[0]), "LYX");
                
                // Claim prize
                const canClaim = await refund.canClaimPrize(userDrawId, signer.address);
                if (canClaim.canClaim) {
                    const claimTx = await refund.claimPrize(userDrawId);
                    await claimTx.wait();
                    console.log("✅ Prize claimed!");
                }
            }
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }
    }

    // Test 6: Check system stats
    console.log("\n📊 Test 6: System Statistics");
    const stats = await admin.getSystemStats();
    console.log("Total draws:", stats.totalDrawsCreated.toString());
    console.log("Total tickets:", stats.totalTicketsSold.toString());
    console.log("Total prizes:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
    console.log("Platform fees:", ethers.formatEther(await admin.getPlatformFeesLYX()), "LYX");

    // Test 7: Check leaderboards
    console.log("\n📊 Test 7: Leaderboards");
    const winners = await leaderboard.getTopWinners(3);
    console.log("Top winners count:", winners.length);
    if (winners.length > 0) {
        console.log("Top winner:", winners[0].user, "- Wins:", winners[0].wins.toString());
    }

    // Test 8: User history
    console.log("\n📊 Test 8: User History");
    const history = await core.getUserDrawHistory(signer.address);
    console.log("Participated in", history.length, "draws");

    // Test 9: Monthly tickets summary
    console.log("\n📊 Test 9: Monthly Tickets Summary");
    const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
    console.log("From weekly:", monthlyTickets.fromWeekly.toString());
    console.log("From creating:", monthlyTickets.fromCreating.toString());
    console.log("From participating:", monthlyTickets.fromParticipating.toString());
    const total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
    console.log("Total monthly tickets:", total.toString());

    console.log("\n✅ Low-cost test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });