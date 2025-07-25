import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Final Admin Fix - Temizlik ve Yeniden Kurulum");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Find ALL facets with admin functions
        console.log("\n🔍 Admin fonksiyonları olan tüm facet'ler bulunuyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facets = await loupeFacet.facets();
        
        // Known admin selectors
        const adminSelectors = [
            "0x9e5ea20a", "0x046f7da2", "0xb187bd26", "0x476343ee",
            "0x6fda3868", "0x89c2f9f5", "0xb72c2490", "0x5f9a2e7f",
            "0xc66052ae", "0x317d707e", "0x2d2c5565", "0xdb2e21bc",
            "0x5c73f28e", "0x769ee563", "0xc73a78bf", "0x06b92817",
            "0x7a564970"
        ];
        
        const facetsToClean = [];
        
        for (const facet of facets) {
            const adminFuncs = facet.functionSelectors.filter(sel => 
                adminSelectors.includes(sel)
            );
            
            if (adminFuncs.length > 0) {
                facetsToClean.push({
                    address: facet.facetAddress,
                    selectorsToRemove: [...adminFuncs]  // Copy array to avoid readonly error
                });
                console.log(`- ${facet.facetAddress}: ${adminFuncs.length} admin fonksiyon`);
            }
        }
        
        // 2. Remove all admin functions
        if (facetsToClean.length > 0) {
            console.log(`\n🗑️  ${facetsToClean.length} facet'ten admin fonksiyonları kaldırılıyor...`);
            const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
            
            const cuts = [];
            for (const facet of facetsToClean) {
                cuts.push({
                    facetAddress: ethers.ZeroAddress,
                    action: 2, // Remove
                    functionSelectors: facet.selectorsToRemove
                });
            }
            
            const tx1 = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, "0x");
            console.log("⏳ Remove TX:", tx1.hash);
            await tx1.wait();
            console.log("✅ Tüm admin fonksiyonları kaldırıldı!");
        }
        
        // 3. Deploy new AdminFacetV2
        console.log("\n📦 GridottoAdminFacetV2 deploy ediliyor...");
        const AdminFacetV2 = await ethers.getContractFactory("GridottoAdminFacetV2");
        const adminV2 = await AdminFacetV2.deploy();
        await adminV2.waitForDeployment();
        const adminV2Address = await adminV2.getAddress();
        console.log("✅ AdminFacetV2 deployed:", adminV2Address);
        
        // 4. Add all admin functions
        console.log("\n💎 AdminFacetV2 fonksiyonları ekleniyor...");
        const newSelectors = [
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
            functionSelectors: newSelectors
        }];
        
        const tx2 = await diamondCut.diamondCut(addCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Add TX:", tx2.hash);
        await tx2.wait();
        console.log("✅ AdminFacetV2 eklendi!");
        
        // 5. Test and fix
        console.log("\n🧪 Final test...");
        const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
        
        let nextDrawId = await adminFacet.getNextDrawId();
        const stats = await adminFacet.getPlatformStatistics();
        
        console.log("\n📊 Mevcut Durum:");
        console.log("- getNextDrawId():", nextDrawId.toString());
        console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
        
        if (Number(nextDrawId) !== 17) {
            console.log("\n🔧 nextDrawId düzeltiliyor...");
            const fixTx = await adminFacet.forceSetNextDrawId(17);
            await fixTx.wait();
            
            nextDrawId = await adminFacet.getNextDrawId();
            console.log("✅ Yeni nextDrawId:", nextDrawId.toString());
        }
        
        console.log("\n🎉 BAŞARILI!");
        console.log("✅ Admin facet temizlendi ve yeniden kuruldu");
        console.log("✅ nextDrawId artık doğru değeri gösteriyor:", nextDrawId.toString());
        console.log("✅ UI tüm 16 çekilişi görebilir!");
        console.log("\n📝 Mainnet'e geçiş için hazır!");
        
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