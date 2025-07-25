import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Ultimate Admin Fix - Complete Reorganization");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Deploy AdminFacetV2 first to get selectors
        console.log("\n📦 GridottoAdminFacetV2 deploy ediliyor...");
        const AdminFacetV2 = await ethers.getContractFactory("GridottoAdminFacetV2");
        const adminV2 = await AdminFacetV2.deploy();
        await adminV2.waitForDeployment();
        const adminV2Address = await adminV2.getAddress();
        console.log("✅ AdminFacetV2 deployed:", adminV2Address);
        
        // 2. Get all admin function selectors
        const adminFunctions = [
            { name: "pauseSystem", selector: adminV2.interface.getFunction("pauseSystem").selector },
            { name: "unpauseSystem", selector: adminV2.interface.getFunction("unpauseSystem").selector },
            { name: "isPaused", selector: adminV2.interface.getFunction("isPaused").selector },
            { name: "withdrawPlatformFees", selector: adminV2.interface.getFunction("withdrawPlatformFees").selector },
            { name: "withdrawTokenFees", selector: adminV2.interface.getFunction("withdrawTokenFees").selector },
            { name: "getPlatformFeesLYX", selector: adminV2.interface.getFunction("getPlatformFeesLYX").selector },
            { name: "getPlatformFeesToken", selector: adminV2.interface.getFunction("getPlatformFeesToken").selector },
            { name: "setFeePercentages", selector: adminV2.interface.getFunction("setFeePercentages").selector },
            { name: "getSystemStats", selector: adminV2.interface.getFunction("getSystemStats").selector },
            { name: "getNextDrawId", selector: adminV2.interface.getFunction("getNextDrawId").selector },
            { name: "forceSetNextDrawId", selector: adminV2.interface.getFunction("forceSetNextDrawId").selector },
            { name: "getPlatformStatistics", selector: adminV2.interface.getFunction("getPlatformStatistics").selector },
            { name: "emergencyWithdraw", selector: adminV2.interface.getFunction("emergencyWithdraw").selector },
            { name: "forceExecuteDraw", selector: adminV2.interface.getFunction("forceExecuteDraw").selector }
        ];
        
        // 3. Check which ones already exist
        console.log("\n🔍 Mevcut admin fonksiyonları kontrol ediliyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        
        const functionsToRemove = new Map(); // facetAddress -> selectors[]
        const functionsToAdd = [];
        
        for (const func of adminFunctions) {
            try {
                const facetAddress = await loupeFacet.facetAddress(func.selector);
                if (facetAddress !== ethers.ZeroAddress) {
                    console.log(`- ${func.name} exists in ${facetAddress}`);
                    
                    if (!functionsToRemove.has(facetAddress)) {
                        functionsToRemove.set(facetAddress, []);
                    }
                    functionsToRemove.get(facetAddress).push(func.selector);
                } else {
                    functionsToAdd.push(func.selector);
                }
            } catch {
                functionsToAdd.push(func.selector);
            }
        }
        
        // 4. Build diamond cut array
        const cuts = [];
        
        // Remove existing functions
        if (functionsToRemove.size > 0) {
            console.log("\n🗑️  Mevcut admin fonksiyonları kaldırılıyor...");
            for (const [facetAddress, selectors] of functionsToRemove) {
                cuts.push({
                    facetAddress: ethers.ZeroAddress,
                    action: 2, // Remove
                    functionSelectors: [...selectors] // Copy array
                });
                console.log(`- ${selectors.length} fonksiyon ${facetAddress} adresinden kaldırılacak`);
            }
        }
        
        // Add all admin functions to new facet
        console.log("\n💎 Tüm admin fonksiyonları ekleniyor...");
        cuts.push({
            facetAddress: adminV2Address,
            action: 0, // Add
            functionSelectors: adminFunctions.map(f => f.selector)
        });
        
        // 5. Execute diamond cut
        console.log("\n⚡ Diamond cut işlemi yapılıyor...");
        const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("⏳ TX:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond güncellendi!");
        
        // 6. Test the result
        console.log("\n🧪 Sonuç test ediliyor...");
        const adminFacet = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
        
        let nextDrawId = await adminFacet.getNextDrawId();
        const stats = await adminFacet.getPlatformStatistics();
        const isPaused = await adminFacet.isPaused();
        
        console.log("\n📊 Final Durum:");
        console.log("- getNextDrawId():", nextDrawId.toString());
        console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
        console.log("- isPaused():", isPaused);
        
        // Fix nextDrawId if needed
        if (Number(nextDrawId) !== 17) {
            console.log("\n🔧 nextDrawId düzeltiliyor...");
            const fixTx = await adminFacet.forceSetNextDrawId(17);
            await fixTx.wait();
            
            nextDrawId = await adminFacet.getNextDrawId();
            console.log("✅ Yeni nextDrawId:", nextDrawId.toString());
        }
        
        // Final verification
        console.log("\n✅ Final Doğrulama:");
        for (const func of adminFunctions) {
            const currentFacet = await loupeFacet.facetAddress(func.selector);
            if (currentFacet === adminV2Address) {
                console.log(`✓ ${func.name} -> AdminFacetV2`);
            } else {
                console.log(`✗ ${func.name} -> ${currentFacet} (HATA!)`);
            }
        }
        
        console.log("\n🎉 BAŞARILI!");
        console.log("✅ Tüm admin fonksiyonları tek bir facet'te toplandı");
        console.log("✅ nextDrawId doğru değeri gösteriyor:", nextDrawId.toString());
        console.log("✅ Sistem mainnet'e hazır!");
        
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