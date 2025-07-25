import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Final Fee Upgrade - Complete Upfront Deduction");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Compile first
        console.log("\n📦 Compiling contracts...");
        await run("compile");
        
        // 2. Deploy GridottoCoreV2UpgradeFacet
        console.log("\n📦 GridottoCoreV2UpgradeFacet deploy ediliyor...");
        const GridottoCoreV2UpgradeFacet = await ethers.getContractFactory("GridottoCoreV2UpgradeFacet");
        const coreFacet = await GridottoCoreV2UpgradeFacet.deploy();
        await coreFacet.waitForDeployment();
        const coreFacetAddress = await coreFacet.getAddress();
        console.log("✅ GridottoCoreV2UpgradeFacet deployed:", coreFacetAddress);

        // 3. Deploy GridottoExecutionV2UpgradeFacet
        console.log("\n📦 GridottoExecutionV2UpgradeFacet deploy ediliyor...");
        const GridottoExecutionV2UpgradeFacet = await ethers.getContractFactory("GridottoExecutionV2UpgradeFacet");
        const execFacet = await GridottoExecutionV2UpgradeFacet.deploy();
        await execFacet.waitForDeployment();
        const execFacetAddress = await execFacet.getAddress();
        console.log("✅ GridottoExecutionV2UpgradeFacet deployed:", execFacetAddress);

        // 4. Deploy updated GridottoPrizeClaimFacet
        console.log("\n📦 Updated GridottoPrizeClaimFacet deploy ediliyor...");
        const GridottoPrizeClaimFacet = await ethers.getContractFactory("GridottoPrizeClaimFacet");
        const claimFacet = await GridottoPrizeClaimFacet.deploy();
        await claimFacet.waitForDeployment();
        const claimFacetAddress = await claimFacet.getAddress();
        console.log("✅ GridottoPrizeClaimFacet deployed:", claimFacetAddress);

        // 5. Get selectors
        const buyTicketsSelector = coreFacet.interface.getFunction("buyTickets").selector;
        const executeDrawSelector = execFacet.interface.getFunction("executeDraw").selector;
        const claimPrizeSelector = claimFacet.interface.getFunction("claimPrize").selector;

        console.log("\n📋 Selectors:");
        console.log("  - buyTickets:", buyTicketsSelector);
        console.log("  - executeDraw:", executeDrawSelector);
        console.log("  - claimPrize:", claimPrizeSelector);

        // 6. Build diamond cut
        console.log("\n💎 Diamond cut hazırlanıyor...");
        const diamondCut = [
            {
                facetAddress: coreFacetAddress,
                action: 1, // Replace
                functionSelectors: [buyTicketsSelector]
            },
            {
                facetAddress: execFacetAddress,
                action: 1, // Replace
                functionSelectors: [executeDrawSelector]
            },
            {
                facetAddress: claimFacetAddress,
                action: 1, // Replace
                functionSelectors: [claimPrizeSelector]
            }
        ];

        // 7. Execute diamond cut
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Transaction gönderildi:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Diamond güncellendi!");
        console.log("  - Block:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // 8. Summary
        console.log("\n" + "=".repeat(60));
        console.log("📝 ÖZET - KOMPLİT PEŞİN FEE KESİNTİSİ AKTİF!");
        console.log("=".repeat(60));
        
        console.log("\n✅ Tüm Çekiliş Tipleri İçin Fee Yapısı:");
        
        console.log("\n1️⃣ PLATFORM ÇEKİLİŞLERİ:");
        console.log("   📅 Haftalık Çekiliş:");
        console.log("      - %20 → Aylık Havuz");
        console.log("      - %5  → Platform Fee");
        console.log("      - %5  → Executor Fee (claim)");
        console.log("      - %70 → Ödül Havuzu");
        
        console.log("\n   📅 Aylık Çekiliş:");
        console.log("      - %5  → Platform Fee");
        console.log("      - %5  → Executor Fee (claim)");
        console.log("      - %90 → Ödül Havuzu");
        
        console.log("\n2️⃣ KULLANICI ÇEKİLİŞLERİ:");
        console.log("   💰 LYX Çekilişi:");
        console.log("      - %5  → Platform Fee");
        console.log("      - %5  → Executor Fee (claim)");
        console.log("      - %2  → Aylık Havuz");
        console.log("      - %88 → Ödül Havuzu");
        
        console.log("\n   🪙 Token Çekilişi:");
        console.log("      - %5  → Platform Fee");
        console.log("      - %5  → Executor Fee (claim)");
        console.log("      - %90 → Ödül Havuzu");
        
        console.log("\n   🖼️ NFT Çekilişi:");
        console.log("      - %5  → Platform Fee");
        console.log("      - %5  → Executor Fee (claim)");
        console.log("      - %90 → Creator'a (LYX olarak)");
        console.log("      - NFT → Kazanana");

        console.log("\n⚡ Önemli Değişiklikler:");
        console.log("  1. Tüm fee'ler bilet satışında kesilir");
        console.log("  2. Prize pool NET tutarı gösterir");
        console.log("  3. Executor fee'leri claim edilmeli");
        console.log("  4. NFT çekilişlerinde creator LYX alır, kazanan NFT alır");
        console.log("  5. Refund'larda sadece NET tutar iade edilir");

        console.log("\n🔄 UI Güncellemeleri:");
        console.log("  - Prize pool NET tutar olarak gösterilmeli");
        console.log("  - Bilet alımında fee breakdown gösterilmeli");
        console.log("  - Executor claim butonu eklenmeli");
        console.log("  - NFT çekilişlerinde 'Creator receives X LYX' gösterilmeli");

        // 9. Save deployment info
        const deploymentInfo = {
            upgrade: "Complete Upfront Fee Deduction",
            deployedAt: new Date().toISOString(),
            network: "luksoTestnet",
            deployer: deployer.address,
            facets: {
                core: coreFacetAddress,
                execution: execFacetAddress,
                claim: claimFacetAddress
            },
            feeStructure: {
                platformWeekly: { monthly: "20%", platform: "5%", executor: "5%", prize: "70%" },
                platformMonthly: { platform: "5%", executor: "5%", prize: "90%" },
                userLYX: { platform: "5%", executor: "5%", monthly: "2%", prize: "88%" },
                userToken: { platform: "5%", executor: "5%", prize: "90%" },
                userNFT: { platform: "5%", executor: "5%", creator: "90% (LYX)", nft: "Winner" }
            }
        };

        console.log("\n📄 Deployment bilgileri:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

    } catch (error) {
        console.error("\n❌ Hata:", error);
        process.exit(1);
    }
}

// Hardhat runtime environment
declare const run: any;

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });