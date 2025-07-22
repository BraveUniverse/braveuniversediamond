import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Creating Test Draws for Leaderboard...\n");
    
    const diamondAddress = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get signers (we'll use multiple accounts)
    const signers = await ethers.getSigners();
    const creator1 = signers[0];
    
    // Use the same account for simplicity in testing
    const creator2 = creator1;
    const buyer1 = creator1;
    const buyer2 = creator1;
    const buyer3 = creator1;
    
    console.log("Using account:", creator1.address);
    console.log("(Same account will act as different roles for testing)");
    
    // Get contract
    const gridotto = await ethers.getContractAt("GridottoMissingFacet", diamondAddress);
    
    try {
        // Create 3 test draws with different creators
        const draws = [];
        
        for (let i = 0; i < 3; i++) {
            const creator = i % 2 === 0 ? creator1 : creator2;
            
            console.log(`\n📝 Creating Draw ${i + 1} with ${creator.address}...`);
            
            // Draw parameters - 1 hour duration (minimum)
            const drawType = 0; // USER_LYX
            const ticketPrice = ethers.parseEther("0.01"); // 0.01 LYX per ticket
            const maxTickets = 50;
            const duration = 3600; // 1 hour (minimum allowed)
            const participationRequirement = 0; // NONE
            const requiredToken = ethers.ZeroAddress;
            const minTokenAmount = 0;
            
            const prizeConfig = {
                model: 0, // PERCENTAGE
                creatorContribution: 0,
                addParticipationFees: true,
                participationFeePercent: 8000, // 80% to prize pool
                totalWinners: 1, // Single winner
                prizePercentages: [10000], // 100% to winner
                minParticipants: 2,
                gracePeriod: 30 // 30 seconds grace
            };
            
            const nftIds: any[] = [];
            
            const tx = await gridotto.connect(creator).createUserDraw(
                drawType,
                ticketPrice,
                maxTickets,
                duration,
                prizeConfig,
                participationRequirement,
                requiredToken,
                minTokenAmount,
                nftIds,
                { value: 0 }
            );
            
            const receipt = await tx.wait();
            
            // Find draw ID from event
            const drawCreatedEvent = receipt.logs.find(
                (log: any) => log.topics[0] === ethers.id("DrawCreated(uint256,address,uint8)")
            );
            
            if (drawCreatedEvent) {
                const drawId = parseInt(drawCreatedEvent.topics[1], 16);
                draws.push(drawId);
                console.log(`✅ Draw ${drawId} created successfully!`);
            }
        }
        
        // Buy tickets from different accounts
        console.log("\n🎫 Buying tickets...");
        
        if (draws.length > 0) {
            // Draw 1: Multiple buyers
            const drawId1 = draws[0];
            console.log(`\nDraw ${drawId1}:`);
            
            // Buyer 1 buys 5 tickets
            console.log("Buyer 1 buying 5 tickets...");
            await gridotto.connect(buyer1).buyUserDrawTicket(drawId1, 5, {
                value: ethers.parseEther("0.05")
            });
            
            // Buyer 2 buys 3 tickets
            console.log("Buyer 2 buying 3 tickets...");
            await gridotto.connect(buyer2).buyUserDrawTicket(drawId1, 3, {
                value: ethers.parseEther("0.03")
            });
            
            // Buyer 3 buys 2 tickets
            console.log("Buyer 3 buying 2 tickets...");
            await gridotto.connect(buyer3).buyUserDrawTicket(drawId1, 2, {
                value: ethers.parseEther("0.02")
            });
        }
        
        if (draws.length > 1) {
            // Draw 2: Different buyers
            const drawId2 = draws[1];
            console.log(`\nDraw ${drawId2}:`);
            
            // Buyer 2 buys 10 tickets
            console.log("Buyer 2 buying 10 tickets...");
            await gridotto.connect(buyer2).buyUserDrawTicket(drawId2, 10, {
                value: ethers.parseEther("0.10")
            });
            
            // Buyer 1 buys 1 ticket
            console.log("Buyer 1 buying 1 ticket...");
            await gridotto.connect(buyer1).buyUserDrawTicket(drawId2, 1, {
                value: ethers.parseEther("0.01")
            });
        }
        
        if (draws.length > 2) {
            // Draw 3: Single buyer dominates
            const drawId3 = draws[2];
            console.log(`\nDraw ${drawId3}:`);
            
            // Buyer 3 buys 20 tickets
            console.log("Buyer 3 buying 20 tickets...");
            await gridotto.connect(buyer3).buyUserDrawTicket(drawId3, 20, {
                value: ethers.parseEther("0.20")
            });
            
            // Buyer 1 buys 2 tickets
            console.log("Buyer 1 buying 2 tickets...");
            await gridotto.connect(buyer1).buyUserDrawTicket(drawId3, 2, {
                value: ethers.parseEther("0.02")
            });
        }
        
        console.log("\n⏰ Skipping wait - draws will end in 1 hour");
        console.log("For testing, we'll try to execute anyway...");
        
        // Execute draws
        console.log("\n🎯 Executing draws...");
        const executionContract = await ethers.getContractAt("GridottoExecutionFacet", diamondAddress);
        
        for (const drawId of draws) {
            try {
                console.log(`\nExecuting draw ${drawId}...`);
                const tx = await executionContract.connect(buyer3).executeUserDraw(drawId);
                await tx.wait();
                console.log(`✅ Draw ${drawId} executed!`);
            } catch (e: any) {
                console.log(`❌ Failed to execute draw ${drawId}: ${e.message}`);
            }
        }
        
        console.log("\n📊 Test draws created and executed!");
        console.log("You can now test the leaderboard functions.");
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);