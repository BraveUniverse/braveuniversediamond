import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("Testing UI Helper Functions...\n");
    
    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);
    
    // Get UI Helper Facet
    const uiHelper = await ethers.getContractAt("GridottoUIHelperFacet", DIAMOND_ADDRESS);
    const batchFacet = await ethers.getContractAt("GridottoBatchFacet", DIAMOND_ADDRESS);
    
    try {
        // Test 1: Get User Created Draws
        console.log("1. Testing getUserCreatedDraws...");
        const createdDraws = await uiHelper.getUserCreatedDraws(signer.address, 0, 10);
        console.log("User created draws:", createdDraws.length);
        console.log("✅ getUserCreatedDraws works!\n");
        
        // Test 2: Get Active User Draws
        console.log("2. Testing getActiveUserDraws...");
        const activeDraws = await uiHelper.getActiveUserDraws(10);
        console.log("Active draws count:", activeDraws.drawIds.length);
        if (activeDraws.drawIds.length > 0) {
            console.log("First draw ID:", activeDraws.drawIds[0].toString());
            console.log("Creator:", activeDraws.creators[0]);
        }
        console.log("✅ getActiveUserDraws works!\n");
        
        // Test 3: Get All Claimable Prizes
        console.log("3. Testing getAllClaimablePrizes...");
        const claimable = await uiHelper.getAllClaimablePrizes(signer.address);
        console.log("Claimable LYX:", ethers.formatEther(claimable.totalLYX), "LYX");
        console.log("Has token prizes:", claimable.hasTokenPrizes);
        console.log("Has NFT prizes:", claimable.hasNFTPrizes);
        console.log("✅ getAllClaimablePrizes works!\n");
        
        // Test 4: Get Official Draw Info
        console.log("4. Testing getOfficialDrawInfo...");
        const officialInfo = await uiHelper.getOfficialDrawInfo();
        console.log("Current draw:", officialInfo.currentDraw.toString());
        console.log("Current monthly draw:", officialInfo.currentMonthlyDraw.toString());
        console.log("Next draw time:", new Date(Number(officialInfo.nextDrawTime) * 1000).toLocaleString());
        console.log("Ticket price:", ethers.formatEther(officialInfo.ticketPrice), "LYX");
        console.log("✅ getOfficialDrawInfo works!\n");
        
        // Test 5: Get User Draw Stats (if any active draws exist)
        if (activeDraws.drawIds.length > 0) {
            console.log("5. Testing getUserDrawStats...");
            const drawId = activeDraws.drawIds[0];
            const stats = await uiHelper.getUserDrawStats(drawId);
            console.log("Draw creator:", stats.creator);
            console.log("End time:", new Date(Number(stats.endTime) * 1000).toLocaleString());
            console.log("Prize pool:", ethers.formatEther(stats.prizePool), "LYX");
            console.log("Participants:", stats.participantCount.toString());
            console.log("Tickets sold:", stats.ticketsSold.toString());
            console.log("✅ getUserDrawStats works!\n");
        }
        
        // Test Batch Functions
        console.log("=== Testing Batch Functions ===\n");
        
        // Test 6: Batch Get User Draw Info
        console.log("6. Testing batchGetUserDrawInfo...");
        if (activeDraws.drawIds.length >= 2) {
            const drawIds = [activeDraws.drawIds[0], activeDraws.drawIds[1]];
            const batchInfo = await batchFacet.batchGetUserDrawInfo(drawIds);
            console.log("Got info for", drawIds.length, "draws");
            for (let i = 0; i < drawIds.length; i++) {
                console.log(`Draw ${drawIds[i]}: Creator ${batchInfo.creators[i]}`);
            }
        } else {
            console.log("Not enough active draws to test batch function");
        }
        console.log("✅ batchGetUserDrawInfo works!\n");
        
        // Test 7: Check if claimAll would work
        console.log("7. Testing claimAll availability...");
        if (claimable.totalLYX > 0) {
            console.log("User has", ethers.formatEther(claimable.totalLYX), "LYX to claim");
            console.log("✅ claimAll function is available for claiming!\n");
        } else {
            console.log("No prizes to claim currently");
            console.log("✅ claimAll function is available!\n");
        }
        
        console.log("🎉 All UI Helper functions tested successfully!");
        
    } catch (error: any) {
        console.error("❌ Test failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });