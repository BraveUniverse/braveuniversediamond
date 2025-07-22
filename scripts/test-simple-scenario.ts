import { ethers } from "hardhat";

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

async function main() {
    console.log("🧪 Simple Functionality Test\n");

    const [signer] = await ethers.getSigners();
    console.log("Account:", signer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "LYX\n");

    // Get contracts
    const core = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    const platform = await ethers.getContractAt("GridottoPlatformDrawsFacet", DIAMOND_ADDRESS);
    const execution = await ethers.getContractAt("GridottoExecutionV2Facet", DIAMOND_ADDRESS);
    const refund = await ethers.getContractAt("GridottoRefundFacet", DIAMOND_ADDRESS);
    const admin = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);

    // Test 1: Create minimal draw
    console.log("📌 Test 1: Create Minimal Draw");
    let drawId;
    try {
        const tx = await core.createLYXDraw(
            ethers.parseEther("0.0001"), // Very small ticket price
            10,
            60, // 1 minute
            1,  // Only 1 participant needed
            500,
            { value: ethers.parseEther("0.001") } // Small initial prize
        );
        const receipt = await tx.wait();
        console.log("✅ Draw created!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Extract drawId
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === "DrawCreated";
            } catch { return false; }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            drawId = parsed?.args.drawId;
            console.log("Draw ID:", drawId?.toString());
        }
    } catch (error: any) {
        console.error("❌ Error:", error.message);
        return;
    }

    // Test 2: Check draw details
    if (drawId) {
        console.log("\n📌 Test 2: Check Draw Details");
        try {
            const details = await core.getDrawDetails(drawId);
            console.log("Creator:", details.creator);
            console.log("Ticket price:", ethers.formatEther(details.ticketPrice), "LYX");
            console.log("Max tickets:", details.maxTickets.toString());
            console.log("Prize pool:", ethers.formatEther(details.prizePool), "LYX");
            console.log("Participants:", details.participantCount.toString());
            console.log("Tickets sold:", details.ticketsSold.toString());
            console.log("Is completed:", details.isCompleted);
            console.log("Is cancelled:", details.isCancelled);
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }

        // Test 3: Buy tickets
        console.log("\n📌 Test 3: Buy Tickets");
        try {
            const ticketAmount = 3;
            const ticketCost = ethers.parseEther("0.0001") * BigInt(ticketAmount);
            
            const tx = await core.buyTickets(drawId, ticketAmount, { value: ticketCost });
            const receipt = await tx.wait();
            console.log("✅ Bought", ticketAmount, "tickets!");
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Check updated details
            const details = await core.getDrawDetails(drawId);
            console.log("Updated tickets sold:", details.ticketsSold.toString());
            console.log("Updated prize pool:", ethers.formatEther(details.prizePool), "LYX");
            console.log("Monthly contribution:", ethers.formatEther(details.monthlyPoolContribution), "LYX");
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }

        // Test 4: Check monthly tickets
        console.log("\n📌 Test 4: Monthly Tickets");
        try {
            const monthlyTickets = await platform.getUserMonthlyTickets(signer.address);
            console.log("From weekly:", monthlyTickets.fromWeekly.toString());
            console.log("From creating:", monthlyTickets.fromCreating.toString());
            console.log("From participating:", monthlyTickets.fromParticipating.toString());
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }

        // Test 5: Cancel draw
        console.log("\n📌 Test 5: Cancel Draw");
        console.log("Waiting 65 seconds for draw to expire...");
        await new Promise(resolve => setTimeout(resolve, 65000));
        
        try {
            const tx = await core.cancelDraw(drawId);
            await tx.wait();
            console.log("✅ Draw cancelled!");
            
            // Check refund
            const refundAmount = await refund.getRefundAmount(drawId, signer.address);
            console.log("Refund available:", ethers.formatEther(refundAmount), "LYX");
            
            if (refundAmount > 0n) {
                const claimTx = await refund.claimRefund(drawId);
                await claimTx.wait();
                console.log("✅ Refund claimed!");
            }
        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }
    }

    // Test 6: Check owner
    console.log("\n📌 Test 6: Admin Check");
    try {
        // Try different function names
        let owner;
        try {
            owner = await admin.getOwner();
        } catch {
            try {
                owner = await admin.contractOwner();
            } catch {
                const ownership = await ethers.getContractAt("OwnershipFacet", DIAMOND_ADDRESS);
                owner = await ownership.owner();
            }
        }
        console.log("Contract owner:", owner);
        console.log("Is signer owner?", owner.toLowerCase() === signer.address.toLowerCase());
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }

    console.log("\n✅ Simple test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });