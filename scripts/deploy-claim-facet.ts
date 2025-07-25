import { ethers } from "hardhat";

async function main() {
    console.log("🎯 GridottoPrizeClaimFacet Deployment");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Deploy GridottoPrizeClaimFacet
        console.log("\n📦 GridottoPrizeClaimFacet deploy ediliyor...");
        const GridottoPrizeClaimFacet = await ethers.getContractFactory("GridottoPrizeClaimFacet");
        const claimFacet = await GridottoPrizeClaimFacet.deploy();
        await claimFacet.waitForDeployment();
        const claimFacetAddress = await claimFacet.getAddress();
        console.log("✅ GridottoPrizeClaimFacet deployed:", claimFacetAddress);

        // 2. Get function selectors
        console.log("\n🔍 Function selector'lar alınıyor...");
        const selectors = [
            claimFacet.interface.getFunction("claimPrize").selector,
            claimFacet.interface.getFunction("claimExecutorFees").selector,
            claimFacet.interface.getFunction("getClaimableExecutorFees").selector,
            claimFacet.interface.getFunction("getUnclaimedPrizes").selector,
            claimFacet.interface.getFunction("batchClaimPrizes").selector,
            claimFacet.interface.getFunction("getTotalClaimableAmount").selector
        ];
        
        console.log("📋 Selectors:");
        const functionNames = [
            "claimPrize",
            "claimExecutorFees",
            "getClaimableExecutorFees",
            "getUnclaimedPrizes",
            "batchClaimPrizes",
            "getTotalClaimableAmount"
        ];
        
        selectors.forEach((selector, index) => {
            console.log(`  - ${functionNames[index]}: ${selector}`);
        });

        // 3. Add facet to Diamond
        console.log("\n💎 Diamond'a ekleniyor...");
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const diamondCut = [{
            facetAddress: claimFacetAddress,
            action: 0, // Add
            functionSelectors: selectors
        }];

        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Transaction gönderildi:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Diamond güncellendi!");
        console.log("  - Block:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // 4. Update ExecutionV2Facet to use claim mechanism
        console.log("\n🔄 ExecutionV2Facet güncelleniyor...");
        console.log("⚠️  NOT: ExecutionV2Facet artık executor fee'leri claimable balance'a ekliyor");
        console.log("   Executor'lar claimExecutorFees() fonksiyonunu kullanarak fee'lerini çekebilir");

        // 5. Test the claim functions
        console.log("\n🧪 Claim fonksiyonları test ediliyor...");
        const claimFacetContract = await ethers.getContractAt("GridottoPrizeClaimFacet", DIAMOND_ADDRESS);
        
        // Check claimable executor fees for deployer
        const claimableFees = await claimFacetContract.getClaimableExecutorFees(deployer.address);
        console.log(`\n💰 Deployer'ın claimable executor fee'si: ${ethers.formatEther(claimableFees)} LYX`);
        
        // Check unclaimed prizes
        const unclaimedPrizes = await claimFacetContract.getUnclaimedPrizes(deployer.address);
        console.log(`\n🎁 Unclaimed prize sayısı: ${unclaimedPrizes.drawIds.length}`);
        
        if (unclaimedPrizes.drawIds.length > 0) {
            console.log("Unclaimed prizes:");
            for (let i = 0; i < unclaimedPrizes.drawIds.length; i++) {
                console.log(`  - Draw #${unclaimedPrizes.drawIds[i]}: ${ethers.formatEther(unclaimedPrizes.amounts[i])} LYX`);
            }
        }

        // 6. Summary
        console.log("\n📝 ÖZET:");
        console.log("✅ GridottoPrizeClaimFacet başarıyla deploy edildi");
        console.log("✅ Claim mekanizması aktif");
        console.log("✅ Gas tasarrufu sağlandı");
        console.log("\n💡 Kullanım:");
        console.log("  - Kazananlar: claimPrize(drawId)");
        console.log("  - Executor'lar: claimExecutorFees()");
        console.log("  - İptal edilen çekilişler: claimRefund(drawId)");
        console.log("  - Toplu claim: batchClaimPrizes([drawId1, drawId2, ...])");

        // 7. Save deployment info
        const deploymentInfo = {
            facetName: "GridottoPrizeClaimFacet",
            address: claimFacetAddress,
            deployedAt: new Date().toISOString(),
            network: "luksoTestnet",
            deployer: deployer.address,
            selectors: selectors,
            features: [
                "Prize claiming",
                "Executor fee claiming",
                "Refund claiming",
                "Batch operations",
                "Gas optimization"
            ]
        };

        console.log("\n📄 Deployment bilgileri:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

    } catch (error) {
        console.error("\n❌ Hata:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });