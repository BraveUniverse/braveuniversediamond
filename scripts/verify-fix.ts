import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Storage Düzeltme Doğrulama");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    try {
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
        const fixFacet = await ethers.getContractAt("GridottoFixFacet", DIAMOND_ADDRESS);
        
        // Tüm değerleri kontrol et
        console.log("\n📊 Storage Değerleri:");
        
        const nextDrawId = await adminFacet.getNextDrawId();
        console.log("1. getNextDrawId():", nextDrawId.toString());
        
        const stats = await adminFacet.getPlatformStatistics();
        console.log("2. totalDrawsCreated:", stats.totalDrawsCreated.toString());
        
        const diagnostics = await fixFacet.getStorageDiagnostics();
        console.log("3. Diagnostics:");
        console.log("   - nextDrawId:", diagnostics.nextDrawId.toString());
        console.log("   - totalDrawsCreated:", diagnostics.totalDrawsCreated.toString());
        console.log("   - highestExistingId:", diagnostics.highestExistingId.toString());
        console.log("   - inconsistencyFound:", diagnostics.inconsistencyFound);
        
        // Test: Yeni çekiliş oluştur
        console.log("\n🧪 Test: Yeni çekiliş oluşturma...");
        console.log("Beklenen ID:", nextDrawId.toString());
        
        // Aktif çekilişleri göster
        console.log("\n📋 Aktif Çekilişler:");
        const currentTime = Math.floor(Date.now() / 1000);
        let activeCount = 0;
        
        // totalDrawsCreated kullanarak tüm çekilişleri kontrol et
        for (let i = 1; i <= Number(stats.totalDrawsCreated); i++) {
            try {
                const draw = await coreFacet.getDrawDetails(i);
                if (draw.creator !== '0x0000000000000000000000000000000000000000' &&
                    !draw.isCompleted && 
                    !draw.isCancelled && 
                    draw.endTime > currentTime) {
                    activeCount++;
                    console.log(`- Draw #${i}: ${getDrawTypeName(draw.drawType)}`);
                }
            } catch (error) {
                // Atla
            }
        }
        console.log(`Toplam aktif: ${activeCount}`);
        
        // Sonuç
        console.log("\n📝 SONUÇ:");
        if (Number(nextDrawId) === Number(stats.totalDrawsCreated) + 1) {
            console.log("✅ nextDrawId doğru ayarlanmış!");
            console.log("✅ UI artık tüm çekilişleri görebilir!");
        } else {
            console.log("⚠️  Hala bir sorun var:");
            console.log(`   nextDrawId (${nextDrawId}) != totalDrawsCreated + 1 (${Number(stats.totalDrawsCreated) + 1})`);
            console.log("\n💡 ÖNERİ: UI'da totalDrawsCreated kullanmaya devam edin");
        }
        
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