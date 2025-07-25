import { ethers } from "hardhat";

/**
 * UI için doğru draw listesi alma örneği
 */
async function main() {
    console.log("🎨 UI Helper - Tüm Çekilişleri Doğru Şekilde Alma");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    const coreFacet = await ethers.getContractAt("GridottoCoreV2Facet", DIAMOND_ADDRESS);
    
    // YANLIŞ YOL ❌
    console.log("\n❌ YANLIŞ YOL (nextDrawId kullanarak):");
    const nextDrawId = await adminFacet.getNextDrawId();
    console.log(`nextDrawId: ${nextDrawId} - Sadece ${Number(nextDrawId) - 1} çekiliş gösterir!`);
    
    // DOĞRU YOL ✅
    console.log("\n✅ DOĞRU YOL (totalDrawsCreated kullanarak):");
    const stats = await adminFacet.getPlatformStatistics();
    const totalDraws = stats.totalDrawsCreated;
    console.log(`totalDrawsCreated: ${totalDraws} - Tüm ${totalDraws} çekiliş gösterir!`);
    
    // UI için örnek kod
    console.log("\n📝 UI İÇİN ÖRNEK KOD:");
    console.log("```javascript");
    console.log("// Tüm çekilişleri getir");
    console.log("async function getAllDraws() {");
    console.log("  const stats = await adminFacet.getPlatformStatistics();");
    console.log("  const totalDraws = stats.totalDrawsCreated;");
    console.log("  const draws = [];");
    console.log("  ");
    console.log("  for (let i = 1; i <= totalDraws; i++) {");
    console.log("    try {");
    console.log("      const draw = await coreFacet.getDrawDetails(i);");
    console.log("      if (draw.creator !== '0x0000000000000000000000000000000000000000') {");
    console.log("        draws.push({ id: i, ...draw });");
    console.log("      }");
    console.log("    } catch (error) {");
    console.log("      // ID mevcut değil, atla");
    console.log("    }");
    console.log("  }");
    console.log("  ");
    console.log("  return draws;");
    console.log("}");
    console.log("```");
    
    // Aktif çekilişleri göster
    console.log("\n🎯 AKTİF ÇEKİLİŞLER:");
    const currentTime = Math.floor(Date.now() / 1000);
    let activeCount = 0;
    
    for (let i = 1; i <= Number(totalDraws); i++) {
        try {
            const draw = await coreFacet.getDrawDetails(i);
            if (draw.creator !== '0x0000000000000000000000000000000000000000' &&
                !draw.isCompleted && 
                !draw.isCancelled && 
                draw.endTime > currentTime) {
                activeCount++;
                console.log(`- Draw #${i}: ${getDrawTypeName(draw.drawType)}, Bitiş: ${new Date(Number(draw.endTime) * 1000).toLocaleString('tr-TR')}`);
            }
        } catch (error) {
            // Atla
        }
    }
    
    console.log(`\n✅ Toplam aktif çekiliş: ${activeCount}`);
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