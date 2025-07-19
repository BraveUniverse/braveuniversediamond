import { ethers } from "hardhat";

async function main() {
    console.log("Testing GridottoFacet Claim Functionality on LUKSO Testnet...\n");
    
    // Diamond address on testnet
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with deployer account:", deployer.address);
    
    // Get GridottoFacet instance
    const gridotto = await ethers.getContractAt("GridottoFacet", DIAMOND_ADDRESS);
    
    // Check initial pending prize
    console.log("\n=== Checking Pending Prizes ===");
    const pendingPrizeBefore = await gridotto.getPendingPrize(deployer.address);
    console.log("Pending prize before claim:", ethers.formatEther(pendingPrizeBefore), "LYX");
    
    if (pendingPrizeBefore > 0n) {
        // Get balance before claim
        const balanceBefore = await ethers.provider.getBalance(deployer.address);
        console.log("Balance before claim:", ethers.formatEther(balanceBefore), "LYX");
        
        // Claim prize
        console.log("\n=== Claiming Prize ===");
        try {
            const claimTx = await gridotto.claimPrize();
            const receipt = await claimTx.wait();
            console.log("✓ Prize claimed successfully!");
            console.log("Tx hash:", receipt.hash);
            console.log("Gas used:", receipt.gasUsed.toString());
            
            // Check for PrizeClaimed event
            const prizeClaimedEvent = receipt.logs.find(
                (log: any) => log.fragment?.name === "PrizeClaimed"
            );
            
            if (prizeClaimedEvent) {
                console.log("\nPrizeClaimed Event:");
                console.log("- Winner:", prizeClaimedEvent.args[0]);
                console.log("- Amount:", ethers.formatEther(prizeClaimedEvent.args[1]), "LYX");
            }
            
            // Get balance after claim
            const balanceAfter = await ethers.provider.getBalance(deployer.address);
            console.log("\nBalance after claim:", ethers.formatEther(balanceAfter), "LYX");
            
            // Calculate actual received (accounting for gas)
            const gasPrice = receipt.gasPrice || 0n;
            const gasCost = receipt.gasUsed * gasPrice;
            const netReceived = balanceAfter - balanceBefore + gasCost;
            console.log("Net amount received:", ethers.formatEther(netReceived), "LYX");
            console.log("Gas cost:", ethers.formatEther(gasCost), "LYX");
            
            // Check pending prize after claim
            const pendingPrizeAfter = await gridotto.getPendingPrize(deployer.address);
            console.log("\nPending prize after claim:", ethers.formatEther(pendingPrizeAfter), "LYX");
            
        } catch (error: any) {
            console.log("❌ Claim failed:", error.message);
        }
    } else {
        console.log("\nNo pending prize to claim. Let's buy tickets and do a draw first...");
        
        // Buy tickets
        console.log("\n=== Buying Tickets ===");
        const ticketPrice = ethers.parseEther("0.1");
        const buyTx = await gridotto.buyTicket(deployer.address, 10, {
            value: ticketPrice * 10n
        });
        await buyTx.wait();
        console.log("✓ Bought 10 tickets");
        
        // Get draw info
        const drawInfo = await gridotto.getCurrentDrawInfo();
        console.log("Total tickets sold:", drawInfo.ticketsSold.toString());
        console.log("Prize pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
        
        // Execute draw
        console.log("\n=== Executing Draw ===");
        try {
            const drawTx = await gridotto.manualDraw();
            const receipt = await drawTx.wait();
            console.log("✓ Draw executed!");
            
            // Find DrawCompleted event
            const drawCompletedEvent = receipt.logs.find(
                (log: any) => log.fragment?.name === "DrawCompleted"
            );
            
            if (drawCompletedEvent) {
                console.log("Winner:", drawCompletedEvent.args[1]);
                console.log("Prize Amount:", ethers.formatEther(drawCompletedEvent.args[2]), "LYX");
                
                // Now check pending prize again
                const pendingPrizeNow = await gridotto.getPendingPrize(deployer.address);
                console.log("\nPending prize now:", ethers.formatEther(pendingPrizeNow), "LYX");
                
                if (pendingPrizeNow > 0n) {
                    console.log("\n✅ You won! Run this script again to test the claim function.");
                } else {
                    console.log("\n❌ You didn't win this draw. Try again!");
                }
            }
        } catch (error: any) {
            console.log("Draw execution failed:", error.message);
        }
    }
    
    // Test claim with no prize (should fail)
    console.log("\n=== Testing Claim with No Prize ===");
    const finalPendingPrize = await gridotto.getPendingPrize(deployer.address);
    if (finalPendingPrize === 0n) {
        try {
            await gridotto.claimPrize();
            console.log("❌ This should have failed!");
        } catch (error: any) {
            console.log("✓ Correctly reverted:", error.message.includes("No prize to claim") ? "No prize to claim" : error.message);
        }
    }
    
    // Get monthly draw info
    console.log("\n=== Monthly Draw Info ===");
    const monthlyInfo = await gridotto.getMonthlyDrawInfo();
    console.log("Monthly Draw Number:", monthlyInfo.drawNumber.toString());
    console.log("Monthly Prize Pool:", ethers.formatEther(monthlyInfo.prizePool), "LYX");
    console.log("Monthly Draw Time:", new Date(Number(monthlyInfo.drawTime) * 1000).toLocaleString());
    
    console.log("\n✅ Claim test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });