import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🧪 Testing LSP7 and LSP8 Draws...\n");

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // Deploy mock tokens
    console.log("\n📦 Deploying mock tokens...");
    
    // Deploy LSP7 token
    const MockLSP7 = await ethers.getContractFactory("MockLSP7");
    const mockToken = await MockLSP7.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    const tokenAddress = await mockToken.getAddress();
    console.log("✅ Mock LSP7 deployed:", tokenAddress);

    // Deploy LSP8 NFT
    const MockLSP8 = await ethers.getContractFactory("MockLSP8");
    const mockNFT = await MockLSP8.deploy("Test NFT", "TNFT");
    await mockNFT.waitForDeployment();
    const nftAddress = await mockNFT.getAddress();
    console.log("✅ Mock LSP8 deployed:", nftAddress);

    // Mint NFTs
    const nftTokenIds = [
        ethers.keccak256(ethers.toUtf8Bytes("NFT1")),
        ethers.keccak256(ethers.toUtf8Bytes("NFT2")),
        ethers.keccak256(ethers.toUtf8Bytes("NFT3"))
    ];
    
    for (const tokenId of nftTokenIds) {
        await mockNFT.mint(signer.address, tokenId);
    }
    console.log("✅ Minted 3 NFTs");

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionFacet", DIAMOND_ADDRESS);

    // Test 1: LSP7 Token Draw
    console.log("\n📊 Test 1: LSP7 Token Draw");
    let tokenDrawId;
    try {
        // Approve diamond to spend tokens
        await mockToken.approve(DIAMOND_ADDRESS, ethers.parseEther("1000"));
        console.log("✅ Approved token spending");

        const ticketPrice = ethers.parseEther("10"); // 10 tokens per ticket
        const maxTickets = 10;
        const duration = 60; // 60 seconds
        const minParticipants = 1;
        const platformFeePercent = 500; // 5%
        const initialPrize = ethers.parseEther("100"); // 100 tokens initial prize

        const tx = await core.createTokenDraw(
            tokenAddress,
            ticketPrice,
            maxTickets,
            duration,
            minParticipants,
            platformFeePercent,
            initialPrize
        );
        
        const receipt = await tx.wait();
        console.log(`✅ Token draw created! Tx: ${tx.hash}`);
        
        // Extract drawId
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            tokenDrawId = parsed?.args.drawId;
            console.log(`Draw ID: ${tokenDrawId}`);
        }

        // Buy tickets
        console.log("\nBuying tickets with tokens...");
        await mockToken.approve(DIAMOND_ADDRESS, ethers.parseEther("50"));
        await core.buyTickets(tokenDrawId, 5);
        console.log("✅ Bought 5 tickets with tokens");

        // Check draw details
        const details = await core.getDrawDetails(tokenDrawId);
        console.log(`Prize pool: ${ethers.formatEther(details.prizePool)} tokens`);
        console.log(`Tickets sold: ${details.ticketsSold}`);

    } catch (error: any) {
        console.error("❌ Token draw test failed:", error.message);
    }

    // Test 2: LSP8 NFT Draw with ticket price
    console.log("\n📊 Test 2: LSP8 NFT Draw (with ticket price)");
    let nftDrawId;
    try {
        // Authorize diamond to transfer NFTs
        for (const tokenId of nftTokenIds.slice(0, 2)) {
            await mockNFT.authorizeOperator(DIAMOND_ADDRESS, tokenId);
        }
        console.log("✅ Authorized NFT transfers");

        const ticketPrice = ethers.parseEther("0.05"); // 0.05 LYX per ticket
        const maxTickets = 20;
        const duration = 60;
        const minParticipants = 2;
        const platformFeePercent = 1000; // 10%

        const tx = await core.createNFTDraw(
            nftAddress,
            nftTokenIds.slice(0, 2), // Use 2 NFTs as prizes
            ticketPrice,
            maxTickets,
            duration,
            minParticipants,
            platformFeePercent
        );
        
        const receipt = await tx.wait();
        console.log(`✅ NFT draw created! Tx: ${tx.hash}`);
        
        // Extract drawId
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            nftDrawId = parsed?.args.drawId;
            console.log(`Draw ID: ${nftDrawId}`);
        }

        // Buy tickets
        console.log("\nBuying tickets for NFT draw...");
        const ticketCost = await core.getTicketCost(nftDrawId, 10);
        await core.buyTickets(nftDrawId, 10, { value: ticketCost });
        console.log("✅ Bought 10 tickets for NFT draw");

        // Check draw details
        const details = await core.getDrawDetails(nftDrawId);
        console.log(`Revenue collected: ${ethers.formatEther(details.prizePool)} LYX`);
        console.log(`Tickets sold: ${details.ticketsSold}`);

    } catch (error: any) {
        console.error("❌ NFT draw test failed:", error.message);
    }

    // Wait for draws to end
    console.log("\n⏳ Waiting for draws to end...");
    await new Promise(resolve => setTimeout(resolve, 65000));

    // Execute token draw
    if (tokenDrawId) {
        console.log("\n📊 Executing token draw...");
        try {
            const tx = await execution.executeDraw(tokenDrawId);
            await tx.wait();
            console.log("✅ Token draw executed!");

            const [winners, amounts] = await execution.getDrawWinners(tokenDrawId);
            console.log(`Winner: ${winners[0]}`);
            console.log(`Prize: ${ethers.formatEther(amounts[0])} tokens`);

            // Claim prize
            const claimTx = await execution.claimPrize(tokenDrawId);
            await claimTx.wait();
            console.log("✅ Token prize claimed!");

        } catch (error: any) {
            console.error("❌ Token draw execution failed:", error.message);
        }
    }

    // Execute NFT draw
    if (nftDrawId) {
        console.log("\n📊 Executing NFT draw...");
        try {
            const balanceBefore = await ethers.provider.getBalance(signer.address);
            
            const tx = await execution.executeDraw(nftDrawId);
            await tx.wait();
            console.log("✅ NFT draw executed!");

            const [winners] = await execution.getDrawWinners(nftDrawId);
            console.log(`Winner: ${winners[0]}`);

            // Check creator revenue
            const details = await core.getDrawDetails(nftDrawId);
            const platformFee = (details.prizePool * BigInt(1000)) / BigInt(10000); // 10%
            const creatorRevenue = details.prizePool - platformFee;
            console.log(`\n💰 NFT Draw Revenue:`);
            console.log(`Total ticket sales: ${ethers.formatEther(details.prizePool)} LYX`);
            console.log(`Platform fee (10%): ${ethers.formatEther(platformFee)} LYX`);
            console.log(`Creator revenue: ${ethers.formatEther(creatorRevenue)} LYX`);

            // Claim NFT
            const claimTx = await execution.claimPrize(nftDrawId);
            await claimTx.wait();
            console.log("✅ NFT prize claimed!");

            // Check NFT ownership
            const nftOwner = await mockNFT.tokenOwnerOf(nftTokenIds[0]);
            console.log(`NFT now owned by: ${nftOwner}`);

            // Check creator balance increase
            const balanceAfter = await ethers.provider.getBalance(signer.address);
            console.log(`Creator balance increased by: ${ethers.formatEther(balanceAfter - balanceBefore)} LYX`);

        } catch (error: any) {
            console.error("❌ NFT draw execution failed:", error.message);
        }
    }

    console.log("\n✅ All tests completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });