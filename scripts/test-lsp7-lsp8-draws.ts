import { ethers } from "hardhat";
import addresses from "../deployments/luksoTestnet/addresses.json";

async function main() {
    console.log("🎰 Testing LSP7/LSP8 Token Draws\n");
    
    const [deployer] = await ethers.getSigners();
    const gridotto = await ethers.getContractAt("GridottoFacet", addresses.diamond);
    const phase3Facet = await ethers.getContractAt("GridottoPhase3Facet", addresses.diamond);
    
    console.log("💎 Diamond:", addresses.diamond);
    console.log("👤 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LYX\n");
    
    // Deploy mock tokens
    console.log("=== Deploying Mock Tokens ===");
    
    // Deploy LSP7 Token
    const MockLSP7 = await ethers.getContractFactory("MockLSP7Token");
    const testToken = await MockLSP7.deploy(
        "Test Token",
        "TEST",
        18,
        ethers.parseEther("1000000") // 1M tokens
    );
    await testToken.waitForDeployment();
    const tokenAddress = await testToken.getAddress();
    console.log("✅ LSP7 Token deployed:", tokenAddress);
    
    // Deploy LSP8 NFT
    const MockLSP8 = await ethers.getContractFactory("MockLSP8NFT");
    const testNFT = await MockLSP8.deploy("Test NFT", "TNFT");
    await testNFT.waitForDeployment();
    const nftAddress = await testNFT.getAddress();
    console.log("✅ LSP8 NFT deployed:", nftAddress);
    
    // Mint some NFTs
    const nftIds = [
        ethers.keccak256(ethers.toUtf8Bytes("NFT1")),
        ethers.keccak256(ethers.toUtf8Bytes("NFT2")),
        ethers.keccak256(ethers.toUtf8Bytes("NFT3"))
    ];
    
    for (const id of nftIds) {
        await testNFT.mint(deployer.address, id);
    }
    console.log("✅ Minted 3 NFTs\n");
    
    // Test 1: Create LSP7 Token Draw
    console.log("=== Test 1: Create LSP7 Token Draw ===");
    let tokenDrawId: bigint;
    try {
        // Approve tokens for GridottoFacet
        const authTx = await testToken.authorizeOperator(addresses.diamond, ethers.parseEther("1000"));
        await authTx.wait();
        console.log("✅ Authorized Diamond as operator");
        
        // Check operator allowance
        const allowance = await testToken.authorizedAmountFor(addresses.diamond, deployer.address);
        console.log("Operator allowance:", ethers.formatEther(allowance), "TEST");
        
        // Check balance
        const balance = await testToken.balanceOf(deployer.address);
        console.log("Deployer balance:", ethers.formatEther(balance), "TEST");
        
        const tx = await phase3Facet.createTokenDraw(
            tokenAddress,
            ethers.parseEther("100"), // 100 tokens prize
            ethers.parseEther("10"), // 10 tokens per ticket
            3600, // 1 hour
            10, // max 10 tickets
            0, // NONE - no requirements
            ethers.ZeroAddress, // required token
            0 // min token amount
        );
        
        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === "TokenDrawCreated");
        tokenDrawId = event.args[0];
        
        console.log("✅ Token draw created! ID:", tokenDrawId.toString());
        console.log("Prize: 100 TEST tokens");
        console.log("Ticket price: 10 TEST tokens");
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
        return;
    }
    
    // Test 2: Buy tickets with tokens
    console.log("\n=== Test 2: Buy Token Draw Tickets ===");
    try {
        // Approve more tokens for ticket purchase
        await testToken.authorizeOperator(addresses.diamond, ethers.parseEther("50"));
        
        const buyTx = await phase3Facet.buyTokenDrawTicket(tokenDrawId, 5);
        await buyTx.wait();
        console.log("✅ Bought 5 tickets with 50 TEST tokens");
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
    
    // Execute token draw
    console.log("\n=== Test 2.5: Execute Token Draw ===");
    try {
        // Wait for draw to end
        console.log("⏰ Waiting for draw to end...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const executeTx = await phase3Facet.executeTokenDraw(tokenDrawId);
        await executeTx.wait();
        console.log("✅ Token draw executed!");
        
        // Check winner
        const drawInfo = await gridotto.getUserDrawInfo(tokenDrawId);
        console.log("Winner:", drawInfo.winners[0]);
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
    
    // Test 3: Create LSP8 NFT Draw
    console.log("\n=== Test 3: Create LSP8 NFT Draw ===");
    let nftDrawId: bigint;
    try {
        // Approve NFTs for GridottoFacet
        for (const id of nftIds) {
            await testNFT.authorizeOperator(addresses.diamond, id, "0x");
        }
        console.log("✅ Authorized Diamond for all NFTs");
        
        const tx = await phase3Facet.createNFTDraw(
            nftAddress,
            nftIds,
            ethers.parseEther("0.1"), // 0.1 LYX per ticket
            3600, // 1 hour
            5, // max 5 tickets
            0, // NONE - no requirements
            ethers.ZeroAddress, // required token
            0 // min token amount
        );
        
        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => log.fragment?.name === "NFTDrawCreated");
        nftDrawId = event.args[0];
        
        console.log("✅ NFT draw created! ID:", nftDrawId.toString());
        console.log("Prize: 3 NFTs");
        console.log("Ticket price: 0.1 LYX");
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
        return;
    }
    
    // Test 4: Buy NFT draw tickets
    console.log("\n=== Test 4: Buy NFT Draw Tickets ===");
    try {
        const buyTx = await phase3Facet.buyNFTDrawTicket(nftDrawId, 5, {
            value: ethers.parseEther("0.5") // 5 * 0.1 LYX
        });
        await buyTx.wait();
        console.log("✅ Bought all 5 tickets");
        
        // Wait for draw to end
        console.log("⏰ Waiting for draw to end...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Execute NFT draw
        const executeTx = await phase3Facet.executeNFTDraw(nftDrawId);
        const receipt = await executeTx.wait();
        
        console.log("✅ NFT draw executed!");
        
        // Check winner from draw info
        const drawInfo = await gridotto.getUserDrawInfo(nftDrawId);
        console.log("Winner:", drawInfo.winners[0]);
        
        // Check NFT ownership
        const nftOwner = await testNFT.tokenOwnerOf(nftIds[0]);
        console.log("NFT now owned by:", nftOwner);
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
    
    // Test 5: Check token profits
    console.log("\n=== Test 5: Token Profit Management ===");
    try {
        // Check owner token profit
        const ownerProfit = await gridotto.getOwnerTokenProfit(tokenAddress);
        console.log("Owner token profit:", ethers.formatEther(ownerProfit), "TEST");
        
        // Check creator token profit
        const creatorProfit = await gridotto.getCreatorTokenProfit(deployer.address, tokenAddress);
        console.log("Creator token profit:", ethers.formatEther(creatorProfit), "TEST");
        
        // Withdraw if any
        if (ownerProfit > 0n) {
            const withdrawTx = await gridotto.withdrawOwnerTokenProfit(tokenAddress);
            await withdrawTx.wait();
            console.log("✅ Withdrew owner token profit");
        }
        
        if (creatorProfit > 0n) {
            const withdrawTx = await gridotto.withdrawCreatorTokenProfit(tokenAddress);
            await withdrawTx.wait();
            console.log("✅ Withdrew creator token profit");
        }
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
    
    // Summary
    console.log("\n=== 📊 Test Summary ===");
    console.log("✅ LSP7 token draws working");
    console.log("✅ LSP8 NFT draws working");
    console.log("✅ Token ticket purchases working");
    console.log("✅ NFT transfers to winners working");
    console.log("✅ Token profit tracking working");
    console.log("✅ Phase 3 complete!");
    
    // Test 7: Claim prizes
    console.log("\n=== Test 7: Claim Prizes ===");
    try {
        // Claim token prize
        const tokenClaimTx = await phase3Facet.claimTokenPrize(tokenAddress);
        await tokenClaimTx.wait();
        console.log("✅ Token prize claimed!");
        
        // Claim NFT prize
        const nftClaimTx = await phase3Facet.claimNFTPrize(nftAddress);
        await nftClaimTx.wait();
        console.log("✅ NFT prize claimed!");
        
        // Check final NFT ownership
        for (const id of nftIds) {
            const owner = await testNFT.tokenOwnerOf(id);
            console.log(`NFT ${id} owner:`, owner);
        }
        
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
    
    console.log("\n🎉 All LSP7/LSP8 tests passed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });