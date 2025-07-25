import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Upfront Fee Deduction Upgrade");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Deploy GridottoCoreV2UpgradeFacet
        console.log("\n📦 GridottoCoreV2UpgradeFacet deploy ediliyor...");
        const GridottoCoreV2UpgradeFacet = await ethers.getContractFactory("GridottoCoreV2UpgradeFacet");
        const upgradeFacet = await GridottoCoreV2UpgradeFacet.deploy();
        await upgradeFacet.waitForDeployment();
        const upgradeFacetAddress = await upgradeFacet.getAddress();
        console.log("✅ GridottoCoreV2UpgradeFacet deployed:", upgradeFacetAddress);

        // 2. Get buyTickets selector
        const buyTicketsSelector = upgradeFacet.interface.getFunction("buyTickets").selector;
        console.log("\n📋 buyTickets selector:", buyTicketsSelector);

        // 3. Replace buyTickets function
        console.log("\n💎 buyTickets fonksiyonu değiştiriliyor...");
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const diamondCut = [{
            facetAddress: upgradeFacetAddress,
            action: 1, // Replace
            functionSelectors: [buyTicketsSelector]
        }];

        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Transaction gönderildi:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ buyTickets fonksiyonu güncellendi!");
        console.log("  - Block:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // 4. Verify the upgrade
        console.log("\n🧪 Güncelleme doğrulanıyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facetAddress = await loupeFacet.facetAddress(buyTicketsSelector);
        console.log(`  - buyTickets facet address: ${facetAddress}`);
        console.log(`  - Doğru mu? ${facetAddress === upgradeFacetAddress ? '✅' : '❌'}`);

        // 5. Summary
        console.log("\n📝 ÖZET - PEŞİN FEE KESİNTİSİ AKTİF!");
        console.log("=".repeat(60));
        console.log("\n✅ Yapılan Değişiklikler:");
        console.log("  1. buyTickets fonksiyonu güncellendi");
        console.log("  2. Platform çekilişlerinde peşin fee kesintisi aktif:");
        console.log("     - Haftalık: %30 kesinti (20% aylık havuz, 5% platform, 5% executor)");
        console.log("     - Aylık: %10 kesinti (5% platform, 5% executor)");
        console.log("  3. Kullanıcı çekilişlerinde kesinti YOK");
        console.log("  4. Executor fee'leri claimable balance'a ekleniyor");
        
        console.log("\n💰 Fee Dağılımı:");
        console.log("  - Platform Fee: platformFeesLYX'e eklenir (admin çekebilir)");
        console.log("  - Executor Fee: draw.executorFeeCollected'e eklenir (executor claim eder)");
        console.log("  - Monthly Pool: monthlyPoolBalance'a eklenir (aylık çekiliş havuzu)");
        
        console.log("\n⚠️  ÖNEMLİ NOTLAR:");
        console.log("  1. Eski çekilişler etkilenmez (sadece yeni bilet alımları)");
        console.log("  2. Prize pool artık NET tutarı gösterir (kesintiler sonrası)");
        console.log("  3. ExecutionV2Facet değişiklik gerektirmez");
        console.log("  4. RefundFacet güncellenmeli (sadece net tutar iade edilmeli)");

        // 6. Save deployment info
        const deploymentInfo = {
            upgrade: "Upfront Fee Deduction",
            facetName: "GridottoCoreV2UpgradeFacet",
            address: upgradeFacetAddress,
            deployedAt: new Date().toISOString(),
            network: "luksoTestnet",
            deployer: deployer.address,
            changes: {
                buyTickets: "Updated with upfront fee deduction",
                weeklyFees: "30% total (20% monthly, 5% platform, 5% executor)",
                monthlyFees: "10% total (5% platform, 5% executor)",
                userDrawFees: "0% (no fees for user draws)"
            }
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