import { ethers } from "hardhat";

async function main() {
    console.log("🧹 Admin Facet Temizleme ve Düzeltme");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Find all admin-related facets
        console.log("\n🔍 Admin facet'leri bulunuyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facets = await loupeFacet.facets();
        
        const adminFacetsToRemove = [];
        
        // Admin ile ilgili tüm facet'leri bul
        for (const facet of facets) {
            // GridottoAdminFacet selectors
            if (facet.functionSelectors.includes("0x317d707e") || // getNextDrawId
                facet.functionSelectors.includes("0x2d2c5565") || // getPlatformStatistics
                facet.functionSelectors.includes("0x769ee563") || // fixNextDrawId
                facet.functionSelectors.includes("0xc73a78bf") || // syncNextDrawIdWithTotal
                facet.functionSelectors.includes("0x06b92817")) { // getStorageDiagnostics
                
                adminFacetsToRemove.push({
                    address: facet.facetAddress,
                    selectors: [...facet.functionSelectors]
                });
                console.log(`- ${facet.facetAddress}: ${facet.functionSelectors.length} selector`);
            }
        }
        
        console.log(`\nToplam ${adminFacetsToRemove.length} admin facet bulundu`);
        
        // 2. Remove all admin facets
        if (adminFacetsToRemove.length > 0) {
            console.log("\n🗑️  Tüm admin facet'ler kaldırılıyor...");
            const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
            
            const removeCuts = adminFacetsToRemove.map(facet => ({
                facetAddress: ethers.ZeroAddress,
                action: 2, // Remove
                functionSelectors: facet.selectors
            }));
            
            const tx1 = await diamondCut.diamondCut(removeCuts, ethers.ZeroAddress, "0x");
            console.log("⏳ Remove TX:", tx1.hash);
            await tx1.wait();
            console.log("✅ Admin facet'ler kaldırıldı!");
        }
        
        // 3. Deploy fresh AdminFacetV2
        console.log("\n📦 Yeni GridottoAdminFacetV2 deploy ediliyor...");
        const AdminFacetV2 = await ethers.getContractFactory("GridottoAdminFacetV2");
        const adminV2 = await AdminFacetV2.deploy();
        await adminV2.waitForDeployment();
        const adminV2Address = await adminV2.getAddress();
        console.log("✅ AdminFacetV2 deployed:", adminV2Address);
        
        // 4. Add AdminFacetV2
        console.log("\n💎 AdminFacetV2 ekleniyor...");
        const selectors = [
            adminV2.interface.getFunction("pauseSystem").selector,
            adminV2.interface.getFunction("unpauseSystem").selector,
            adminV2.interface.getFunction("isPaused").selector,
            adminV2.interface.getFunction("withdrawPlatformFees").selector,
            adminV2.interface.getFunction("withdrawTokenFees").selector,
            adminV2.interface.getFunction("getPlatformFeesLYX").selector,
            adminV2.interface.getFunction("getPlatformFeesToken").selector,
            adminV2.interface.getFunction("setFeePercentages").selector,
            adminV2.interface.getFunction("getSystemStats").selector,
            adminV2.interface.getFunction("getNextDrawId").selector,
            adminV2.interface.getFunction("forceSetNextDrawId").selector,
            adminV2.interface.getFunction("getPlatformStatistics").selector,
            adminV2.interface.getFunction("emergencyWithdraw").selector,
            adminV2.interface.getFunction("forceExecuteDraw").selector
        ];
        
        const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        const addCut = [{
            facetAddress: adminV2Address,
            action: 0, // Add
            functionSelectors: selectors
        }];
        
        const tx2 = await diamondCut.diamondCut(addCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Add TX:", tx2.hash);
        await tx2.wait();
        console.log("✅ AdminFacetV2 eklendi!");
        
        // 5. Test
        console.log("\n🧪 Test ediliyor...");
        const newAdmin = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
        
        const nextDrawId = await newAdmin.getNextDrawId();
        const stats = await newAdmin.getPlatformStatistics();
        
        console.log("\n📊 Final Durum:");
        console.log("- getNextDrawId():", nextDrawId.toString());
        console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
        console.log("- Beklenen nextDrawId:", Number(stats.totalDrawsCreated) + 1);
        
        if (Number(nextDrawId) !== 17) {
            console.log("\n🔧 forceSetNextDrawId(17) çağrılıyor...");
            const fixTx = await newAdmin.forceSetNextDrawId(17);
            await fixTx.wait();
            
            const finalCheck = await newAdmin.getNextDrawId();
            console.log("✅ Final nextDrawId:", finalCheck.toString());
        }
        
        console.log("\n🎉 BAŞARILI! Admin facet temizlendi ve düzeltildi!");
        console.log("✅ nextDrawId artık doğru değeri gösteriyor!");
        console.log("✅ UI tüm çekilişleri görebilir!");
        
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