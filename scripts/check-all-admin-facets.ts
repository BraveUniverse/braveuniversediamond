import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Tüm Admin Facet'leri Kontrol Et");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    try {
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facets = await loupeFacet.facets();
        
        console.log("\n📊 Diamond'daki tüm facet'ler:");
        
        const adminFacets = [];
        
        for (let i = 0; i < facets.length; i++) {
            const facet = facets[i];
            console.log(`\n${i + 1}. Facet: ${facet.facetAddress}`);
            console.log(`   Selector sayısı: ${facet.functionSelectors.length}`);
            
            // Admin fonksiyonlarını kontrol et
            let hasAdminFunctions = false;
            const adminSelectors = ["0x317d707e", "0x06b92817", "0x769ee563", "0xc73a78bf"];
            
            for (const selector of adminSelectors) {
                if (facet.functionSelectors.includes(selector)) {
                    hasAdminFunctions = true;
                    break;
                }
            }
            
            if (hasAdminFunctions || facet.functionSelectors.includes("0x317d707e")) {
                adminFacets.push({
                    address: facet.facetAddress,
                    selectors: [...facet.functionSelectors]
                });
                console.log("   ⚠️  Admin fonksiyonları içeriyor!");
                
                // Hangi admin fonksiyonları var?
                if (facet.functionSelectors.includes("0x317d707e")) {
                    console.log("   - getNextDrawId() ✓");
                }
                if (facet.functionSelectors.includes("0x2d2c5565")) {
                    console.log("   - getPlatformStatistics() ✓");
                }
            }
        }
        
        console.log("\n📋 Admin Facet Özeti:");
        console.log(`Toplam ${adminFacets.length} facet admin fonksiyonları içeriyor:`);
        
        for (const af of adminFacets) {
            console.log(`\n- ${af.address}`);
            console.log(`  Selector'lar: ${af.selectors.join(", ")}`);
        }
        
        // Öneri
        console.log("\n💡 ÖNERİ:");
        console.log("1. Önce tüm eski admin selector'ları kaldır");
        console.log("2. Sonra yeni AdminFacetV2'yi ekle");
        
    } catch (error) {
        console.error("\n❌ Hata:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });