import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Gridotto V2 - Aktif Çekilişleri Kontrol Et");
    console.log("=".repeat(60));

    // Diamond kontrat adresi
    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    // Get contract instances
    const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    
    try {
        // Mevcut çekiliş ID'sini al
        const nextDrawId = await adminFacet.getNextDrawId();
        console.log("📊 Bir sonraki çekiliş ID:", nextDrawId.toString());
        console.log("📈 Toplam kontrol edilecek çekiliş sayısı:", (Number(nextDrawId) - 1).toString());
        
        // Platform istatistikleri
        const stats = await adminFacet.getPlatformStatistics();
        console.log("\n📊 Platform İstatistikleri:");
        console.log("- Toplam oluşturulan çekiliş:", stats.totalDrawsCreated.toString());
        console.log("- Aktif haftalık çekiliş ID:", stats.currentWeeklyDrawId.toString());
        console.log("- Aktif aylık çekiliş ID:", stats.currentMonthlyDrawId.toString());
        
        console.log("\n" + "=".repeat(60));
        console.log("🔍 TÜM AKTİF ÇEKİLİŞLER:");
        console.log("=".repeat(60));
        
        let activeDrawCount = 0;
        const currentTime = Math.floor(Date.now() / 1000);
        
        // ID 16'yı özel olarak kontrol et
        console.log("\n🎯 YENİ OLUŞTURULAN ÇEKİLİŞ #16:");
        try {
            const draw16 = await coreFacet.getDrawDetails(16);
            displayDrawInfo(16, draw16, currentTime);
            
            const isActive = !draw16.isCompleted && !draw16.isCancelled && draw16.endTime > currentTime;
            if (isActive) activeDrawCount++;
            
        } catch (error) {
            console.log("❌ Çekiliş #16 bulunamadı veya hata oluştu");
        }
        
        // Diğer aktif çekilişleri kontrol et (son 20 çekiliş)
        console.log("\n📋 DİĞER ÇEKİLİŞLER:");
        const startId = Math.max(1, Number(nextDrawId) - 20);
        
        for (let i = startId; i < Number(nextDrawId); i++) {
            if (i === 16) continue; // 16'yı zaten kontrol ettik
            
            try {
                const drawInfo = await coreFacet.getDrawDetails(i);
                const isActive = !drawInfo.isCompleted && !drawInfo.isCancelled && 
                               drawInfo.endTime > currentTime;
                
                if (isActive) {
                    activeDrawCount++;
                    console.log(`\n🎲 Aktif Çekiliş #${i}:`);
                    displayDrawInfo(i, drawInfo, currentTime);
                }
            } catch (error) {
                // Çekiliş bulunamadı, devam et
            }
        }
        
        console.log("\n" + "=".repeat(60));
        console.log(`✅ TOPLAM AKTİF ÇEKİLİŞ SAYISI: ${activeDrawCount}`);
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("\n❌ Hata:", error);
    }
}

function displayDrawInfo(drawId: number, draw: any, currentTime: number) {
    const remainingTime = Number(draw.endTime) - currentTime;
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    
    console.log(`  📌 ID: ${drawId}`);
    console.log(`  👤 Oluşturan: ${draw.creator}`);
    console.log(`  🎰 Tip: ${getDrawTypeName(draw.drawType)}`);
    console.log(`  💰 Bilet Fiyatı: ${ethers.formatEther(draw.ticketPrice)} LYX`);
    console.log(`  🎫 Max Bilet: ${draw.maxTickets}`);
    console.log(`  📊 Satılan Bilet: ${draw.ticketsSold}`);
    console.log(`  💎 Ödül Havuzu: ${ethers.formatEther(draw.prizePool)} LYX`);
    console.log(`  👥 Katılımcı Sayısı: ${draw.participantCount}`);
    console.log(`  🎯 Min Katılımcı: ${draw.minParticipants}`);
    console.log(`  💸 Platform Ücreti: ${Number(draw.platformFeePercent) / 100}%`);
    console.log(`  ⏰ Başlangıç: ${new Date(Number(draw.startTime) * 1000).toLocaleString('tr-TR')}`);
    console.log(`  ⏱️ Bitiş: ${new Date(Number(draw.endTime) * 1000).toLocaleString('tr-TR')}`);
    console.log(`  ⏳ Kalan Süre: ${hours} saat ${minutes} dakika`);
    console.log(`  ✅ Tamamlandı: ${draw.isCompleted ? 'Evet' : 'Hayır'}`);
    console.log(`  ❌ İptal: ${draw.isCancelled ? 'Evet' : 'Hayır'}`);
    
    if (draw.tokenAddress !== '0x0000000000000000000000000000000000000000') {
        console.log(`  🪙 Token Adresi: ${draw.tokenAddress}`);
    }
    
    if (draw.monthlyPoolContribution > 0) {
        console.log(`  🏆 Aylık Havuz Katkısı: ${ethers.formatEther(draw.monthlyPoolContribution)} LYX`);
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