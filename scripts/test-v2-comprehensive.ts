import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Test accounts
const TEST_ACCOUNTS = [
    "0x38e456661bc6e95A3aCf3B4673844Cb389b60243", // Deployer
    "0x5b7F3e8b7D2c1A8e9F6a4C3d2B1a0E9f8D7c6B5a", // Test Account 2
    "0xC8e1F5b4A3d2B1a0E9f8D7c6B5a4C3d2B1a0E9f8"  // Test Account 3
];

async function main() {
    console.log("🧪 Comprehensive V2 System Test\n");

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

    // Test 1: Check platform draws initialization
    console.log("📊 Test 1: Platform Draws Status");
    const platformInfo = await platform.getPlatformDrawsInfo();
    console.log("Weekly Draw ID:", platformInfo.weeklyDrawId.toString());
    console.log("Monthly Draw ID:", platformInfo.monthlyDrawId.toString());
    console.log("Monthly Pool Balance:", ethers.formatEther(platformInfo.monthlyPoolBalance), "LYX");
    console.log("Weekly Count:", platformInfo.weeklyCount.toString());

    // Test 2: Buy weekly draw tickets
    console.log("\n📊 Test 2: Buy Weekly Draw Tickets");
    try {
        const weeklyDrawId = platformInfo.weeklyDrawId;
        const ticketPrice = ethers.parseEther("0.25");
        const ticketAmount = 5;
        
        console.log(`Buying ${ticketAmount} tickets for weekly draw ${weeklyDrawId}...`);
        const tx = await core.buyTickets(weeklyDrawId, ticketAmount, { 
            value: ticketPrice * BigInt(ticketAmount) 
        });
        await tx.wait();
        console.log("✅ Bought weekly tickets!");
        
        // Check monthly tickets awarded
        const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
        console.log("Monthly tickets from weekly:", monthlyTickets.fromWeekly.toString());
    } catch (error: any) {
        console.error("❌ Error buying weekly tickets:", error.message);
    }

    // Test 3: Create user LYX draw
    console.log("\n📊 Test 3: Create User LYX Draw");
    let userDrawId;
    try {
        const ticketPrice = ethers.parseEther("0.01");
        const maxTickets = 100;
        const duration = 300; // 5 minutes
        const minParticipants = 2;
        const platformFee = 500; // 5%
        const initialPrize = ethers.parseEther("0.5");
        
        const tx = await core.createLYXDraw(
            ticketPrice,
            maxTickets,
            duration,
            minParticipants,
            platformFee,
            { value: initialPrize }
        );
        const receipt = await tx.wait();
        
        // Extract drawId
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            userDrawId = parsed?.args.drawId;
            console.log(`✅ Created LYX draw with ID: ${userDrawId}`);
            
            // Check monthly tickets for creating
            const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
            console.log("Monthly tickets from creating:", monthlyTickets.fromCreating.toString());
        }
    } catch (error: any) {
        console.error("❌ Error creating draw:", error.message);
    }

    // Test 4: Buy tickets for user draw
    if (userDrawId) {
        console.log("\n📊 Test 4: Buy Tickets for User Draw");
        try {
            const ticketAmount = 10;
            const ticketCost = ethers.parseEther("0.01") * BigInt(ticketAmount);
            
            const tx = await core.buyTickets(userDrawId, ticketAmount, { value: ticketCost });
            await tx.wait();
            console.log("✅ Bought tickets for user draw!");
            
            // Check draw details
            const details = await core.getDrawDetails(userDrawId);
            console.log("Tickets sold:", details.ticketsSold.toString());
            console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
            console.log("Monthly pool contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
            
            // Check monthly tickets for participating
            const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
            console.log("Monthly tickets from participating:", monthlyTickets.fromParticipating.toString());
        } catch (error: any) {
            console.error("❌ Error buying tickets:", error.message);
        }
    }

    // Test 5: Create and cancel a draw
    console.log("\n📊 Test 5: Create and Cancel Draw");
    let cancelDrawId;
    try {
        // Create draw with high min participants
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.1"),
            10,
            60, // 1 minute
            100, // High min participants to ensure we can cancel
            500,
            { value: ethers.parseEther("1") }
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
            cancelDrawId = parsed?.args.drawId;
            console.log(`Created draw ${cancelDrawId} to cancel`);
            
            // Buy one ticket
            await core.buyTickets(cancelDrawId, 1, { value: ethers.parseEther("0.1") });
            console.log("Bought 1 ticket");
            
            // Wait for draw to end
            console.log("Waiting 65 seconds for draw to end...");
            await new Promise(resolve => setTimeout(resolve, 65000));
            
            // Cancel draw
            const cancelTx = await core.cancelDraw(cancelDrawId);
            await cancelTx.wait();
            console.log("✅ Draw cancelled!");
            
            // Check refund amount
            const refundAmount = await refund.getRefundAmount(cancelDrawId, signer.address);
            console.log("Refund available:", ethers.formatEther(refundAmount), "LYX");
            
            // Claim refund
            const refundTx = await refund.claimRefund(cancelDrawId);
            await refundTx.wait();
            console.log("✅ Refund claimed!");
        }
    } catch (error: any) {
        console.error("❌ Error in cancel test:", error.message);
    }

    // Test 6: Deploy and test LSP7 token draw
    console.log("\n📊 Test 6: LSP7 Token Draw");
    try {
        // Deploy mock LSP7
        const MockLSP7 = await ethers.getContractFactory("MockLSP7");
        const mockToken = await MockLSP7.deploy("Test Token", "TEST", ethers.parseEther("10000"));
        await mockToken.waitForDeployment();
        const tokenAddress = await mockToken.getAddress();
        console.log("✅ Mock LSP7 deployed:", tokenAddress);
        
        // Approve and create token draw
        await mockToken.approve(DIAMOND_ADDRESS, ethers.parseEther("1000"));
        
        const tx = await core.createTokenDraw(
            tokenAddress,
            ethers.parseEther("10"), // 10 tokens per ticket
            50,
            300,
            2,
            500,
            ethers.parseEther("100") // 100 tokens initial prize
        );
        const receipt = await tx.wait();
        console.log("✅ Token draw created!");
        
        // Note: Full token draw test would require token transfers
    } catch (error: any) {
        console.error("❌ Error in LSP7 test:", error.message);
    }

    // Test 7: Deploy and test LSP8 NFT draw
    console.log("\n📊 Test 7: LSP8 NFT Draw");
    try {
        // Deploy mock LSP8
        const MockLSP8 = await ethers.getContractFactory("MockLSP8");
        const mockNFT = await MockLSP8.deploy("Test NFT", "TNFT");
        await mockNFT.waitForDeployment();
        const nftAddress = await mockNFT.getAddress();
        console.log("✅ Mock LSP8 deployed:", nftAddress);
        
        // Mint NFTs
        const tokenId1 = ethers.keccak256(ethers.toUtf8Bytes("NFT1"));
        const tokenId2 = ethers.keccak256(ethers.toUtf8Bytes("NFT2"));
        await mockNFT.mint(signer.address, tokenId1);
        await mockNFT.mint(signer.address, tokenId2);
        console.log("✅ Minted 2 NFTs");
        
        // Authorize diamond
        await mockNFT.authorizeOperator(DIAMOND_ADDRESS, tokenId1);
        await mockNFT.authorizeOperator(DIAMOND_ADDRESS, tokenId2);
        
        // Create NFT draw with ticket price
        const tx = await core.createNFTDraw(
            nftAddress,
            [tokenId1, tokenId2],
            ethers.parseEther("0.05"), // 0.05 LYX per ticket
            20,
            300,
            1,
            1000 // 10% platform fee
        );
        const receipt = await tx.wait();
        console.log("✅ NFT draw created with ticket sales!");
        
    } catch (error: any) {
        console.error("❌ Error in LSP8 test:", error.message);
    }

    // Test 8: Check system stats
    console.log("\n📊 Test 8: System Statistics");
    try {
        const stats = await admin.getSystemStats();
        console.log("Total draws created:", stats.totalDrawsCreated.toString());
        console.log("Total tickets sold:", stats.totalTicketsSold.toString());
        console.log("Total prizes distributed:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("Total executions:", stats.totalExecutions.toString());
        
        const platformFees = await admin.getPlatformFeesLYX();
        console.log("Platform fees collected:", ethers.formatEther(platformFees), "LYX");
        
        const monthlyPool = await platform.getPlatformDrawsInfo();
        console.log("Monthly pool balance:", ethers.formatEther(monthlyPool.monthlyPoolBalance), "LYX");
    } catch (error: any) {
        console.error("❌ Error getting stats:", error.message);
    }

    // Test 9: Check leaderboards
    console.log("\n📊 Test 9: Leaderboards");
    try {
        const winners = await leaderboard.getTopWinners(5);
        console.log("Top winners:", winners.length);
        
        const buyers = await leaderboard.getTopTicketBuyers(5);
        console.log("Top ticket buyers:", buyers.length);
        
        const creators = await leaderboard.getTopDrawCreators(5);
        console.log("Top draw creators:", creators.length);
        
        const executors = await leaderboard.getTopExecutors(5);
        console.log("Top executors:", executors.length);
    } catch (error: any) {
        console.error("❌ Error getting leaderboards:", error.message);
    }

    // Test 10: Check user draw history
    console.log("\n📊 Test 10: User Draw History");
    try {
        const history = await core.getUserDrawHistory(signer.address);
        console.log("User has participated in", history.length, "draws");
        console.log("Draw IDs:", history.map(id => id.toString()).join(", "));
    } catch (error: any) {
        console.error("❌ Error getting history:", error.message);
    }

    console.log("\n✅ Comprehensive test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });