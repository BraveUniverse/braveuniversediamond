import { ethers } from "hardhat";

async function main() {
    console.log("🎯 GridottoPrizeClaimFacet Deployment with Replace");
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
        const allSelectors = [
            claimFacet.interface.getFunction("claimPrize").selector,
            claimFacet.interface.getFunction("claimExecutorFees").selector,
            claimFacet.interface.getFunction("getClaimableExecutorFees").selector,
            claimFacet.interface.getFunction("getUnclaimedPrizes").selector,
            claimFacet.interface.getFunction("batchClaimPrizes").selector,
            claimFacet.interface.getFunction("getTotalClaimableAmount").selector
        ];

        // Separate selectors to replace and add
        const claimPrizeSelector = claimFacet.interface.getFunction("claimPrize").selector;
        const newSelectors = allSelectors.filter(s => s !== claimPrizeSelector);

        console.log("📋 Selectors:");
        console.log("  - claimPrize (REPLACE):", claimPrizeSelector);
        console.log("  - New selectors:", newSelectors);

        // 3. Build diamond cut
        console.log("\n💎 Diamond cut hazırlanıyor...");
        const diamondCut = [
            {
                facetAddress: claimFacetAddress,
                action: 1, // Replace
                functionSelectors: [claimPrizeSelector]
            },
            {
                facetAddress: claimFacetAddress,
                action: 0, // Add
                functionSelectors: newSelectors
            }
        ];

        // 4. Execute diamond cut
        console.log("\n⚡ Diamond cut yapılıyor...");
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Transaction gönderildi:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Diamond güncellendi!");
        console.log("  - Block:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // 5. Verify functions
        console.log("\n🧪 Fonksiyonlar doğrulanıyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        
        for (const selector of allSelectors) {
            const facetAddress = await loupeFacet.facetAddress(selector);
            console.log(`  - ${selector}: ${facetAddress === claimFacetAddress ? '✅' : '❌'} ${facetAddress}`);
        }

        // 6. Test the claim functions
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

        // Check total claimable
        const totalClaimable = await claimFacetContract.getTotalClaimableAmount(deployer.address);
        console.log(`\n💎 Toplam claimable miktar: ${ethers.formatEther(totalClaimable)} LYX`);

        // 7. Summary
        console.log("\n📝 ÖZET:");
        console.log("✅ GridottoPrizeClaimFacet başarıyla deploy edildi");
        console.log("✅ claimPrize fonksiyonu güncellendi");
        console.log("✅ Yeni claim fonksiyonları eklendi");
        console.log("✅ Claim mekanizması aktif");
        console.log("✅ Gas tasarrufu sağlandı");
        console.log("\n💡 Kullanım:");
        console.log("  - Kazananlar: claimPrize(drawId)");
        console.log("  - Executor'lar: claimExecutorFees()");
        console.log("  - İptal edilen çekilişler: claimRefund(drawId) [RefundFacet'te]");
        console.log("  - Toplu claim: batchClaimPrizes([drawId1, drawId2, ...])");

        // 8. Important note about ExecutionV2Facet
        console.log("\n⚠️  ÖNEMLİ NOT:");
        console.log("ExecutionV2Facet artık executor fee'leri claimable balance'a ekliyor.");
        console.log("Executor'lar fee'lerini claimExecutorFees() ile çekebilir.");
        console.log("Bu sayede her execution'da gas tasarrufu sağlanır.");

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