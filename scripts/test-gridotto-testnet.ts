import { ethers } from "hardhat";
import { Wallet } from "ethers";

async function main() {
    console.log("Testing GridottoFacet on LUKSO Testnet...\n");
    
    // Diamond address on testnet
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get provider
    const provider = new ethers.JsonRpcProvider(process.env.LUKSO_TESTNET_RPC_URL);
    
    // Setup test accounts
    const account1 = new Wallet(process.env.PRIVATE_KEY_1!, provider);
    const account2 = new Wallet(process.env.PRIVATE_KEY_2!, provider);
    const account3 = new Wallet(process.env.PRIVATE_KEY_3!, provider);
    
    console.log("Test Accounts:");
    console.log("Account 1:", account1.address);
    console.log("Account 2:", account2.address);
    console.log("Account 3:", account3.address);
    
    // Get GridottoFacet instance
    const gridotto = await ethers.getContractAt("GridottoFacet", DIAMOND_ADDRESS);
    
    // Get initial state
    console.log("\n=== Initial State ===");
    const ticketPrice = await gridotto.getTicketPrice();
    let drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("Ticket Price:", ethers.formatEther(ticketPrice), "LYX");
    console.log("Current Draw Number:", drawInfo.drawNumber.toString());
    console.log("Current Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    console.log("Next Draw Time:", new Date(Number(drawInfo.drawTime) * 1000).toLocaleString());
    
    // Test 1: Buy tickets from Account 1
    console.log("\n=== Test 1: Account 1 buying 5 tickets ===");
    const gridottoAccount1 = gridotto.connect(account1);
    const buyTx1 = await gridottoAccount1.buyTicket(account1.address, 5, {
        value: ticketPrice * 5n
    });
    await buyTx1.wait();
    console.log("✓ Account 1 bought 5 tickets");
    
    // Check ticket count
    const tickets1 = await gridotto.getUserTicketCount(account1.address);
    console.log("Account 1 tickets:", tickets1.toString());
    
    // Test 2: Buy tickets from Account 2
    console.log("\n=== Test 2: Account 2 buying 3 tickets ===");
    const gridottoAccount2 = gridotto.connect(account2);
    const buyTx2 = await gridottoAccount2.buyTicket(account2.address, 3, {
        value: ticketPrice * 3n
    });
    await buyTx2.wait();
    console.log("✓ Account 2 bought 3 tickets");
    
    // Test 3: Buy tickets for others
    console.log("\n=== Test 3: Account 3 buying tickets for Account 1 and 2 ===");
    const gridottoAccount3 = gridotto.connect(account3);
    const buyTx3 = await gridottoAccount3.buyTicketsForSelected(
        [account1.address, account2.address],
        { value: ticketPrice * 2n }
    );
    await buyTx3.wait();
    console.log("✓ Account 3 bought tickets for others");
    
    // Check updated state
    console.log("\n=== Updated State ===");
    drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("Total Tickets Sold:", drawInfo.ticketsSold.toString());
    console.log("Updated Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    
    // Get all participants
    console.log("\n=== Participants ===");
    const participants = await gridotto.getDrawParticipants();
    console.log("Total Participants:", participants.length);
    for (let i = 0; i < participants.length; i++) {
        const ticketCount = await gridotto.getUserTicketCount(participants[i]);
        console.log(`${participants[i]}: ${ticketCount} tickets`);
    }
    
    // Test manual draw execution (only owner can do this)
    console.log("\n=== Test Manual Draw Execution ===");
    try {
        console.log("Attempting manual draw...");
        const [deployer] = await ethers.getSigners();
        const gridottoOwner = gridotto.connect(deployer);
        const drawTx = await gridottoOwner.manualDraw();
        const receipt = await drawTx.wait();
        
        // Find DrawCompleted event
        const drawCompletedEvent = receipt.logs.find(
            log => log.topics[0] === ethers.id("DrawCompleted(uint256,address,uint256)")
        );
        
        if (drawCompletedEvent) {
            console.log("✓ Draw executed successfully!");
            console.log("Winner:", drawCompletedEvent.topics[2]);
            console.log("Prize Amount:", ethers.formatEther(drawCompletedEvent.data));
        }
        
        // Check if winners can claim
        console.log("\n=== Checking Claimable Prizes ===");
        const prize1 = await gridotto.getPendingPrize(account1.address);
        const prize2 = await gridotto.getPendingPrize(account2.address);
        const prize3 = await gridotto.getPendingPrize(account3.address);
        
        console.log("Account 1 pending prize:", ethers.formatEther(prize1), "LYX");
        console.log("Account 2 pending prize:", ethers.formatEther(prize2), "LYX");
        console.log("Account 3 pending prize:", ethers.formatEther(prize3), "LYX");
        
        // Claim prize if any
        if (prize1 > 0n) {
            console.log("\nAccount 1 claiming prize...");
            const claimTx = await gridottoAccount1.claimPrize();
            await claimTx.wait();
            console.log("✓ Prize claimed!");
        }
        if (prize2 > 0n) {
            console.log("\nAccount 2 claiming prize...");
            const claimTx = await gridottoAccount2.claimPrize();
            await claimTx.wait();
            console.log("✓ Prize claimed!");
        }
        if (prize3 > 0n) {
            console.log("\nAccount 3 claiming prize...");
            const claimTx = await gridottoAccount3.claimPrize();
            await claimTx.wait();
            console.log("✓ Prize claimed!");
        }
        
    } catch (error: any) {
        console.log("Manual draw failed:", error.message);
        console.log("This is expected if not enough time has passed or not the owner");
    }
    
    // Final state
    console.log("\n=== Final State ===");
    drawInfo = await gridotto.getCurrentDrawInfo();
    console.log("New Draw Number:", drawInfo.drawNumber.toString());
    console.log("New Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    console.log("Next Draw Time:", new Date(Number(drawInfo.drawTime) * 1000).toLocaleString());
    
    console.log("\n✅ All tests completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });