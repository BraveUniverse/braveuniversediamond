import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🔍 Debugging LSP7/LSP8 Issues...\n");

    const [signer] = await ethers.getSigners();
    console.log("Account:", signer.address);

    // Get contract instances
    const core = await ethers.getContractAt("GridottoCoreFacet", DIAMOND_ADDRESS);

    // Check draw 3 details
    console.log("\n📊 Checking Draw 3 (NFT Draw):");
    try {
        const details = await core.getDrawDetails(3);
        console.log("Creator:", details.creator);
        console.log("Draw type:", details.drawType);
        console.log("Ticket price:", ethers.formatEther(details.ticketPrice), "LYX");
        console.log("Max tickets:", details.maxTickets.toString());
        console.log("Tickets sold:", details.ticketsSold.toString());
        console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
        console.log("Start time:", new Date(Number(details.startTime) * 1000).toLocaleString());
        console.log("End time:", new Date(Number(details.endTime) * 1000).toLocaleString());
        console.log("Min participants:", details.minParticipants.toString());
        console.log("Platform fee:", details.platformFeePercent.toString());
        console.log("Is completed:", details.isCompleted);
        console.log("Is cancelled:", details.isCancelled);
        console.log("Participants:", details.participantCount.toString());
        
        // Check my tickets
        const myTickets = await core.getUserTickets(3, signer.address);
        console.log("\nMy tickets:", myTickets.toString());
        
    } catch (error: any) {
        console.error("Error:", error.message);
    }

    // Test buying tickets again
    console.log("\n📊 Testing ticket purchase:");
    try {
        const ticketCost = await core.getTicketCost(3, 1);
        console.log("Cost for 1 ticket:", ethers.formatEther(ticketCost), "LYX");
        
        const tx = await core.buyTickets(3, 1, { value: ticketCost });
        await tx.wait();
        console.log("✅ Bought 1 ticket");
        
        // Check details again
        const details = await core.getDrawDetails(3);
        console.log("Tickets sold now:", details.ticketsSold.toString());
        console.log("Prize pool now:", ethers.formatEther(details.prizePool), "LYX");
        console.log("Participants now:", details.participantCount.toString());
        
    } catch (error: any) {
        console.error("Error buying ticket:", error.message);
    }

    // Check LSP7 token issue
    console.log("\n📊 Testing LSP7 token transfer:");
    try {
        const MockLSP7 = await ethers.getContractFactory("MockLSP7");
        const mockToken = await MockLSP7.deploy("Test Token 2", "TEST2", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        const tokenAddress = await mockToken.getAddress();
        console.log("New token deployed:", tokenAddress);
        
        // Try direct transfer
        await mockToken.transfer(signer.address, DIAMOND_ADDRESS, ethers.parseEther("10"), true, "0x");
        console.log("✅ Direct transfer worked");
        
        // Check balance
        const balance = await mockToken.balanceOf(DIAMOND_ADDRESS);
        console.log("Diamond balance:", ethers.formatEther(balance), "tokens");
        
    } catch (error: any) {
        console.error("Error with token:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });