import { ethers } from "hardhat";

async function main() {
    console.log("🔧 AdminFacet Güncelleme - getNextDrawId Düzeltmesi");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Mevcut durumu kontrol et
        console.log("\n📊 Mevcut Durum:");
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        const storageFixFacet = await ethers.getContractAt("GridottoStorageFixFacet", DIAMOND_ADDRESS);
        
        const adminNextDrawId = await adminFacet.getNextDrawId();
        const debugInfo = await storageFixFacet.debugStorage();
        
        console.log("- AdminFacet getNextDrawId():", adminNextDrawId.toString());
        console.log("- StorageFixFacet nextDrawId:", debugInfo.nextDrawId.toString());
        console.log("- totalDrawsCreated:", debugInfo.totalDrawsCreated.toString());
        
        if (Number(adminNextDrawId) !== Number(debugInfo.nextDrawId)) {
            console.log("\n⚠️  Farklı değerler görünüyor!");
            console.log("💡 Çözüm: AdminFacet'i yeniden deploy edip replace edeceğiz");
            
            // 2. Yeni AdminFacet deploy et
            console.log("\n📦 Yeni GridottoAdminFacet deploy ediliyor...");
            const GridottoAdminFacet = await ethers.getContractFactory("GridottoAdminFacet");
            const newAdminFacet = await GridottoAdminFacet.deploy();
            await newAdminFacet.waitForDeployment();
            const newAdminFacetAddress = await newAdminFacet.getAddress();
            console.log("✅ Yeni AdminFacet deployed:", newAdminFacetAddress);
            
            // 3. Mevcut AdminFacet selector'larını al
            console.log("\n🔍 AdminFacet selector'ları alınıyor...");
            const diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
            
            // Eski AdminFacet adresini bul
            const facets = await diamondLoupeFacet.facets();
            let oldAdminFacetAddress = "";
            let adminSelectors: string[] = [];
            
            for (const facet of facets) {
                const selectors = facet.functionSelectors;
                // getNextDrawId selector'ını ara
                if (selectors.includes("0x317d707e")) { // getNextDrawId selector
                    oldAdminFacetAddress = facet.facetAddress;
                    // Array'i kopyala (read-only hatası için)
                    adminSelectors = [...selectors];
                    break;
                }
            }
            
            console.log("- Eski AdminFacet adresi:", oldAdminFacetAddress);
            console.log("- Selector sayısı:", adminSelectors.length);
            
            // 4. Diamond'da replace et
            console.log("\n💎 Diamond'da AdminFacet replace ediliyor...");
            const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
            
            const diamondCut = [{
                facetAddress: newAdminFacetAddress,
                action: 1, // Replace
                functionSelectors: adminSelectors
            }];
            
            const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
            console.log("⏳ Replace TX:", tx.hash);
            await tx.wait();
            console.log("✅ AdminFacet replace edildi!");
            
            // 5. Sonucu kontrol et
            console.log("\n📊 Güncelleme Sonrası Durum:");
            const newAdminNextDrawId = await adminFacet.getNextDrawId();
            const newDebugInfo = await storageFixFacet.debugStorage();
            
            console.log("- AdminFacet getNextDrawId():", newAdminNextDrawId.toString());
            console.log("- StorageFixFacet nextDrawId:", newDebugInfo.nextDrawId.toString());
            console.log("- totalDrawsCreated:", newDebugInfo.totalDrawsCreated.toString());
            
            if (Number(newAdminNextDrawId) === Number(newDebugInfo.nextDrawId)) {
                console.log("\n🎉 BAŞARILI! Artık her iki facet de aynı değeri gösteriyor!");
            } else {
                console.log("\n⚠️  Hala farklı değerler var. Manuel müdahale gerekebilir.");
                
                // Manuel override dene
                console.log("\n🔧 Manuel override deneniyor...");
                const tx2 = await storageFixFacet.manualStorageOverride(17, 16);
                console.log("⏳ Override TX:", tx2.hash);
                await tx2.wait();
                
                const finalCheck = await adminFacet.getNextDrawId();
                console.log("✅ Final getNextDrawId():", finalCheck.toString());
            }
            
        } else {
            console.log("\n✅ Değerler zaten aynı!");
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