import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("🎲 Gridotto V2 - Aktif Çekiliş Sorgulama ve Yeni Çekiliş Oluşturma");
    console.log("=".repeat(60));

    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("🔑 Kullanılan hesap:", user2.address);
    
    // Bakiye kontrolü
    const balance = await ethers.provider.getBalance(user2.address);
    console.log("💰 Hesap bakiyesi:", ethers.formatEther(balance), "LYX");

    // Diamond kontrat adresi
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract instances with user2 as signer
    const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS, user2);
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS, user2);
    
    try {
        // 1. Mevcut çekiliş ID'sini al
        console.log("\n📊 Sistem Durumu Sorgulanıyor...");
        const nextDrawId = await adminFacet.getNextDrawId();
        console.log("✅ Bir sonraki çekiliş ID:", nextDrawId.toString());
        console.log("📈 Toplam oluşturulan çekiliş sayısı:", (Number(nextDrawId) - 1).toString());

        // 2. Platform istatistiklerini al
        const stats = await adminFacet.getPlatformStatistics();
        console.log("\n📊 Platform İstatistikleri:");
        console.log("- Toplam oluşturulan çekiliş:", stats.totalDrawsCreated.toString());
        console.log("- Toplam satılan bilet:", stats.totalTicketsSold.toString());
        console.log("- Toplam dağıtılan ödül:", ethers.formatEther(stats.totalPrizesDistributed), "LYX");
        console.log("- Toplam execution:", stats.totalExecutions.toString());
        console.log("- Platform ücretleri (LYX):", ethers.formatEther(stats.platformFeesLYX), "LYX");
        console.log("- Aylık havuz bakiyesi:", ethers.formatEther(stats.monthlyPoolBalance), "LYX");
        console.log("- Aktif haftalık çekiliş ID:", stats.currentWeeklyDrawId.toString());
        console.log("- Aktif aylık çekiliş ID:", stats.currentMonthlyDrawId.toString());

        // 3. Aktif çekilişleri kontrol et (son 10 çekiliş)
        console.log("\n🔍 Son Çekilişlerin Durumu:");
        const startId = Number(nextDrawId) > 10 ? Number(nextDrawId) - 10 : 1;
        let activeDrawCount = 0;
        
        for (let i = startId; i < Number(nextDrawId); i++) {
            try {
                const drawInfo = await coreFacet.getDrawDetails(i);
                const isActive = !drawInfo.isCompleted && !drawInfo.isCancelled && 
                               drawInfo.endTime > Math.floor(Date.now() / 1000);
                
                if (isActive) {
                    activeDrawCount++;
                    console.log(`\n🎯 Aktif Çekiliş #${i}:`);
                    console.log(`  - Tip: ${getDrawTypeName(drawInfo.drawType)}`);
                    console.log(`  - Oluşturan: ${drawInfo.creator}`);
                    console.log(`  - Bilet fiyatı: ${ethers.formatEther(drawInfo.ticketPrice)} LYX`);
                    console.log(`  - Satılan bilet: ${drawInfo.ticketsSold}`);
                    console.log(`  - Ödül havuzu: ${ethers.formatEther(drawInfo.prizePool)} LYX`);
                    console.log(`  - Bitiş zamanı: ${new Date(Number(drawInfo.endTime) * 1000).toLocaleString('tr-TR')}`);
                }
            } catch (error) {
                // Çekiliş bulunamadı, devam et
            }
        }
        
        console.log(`\n✅ Toplam aktif çekiliş sayısı: ${activeDrawCount}`);

        // 4. Yeni bir LYX çekilişi oluştur
        console.log("\n🎰 Yeni LYX Çekilişi Oluşturuluyor...");
        
        const ticketPrice = ethers.parseEther("0.1"); // 0.1 LYX per ticket
        const maxTickets = 100;
        const duration = 3600; // 1 saat
        const minParticipants = 2;
        const platformFeePercent = 500; // %5
        const initialPrize = ethers.parseEther("1.0"); // 1 LYX başlangıç ödülü

        console.log("📝 Çekiliş Parametreleri:");
        console.log("  - Bilet fiyatı: 0.1 LYX");
        console.log("  - Maksimum bilet: 100");
        console.log("  - Süre: 1 saat");
        console.log("  - Minimum katılımcı: 2");
        console.log("  - Platform ücreti: %5");
        console.log("  - Başlangıç ödülü: 1 LYX");

        // Event listener ekle
        coreFacet.on("DrawCreated", (drawId, creator, drawType, event) => {
            console.log("\n🎉 YENİ ÇEKİLİŞ OLUŞTURULDU!");
            console.log("  - Çekiliş ID:", drawId.toString());
            console.log("  - Oluşturan:", creator);
            console.log("  - Çekiliş tipi:", getDrawTypeName(drawType));
            console.log("  - Transaction hash:", event.log.transactionHash);
            
            // Event'i dinledikten sonra listener'ı kaldır
            coreFacet.removeAllListeners("DrawCreated");
        });

        // Çekilişi oluştur
        const tx = await coreFacet.createLYXDraw(
            ticketPrice,
            maxTickets,
            duration,
            minParticipants,
            platformFeePercent,
            { value: initialPrize }
        );

        console.log("\n⏳ Transaction gönderildi, bekleniyor...");
        console.log("  - TX Hash:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction onaylandı!");
        console.log("  - Block numarası:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // Event'in işlenmesi için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
        console.error("\n❌ Hata:", error);
    }
}

function getDrawTypeName(drawType: number): string {
    const types = ["USER_LYX", "USER_LSP7", "USER_LSP8", "PLATFORM_WEEKLY", "PLATFORM_MONTHLY"];
    return types[drawType] || "UNKNOWN";
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });