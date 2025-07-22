import { ethers } from "hardhat";
import { Wallet } from "ethers";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Test accounts with private keys (for testing only!)
const TEST_ACCOUNTS = [
    {
        address: "0x666eA581Ab742695373bF63cCc885968fFDB966c",
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // Example key
    },
    {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" // Example key
    }
];

async function main() {
    console.log("🚀 COMPREHENSIVE MULTI-ACCOUNT TEST WITH LSP7/LSP8\n");

    const [mainSigner] = await ethers.getSigners();
    console.log("Main account:", mainSigner.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(mainSigner.address)), "LYX\n");

    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const leaderboard = await ethers.getContractAt("GridottoLeaderboardFacet", DIAMOND_ADDRESS);

    // Deploy Mock LSP7 and LSP8
    console.log("═══════════════════════════════════════");
    console.log("DEPLOYING MOCK TOKENS");
    console.log("═══════════════════════════════════════\n");

    let mockLSP7Address: string;
    let mockLSP8Address: string;

    try {
        // Deploy Mock LSP7
        const MockLSP7 = await ethers.getContractFactory("MockLSP7");
        const mockLSP7 = await MockLSP7.deploy("Test Token", "TEST");
        await mockLSP7.waitForDeployment();
        mockLSP7Address = await mockLSP7.getAddress();
        console.log("✅ Mock LSP7 deployed at:", mockLSP7Address);

        // Deploy Mock LSP8
        const MockLSP8 = await ethers.getContractFactory("MockLSP8");
        const mockLSP8 = await MockLSP8.deploy("Test NFT", "TNFT");
        await mockLSP8.waitForDeployment();
        mockLSP8Address = await mockLSP8.getAddress();
        console.log("✅ Mock LSP8 deployed at:", mockLSP8Address);

        // Mint tokens
        await mockLSP7.mint(mainSigner.address, ethers.parseEther("1000"), true, "0x");
        console.log("✅ Minted 1000 TEST tokens");

        // Mint NFTs
        const tokenIds = [];
        for (let i = 1; i <= 5; i++) {
            const tokenId = ethers.encodeBytes32String(`NFT${i}`);
            await mockLSP8.mint(mainSigner.address, tokenId, true, "0x");
            tokenIds.push(tokenId);
        }
        console.log("✅ Minted 5 NFTs");

    } catch (error: any) {
        console.error("❌ Mock deployment failed:", error.message);
        return;
    }

    // Distribute LYX to test accounts
    console.log("\n═══════════════════════════════════════");
    console.log("DISTRIBUTING FUNDS TO TEST ACCOUNTS");
    console.log("═══════════════════════════════════════\n");

    const testWallets: Wallet[] = [];
    try {
        for (const account of TEST_ACCOUNTS) {
            // Send 2 LYX to each test account
            const tx = await mainSigner.sendTransaction({
                to: account.address,
                value: ethers.parseEther("2.0")
            });
            await tx.wait();
            console.log(`✅ Sent 2 LYX to ${account.address}`);

            // Create wallet instance
            const wallet = new Wallet(account.privateKey, ethers.provider);
            testWallets.push(wallet);

            // Also send some LSP7 tokens
            const mockLSP7 = await ethers.getContractAt("MockLSP7", mockLSP7Address);
            await mockLSP7.transfer(mainSigner.address, account.address, ethers.parseEther("100"), true, "0x");
            console.log(`✅ Sent 100 TEST tokens to ${account.address}`);
        }
    } catch (error: any) {
        console.error("❌ Distribution failed:", error.message);
    }

    // TEST 1: Multi-Account LYX Draw
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 1: Multi-Account LYX Draw");
    console.log("═══════════════════════════════════════\n");

    let lyxDrawId: bigint;
    try {
        // Main account creates draw
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            30,
            60, // 1 minute
            2,  // Min 2 participants
            500,
            { value: ethers.parseEther("1.0") }
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        lyxDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created LYX draw ID:", lyxDrawId?.toString());

        // Each account buys tickets
        await core.buyTickets(lyxDrawId, 3, { value: ethers.parseEther("0.3") });
        console.log("✅ Main account bought 3 tickets");

        for (let i = 0; i < testWallets.length; i++) {
            const coreWithWallet = core.connect(testWallets[i]);
            await coreWithWallet.buyTickets(lyxDrawId, 2, { value: ethers.parseEther("0.2") });
            console.log(`✅ Test account ${i+1} bought 2 tickets`);
        }

        // Check draw details
        const details = await core.getDrawDetails(lyxDrawId);
        console.log("\n📊 Draw Status:");
        console.log("- Participants:", details.participantCount.toString());
        console.log("- Tickets sold:", details.ticketsSold.toString());
        console.log("- Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("- Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");

        // Wait and execute
        console.log("\n⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));

        await execution.executeDraw(lyxDrawId);
        console.log("✅ Draw executed!");

        // Check winner and claim
        const winners = await execution.getDrawWinners(lyxDrawId);
        console.log("Winner:", winners.winners[0]);
        console.log("Prize:", ethers.formatEther(winners.amounts[0]), "LYX");

        // Winner claims prize
        for (const wallet of [mainSigner, ...testWallets]) {
            const refundWithWallet = refund.connect(wallet);
            const canClaim = await refundWithWallet.canClaimPrize(lyxDrawId, wallet.address);
            if (canClaim.canClaim) {
                await refundWithWallet.claimPrize(lyxDrawId);
                console.log(`✅ ${wallet.address} claimed prize!`);
            }
        }

    } catch (error: any) {
        console.error("❌ Test 1 failed:", error.message);
    }

    // TEST 2: LSP7 Token Draw
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 2: LSP7 Token Draw");
    console.log("═══════════════════════════════════════\n");

    let lsp7DrawId: bigint;
    try {
        // Approve token spending
        const mockLSP7 = await ethers.getContractAt("MockLSP7", mockLSP7Address);
        await mockLSP7.authorizeOperator(DIAMOND_ADDRESS, ethers.parseEther("1000"), "0x");
        console.log("✅ Approved Diamond for LSP7");

        // Create LSP7 draw
        const tx = await core.createTokenDraw(
            mockLSP7Address,
            ethers.parseEther("10"), // 10 tokens per ticket
            20,
            60,
            1,
            500,
            ethers.parseEther("100") // 100 tokens initial prize
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        lsp7DrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created LSP7 draw ID:", lsp7DrawId?.toString());

        // Main account buys tickets
        await core.buyTickets(lsp7DrawId, 2, { value: 0 });
        console.log("✅ Main account bought 2 tickets with tokens");

        // Test accounts approve and buy
        for (let i = 0; i < testWallets.length; i++) {
            const lsp7WithWallet = mockLSP7.connect(testWallets[i]);
            await lsp7WithWallet.authorizeOperator(DIAMOND_ADDRESS, ethers.parseEther("100"), "0x");
            
            const coreWithWallet = core.connect(testWallets[i]);
            await coreWithWallet.buyTickets(lsp7DrawId, 1, { value: 0 });
            console.log(`✅ Test account ${i+1} bought 1 ticket with tokens`);
        }

        // Execute after timeout
        console.log("⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));

        await execution.executeDraw(lsp7DrawId);
        console.log("✅ LSP7 draw executed!");

    } catch (error: any) {
        console.error("❌ Test 2 failed:", error.message);
    }

    // TEST 3: LSP8 NFT Draw
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 3: LSP8 NFT Draw");
    console.log("═══════════════════════════════════════\n");

    let lsp8DrawId: bigint;
    try {
        // Approve NFT transfers
        const mockLSP8 = await ethers.getContractAt("MockLSP8", mockLSP8Address);
        await mockLSP8.authorizeOperator(DIAMOND_ADDRESS, ethers.encodeBytes32String("NFT1"), "0x");
        await mockLSP8.authorizeOperator(DIAMOND_ADDRESS, ethers.encodeBytes32String("NFT2"), "0x");
        console.log("✅ Approved Diamond for NFTs");

        // Create NFT draw
        const tx = await core.createNFTDraw(
            mockLSP8Address,
            [ethers.encodeBytes32String("NFT1"), ethers.encodeBytes32String("NFT2")],
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            40,
            60,
            1,
            500
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        lsp8DrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created NFT draw ID:", lsp8DrawId?.toString());

        // All accounts buy tickets
        await core.buyTickets(lsp8DrawId, 4, { value: ethers.parseEther("0.2") });
        console.log("✅ Main account bought 4 tickets");

        for (let i = 0; i < testWallets.length; i++) {
            const coreWithWallet = core.connect(testWallets[i]);
            await coreWithWallet.buyTickets(lsp8DrawId, 3, { value: ethers.parseEther("0.15") });
            console.log(`✅ Test account ${i+1} bought 3 tickets`);
        }

        // Execute
        console.log("⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));

        await execution.executeDraw(lsp8DrawId);
        console.log("✅ NFT draw executed!");

    } catch (error: any) {
        console.error("❌ Test 3 failed:", error.message);
    }

    // TEST 4: Cancel and Refund with Multiple Accounts
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 4: Multi-Account Cancel & Refund");
    console.log("═══════════════════════════════════════\n");

    try {
        // Create draw that will be cancelled
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.1"),
            20,
            60,
            10, // High minimum that won't be met
            500,
            { value: ethers.parseEther("0.5") }
        );
        const receipt = await tx.wait();
        
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        const cancelDrawId = core.interface.parseLog(event!)?.args.drawId;
        console.log("✅ Created draw to cancel:", cancelDrawId?.toString());

        // All accounts buy tickets
        await core.buyTickets(cancelDrawId, 2, { value: ethers.parseEther("0.2") });
        console.log("✅ Main account bought 2 tickets");

        for (let i = 0; i < testWallets.length; i++) {
            const coreWithWallet = core.connect(testWallets[i]);
            await coreWithWallet.buyTickets(cancelDrawId, 1, { value: ethers.parseEther("0.1") });
            console.log(`✅ Test account ${i+1} bought 1 ticket`);
        }

        // Wait and cancel
        console.log("⏳ Waiting 65 seconds...");
        await new Promise(resolve => setTimeout(resolve, 65000));

        await core.cancelDraw(cancelDrawId);
        console.log("✅ Draw cancelled");

        // All accounts claim refunds
        console.log("\n💰 Claiming refunds:");
        
        // Main account
        let refundAmount = await refund.getRefundAmount(cancelDrawId, mainSigner.address);
        console.log(`Main account refund: ${ethers.formatEther(refundAmount)} LYX`);
        if (refundAmount > 0n) {
            await refund.claimRefund(cancelDrawId);
            console.log("✅ Main account claimed refund");
        }

        // Test accounts
        for (let i = 0; i < testWallets.length; i++) {
            const refundWithWallet = refund.connect(testWallets[i]);
            refundAmount = await refundWithWallet.getRefundAmount(cancelDrawId, testWallets[i].address);
            console.log(`Test account ${i+1} refund: ${ethers.formatEther(refundAmount)} LYX`);
            
            if (refundAmount > 0n) {
                await refundWithWallet.claimRefund(cancelDrawId);
                console.log(`✅ Test account ${i+1} claimed refund`);
            }
        }

    } catch (error: any) {
        console.error("❌ Test 4 failed:", error.message);
    }

    // TEST 5: Weekly Draw Multi-Account
    console.log("\n═══════════════════════════════════════");
    console.log("TEST 5: Weekly Draw Multi-Account");
    console.log("═══════════════════════════════════════\n");

    try {
        const platformInfo = await platform.getPlatformDrawsInfo();
        const weeklyDrawId = platformInfo.weeklyDrawId;
        console.log("Weekly draw ID:", weeklyDrawId.toString());

        // All accounts buy weekly tickets
        await core.buyTickets(weeklyDrawId, 4, { value: ethers.parseEther("1.0") });
        console.log("✅ Main account bought 4 weekly tickets");

        for (let i = 0; i < testWallets.length; i++) {
            const coreWithWallet = core.connect(testWallets[i]);
            await coreWithWallet.buyTickets(weeklyDrawId, 2, { value: ethers.parseEther("0.5") });
            console.log(`✅ Test account ${i+1} bought 2 weekly tickets`);
        }

        // Check monthly tickets for all accounts
        console.log("\n📊 Monthly Tickets Status:");
        
        let monthlyTickets = await platform.getUserMonthlyTickets(mainSigner.address);
        let total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
        console.log(`Main account: ${total} tickets`);

        for (let i = 0; i < testWallets.length; i++) {
            monthlyTickets = await platform.getUserMonthlyTickets(testWallets[i].address);
            total = monthlyTickets.fromWeekly + monthlyTickets.fromCreating + monthlyTickets.fromParticipating;
            console.log(`Test account ${i+1}: ${total} tickets`);
        }

    } catch (error: any) {
        console.error("❌ Test 5 failed:", error.message);
    }

    // FINAL: Check Leaderboards and Stats
    console.log("\n═══════════════════════════════════════");
    console.log("FINAL: System Statistics & Leaderboards");
    console.log("═══════════════════════════════════════\n");

    try {
        // System stats
        const stats = await admin.getSystemStats();
        console.log("📊 System Statistics:");
        console.log("- Total draws:", stats.totalDrawsCreated.toString());
        console.log("- Total tickets:", stats.totalTicketsSold.toString());
        console.log("- Total prizes:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");

        // Platform info
        const platformInfo = await platform.getPlatformDrawsInfo();
        console.log("\n💰 Platform Pools:");
        console.log("- Monthly pool:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");
        console.log("- Platform fees:", ethers.formatEther(await admin.getPlatformFeesLYX()), "LYX");

        // Leaderboards
        console.log("\n🏆 Leaderboards:");
        
        const winners = await leaderboard.getTopWinners(5);
        console.log("\nTop Winners:");
        for (let i = 0; i < Math.min(3, winners.length); i++) {
            console.log(`${i+1}. ${winners[i].user} - ${winners[i].wins} wins, ${ethers.formatEther(winners[i].totalWinnings)} LYX`);
        }

        const buyers = await leaderboard.getTopTicketBuyers(5);
        console.log("\nTop Ticket Buyers:");
        for (let i = 0; i < Math.min(3, buyers.length); i++) {
            console.log(`${i+1}. ${buyers[i].user} - ${buyers[i].totalTickets} tickets, ${ethers.formatEther(buyers[i].totalSpent)} LYX`);
        }

        const creators = await leaderboard.getTopDrawCreators(5);
        console.log("\nTop Draw Creators:");
        for (let i = 0; i < Math.min(3, creators.length); i++) {
            console.log(`${i+1}. ${creators[i].user} - ${creators[i].drawsCreated} draws`);
        }

        // Final balances
        console.log("\n💰 Final Balances:");
        console.log(`Main: ${ethers.formatEther(await ethers.provider.getBalance(mainSigner.address))} LYX`);
        for (let i = 0; i < testWallets.length; i++) {
            const balance = await ethers.provider.getBalance(testWallets[i].address);
            console.log(`Test ${i+1}: ${ethers.formatEther(balance)} LYX`);
        }

    } catch (error: any) {
        console.error("❌ Final stats failed:", error.message);
    }

    console.log("\n✅ ALL COMPREHENSIVE TESTS COMPLETED!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });