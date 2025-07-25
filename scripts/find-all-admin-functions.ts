import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Tüm Admin Fonksiyonlarını Bul");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    try {
        // Admin function signatures
        const adminSignatures = {
            "0x9e5ea20a": "pauseSystem",
            "0x046f7da2": "unpauseSystem", 
            "0xb187bd26": "isPaused",
            "0x476343ee": "withdrawPlatformFees",
            "0x6fda3868": "withdrawTokenFees",
            "0x89c2f9f5": "getPlatformFeesLYX",
            "0xb72c2490": "getPlatformFeesToken",
            "0x5f9a2e7f": "setFeePercentages",
            "0xc66052ae": "getSystemStats",
            "0x317d707e": "getNextDrawId",
            "0x2d2c5565": "getPlatformStatistics",
            "0xdb2e21bc": "emergencyWithdraw",
            "0x5c73f28e": "forceExecuteDraw",
            "0x769ee563": "fixNextDrawId",
            "0xc73a78bf": "syncNextDrawIdWithTotal",
            "0x06b92817": "getStorageDiagnostics",
            "0x7a564970": "forceSetNextDrawId"
        };
        
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facets = await loupeFacet.facets();
        
        console.log(`\n📊 ${facets.length} facet kontrol ediliyor...\n`);
        
        const adminFacets = [];
        
        for (let i = 0; i < facets.length; i++) {
            const facet = facets[i];
            const foundFunctions = [];
            
            for (const selector of facet.functionSelectors) {
                if (adminSignatures[selector]) {
                    foundFunctions.push({
                        selector,
                        name: adminSignatures[selector]
                    });
                }
            }
            
            if (foundFunctions.length > 0) {
                console.log(`${i + 1}. Facet: ${facet.facetAddress}`);
                console.log(`   Admin fonksiyonları (${foundFunctions.length}):`);
                for (const func of foundFunctions) {
                    console.log(`   - ${func.name} (${func.selector})`);
                }
                console.log("");
                
                adminFacets.push({
                    address: facet.facetAddress,
                    selectors: facet.functionSelectors,
                    adminFunctions: foundFunctions
                });
            }
        }
        
        console.log(`\n📋 ÖZET: ${adminFacets.length} facet'te admin fonksiyonları var`);
        
        // Kaldırılması gereken tüm selector'ları topla
        const allSelectorsToRemove = [];
        for (const af of adminFacets) {
            allSelectorsToRemove.push(...af.selectors);
        }
        
        console.log(`\nToplam ${allSelectorsToRemove.length} selector kaldırılmalı`);
        
        // Çözüm öner
        console.log("\n💡 ÇÖZÜM:");
        console.log("1. Önce TÜM bu facet'leri kaldır");
        console.log("2. Sonra sadece AdminFacetV2'yi ekle");
        console.log("\nKaldırılacak facet'ler:");
        for (const af of adminFacets) {
            console.log(`- ${af.address}`);
        }
        
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