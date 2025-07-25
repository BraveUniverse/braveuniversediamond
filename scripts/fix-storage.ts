import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Storage Düzeltme İşlemi");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 İşlemi yapan hesap:", deployer.address);

    try {
        const fixFacet = await ethers.getContractAt("GridottoFixFacet", DIAMOND_ADDRESS);
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        
        // Mevcut durumu kontrol et
        console.log("\n📊 Mevcut Durum:");
        const diagnosticsBefore = await fixFacet.getStorageDiagnostics();
        console.log("  - nextDrawId:", diagnosticsBefore.nextDrawId.toString());
        console.log("  - totalDrawsCreated:", diagnosticsBefore.totalDrawsCreated.toString());
        console.log("  - highestExistingId:", diagnosticsBefore.highestExistingId.toString());
        console.log("  - inconsistencyFound:", diagnosticsBefore.inconsistencyFound ? "❌ EVET" : "✅ HAYIR");
        
        // Admin facet'ten de kontrol et
        const nextDrawIdBefore = await adminFacet.getNextDrawId();
        console.log("  - getNextDrawId() sonucu:", nextDrawIdBefore.toString());
        
        if (diagnosticsBefore.inconsistencyFound) {
            console.log("\n🔧 Düzeltme işlemi başlatılıyor...");
            
            // syncNextDrawIdWithTotal kullanarak düzelt
            console.log("📝 syncNextDrawIdWithTotal() çağrılıyor...");
            const tx = await fixFacet.syncNextDrawIdWithTotal();
            console.log("⏳ Transaction gönderildi:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("✅ Transaction onaylandı!");
            console.log("  - Block:", receipt.blockNumber);
            console.log("  - Gas kullanımı:", receipt.gasUsed.toString());
            
            // Sonucu kontrol et
            console.log("\n📊 Düzeltme Sonrası Durum:");
            const diagnosticsAfter = await fixFacet.getStorageDiagnostics();
            console.log("  - nextDrawId:", diagnosticsAfter.nextDrawId.toString());
            console.log("  - totalDrawsCreated:", diagnosticsAfter.totalDrawsCreated.toString());
            console.log("  - highestExistingId:", diagnosticsAfter.highestExistingId.toString());
            console.log("  - inconsistencyFound:", diagnosticsAfter.inconsistencyFound ? "❌ EVET" : "✅ HAYIR");
            
            const nextDrawIdAfter = await adminFacet.getNextDrawId();
            console.log("  - getNextDrawId() sonucu:", nextDrawIdAfter.toString());
            
            if (!diagnosticsAfter.inconsistencyFound) {
                console.log("\n✅ Storage başarıyla düzeltildi!");
                console.log("🎉 Artık nextDrawId doğru değeri gösteriyor:", nextDrawIdAfter.toString());
            } else {
                console.log("\n⚠️  Hala tutarsızlık var, manuel kontrol gerekiyor!");
            }
            
        } else {
            console.log("\n✅ Storage zaten tutarlı, düzeltme gerekmiyor!");
        }
        
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