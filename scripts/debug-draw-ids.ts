import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Gridotto V2 - Draw ID Debug");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    
    // Storage değerlerini kontrol et
    const nextDrawId = await adminFacet.getNextDrawId();
    const stats = await adminFacet.getPlatformStatistics();
    
    console.log("📊 Storage Değerleri:");
    console.log("- nextDrawId:", nextDrawId.toString());
    console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
    console.log("- Fark:", (Number(stats.totalDrawsCreated) - Number(nextDrawId) + 1).toString());
    
    console.log("\n🔍 1-20 Arası Tüm Draw ID'leri Kontrol Ediyorum:");
    console.log("=".repeat(60));
    
    const existingDraws = [];
    const missingDraws = [];
    
    for (let i = 1; i <= 20; i++) {
        try {
            const draw = await coreFacet.getDrawDetails(i);
            
            // Draw varsa
            if (draw.creator !== '0x0000000000000000000000000000000000000000') {
                existingDraws.push(i);
                console.log(`✅ Draw #${i} MEVCUT - Tip: ${getDrawTypeName(draw.drawType)}, Oluşturan: ${draw.creator.slice(0,10)}...`);
            } else {
                missingDraws.push(i);
                console.log(`❌ Draw #${i} BOŞ`);
            }
        } catch (error) {
            missingDraws.push(i);
            console.log(`❌ Draw #${i} HATA - Muhtemelen yok`);
        }
    }
    
    console.log("\n📊 ÖZET:");
    console.log("=".repeat(60));
    console.log(`✅ Mevcut Draw ID'leri (${existingDraws.length} adet):`, existingDraws.join(", "));
    console.log(`❌ Eksik Draw ID'leri (${missingDraws.length} adet):`, missingDraws.join(", "));
    
    // Pattern analizi
    console.log("\n🔍 PATTERN ANALİZİ:");
    if (existingDraws.length > 0) {
        const gaps = [];
        for (let i = 1; i < existingDraws.length; i++) {
            if (existingDraws[i] - existingDraws[i-1] > 1) {
                gaps.push(`${existingDraws[i-1]} -> ${existingDraws[i]}`);
            }
        }
        if (gaps.length > 0) {
            console.log("⚠️  ID'lerde boşluklar var:", gaps.join(", "));
        }
    }
    
    // Önerilen çözüm
    console.log("\n💡 ÖNERİLEN ÇÖZÜM:");
    console.log("1. Tüm mevcut draw'ları iterate etmek için 1'den totalDrawsCreated'a kadar döngü kullan");
    console.log("2. Her ID için try-catch ile kontrol et");
    console.log("3. Boş/hatalı ID'leri atla");
    console.log("4. Ya da getAllActiveDraws() gibi bir fonksiyon ekle");
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