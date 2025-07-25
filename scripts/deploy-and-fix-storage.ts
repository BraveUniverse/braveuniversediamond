import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Kalıcı Storage Düzeltme İşlemi");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Önce mevcut durumu kontrol et
        console.log("\n📊 Mevcut Durum Analizi:");
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        const oldNextDrawId = await adminFacet.getNextDrawId();
        const stats = await adminFacet.getPlatformStatistics();
        
        console.log("- getNextDrawId():", oldNextDrawId.toString());
        console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
        console.log("- Sorun:", oldNextDrawId.toString(), "!=", (Number(stats.totalDrawsCreated) + 1).toString());

        // 2. New facet is already compiled

        // 3. Deploy GridottoStorageFixFacet
        console.log("\n📦 GridottoStorageFixFacet deploy ediliyor...");
        const GridottoStorageFixFacet = await ethers.getContractFactory("GridottoStorageFixFacet");
        const storageFix = await GridottoStorageFixFacet.deploy();
        await storageFix.waitForDeployment();
        const storageFixAddress = await storageFix.getAddress();
        console.log("✅ GridottoStorageFixFacet deployed:", storageFixAddress);

        // 4. Get function selectors
        console.log("\n🔍 Function selector'lar alınıyor...");
        const selectors = [
            storageFix.interface.getFunction("debugStorage").selector,
            storageFix.interface.getFunction("forceFixNextDrawId").selector,
            storageFix.interface.getFunction("resetBasedOnActualCount").selector,
            storageFix.interface.getFunction("manualStorageOverride").selector,
            storageFix.interface.getFunction("verifyStorageConsistency").selector
        ];

        // 5. Add to Diamond
        console.log("\n💎 Diamond'a ekleniyor...");
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const diamondCut = [{
            facetAddress: storageFixAddress,
            action: 0, // Add
            functionSelectors: selectors
        }];

        const tx1 = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ DiamondCut TX:", tx1.hash);
        await tx1.wait();
        console.log("✅ Facet eklendi!");

        // 6. Debug storage
        console.log("\n🔍 Storage Debug:");
        const storageFixFacet = await ethers.getContractAt("GridottoStorageFixFacet", DIAMOND_ADDRESS);
        const debugInfo = await storageFixFacet.debugStorage();
        
        console.log("- nextDrawId:", debugInfo.nextDrawId.toString());
        console.log("- totalDrawsCreated:", debugInfo.totalDrawsCreated.toString());
        console.log("- actualDrawCount:", debugInfo.actualDrawCount.toString());
        console.log("- storageSlot:", debugInfo.storageSlot);
        console.log("- hasInconsistency:", debugInfo.hasInconsistency);

        // 7. Fix the storage
        if (debugInfo.hasInconsistency) {
            console.log("\n🔧 Storage düzeltiliyor...");
            const tx2 = await storageFixFacet.forceFixNextDrawId();
            console.log("⏳ Fix TX:", tx2.hash);
            const receipt = await tx2.wait();
            console.log("✅ Storage düzeltildi!");
            console.log("- Gas kullanımı:", receipt.gasUsed.toString());

            // 8. Verify the fix
            console.log("\n✅ Düzeltme Doğrulaması:");
            const verification = await storageFixFacet.verifyStorageConsistency();
            console.log("- Tutarlı mı?:", verification.isConsistent);
            console.log("- Mesaj:", verification.message);
            console.log("- nextDrawId:", verification.nextDrawId.toString());
            console.log("- totalDrawsCreated:", verification.totalDrawsCreated.toString());
            console.log("- Beklenen nextDrawId:", verification.expectedNextDrawId.toString());

            // 9. Double check with AdminFacet
            console.log("\n🔍 AdminFacet ile kontrol:");
            const newNextDrawId = await adminFacet.getNextDrawId();
            console.log("- getNextDrawId():", newNextDrawId.toString());
            
            if (Number(newNextDrawId) === Number(stats.totalDrawsCreated) + 1) {
                console.log("\n🎉 BAŞARILI! Storage kalıcı olarak düzeltildi!");
                console.log("✅ nextDrawId artık doğru değeri gösteriyor:", newNextDrawId.toString());
            } else {
                console.log("\n⚠️  AdminFacet hala eski değeri gösteriyor.");
                console.log("💡 Manuel override gerekebilir:");
                console.log(`   await storageFixFacet.manualStorageOverride(${Number(stats.totalDrawsCreated) + 1}, ${stats.totalDrawsCreated})`);
            }
        } else {
            console.log("\n✅ Storage zaten tutarlı!");
        }

        // 10. Save deployment info
        const deploymentInfo = {
            facetName: "GridottoStorageFixFacet",
            address: storageFixAddress,
            deployedAt: new Date().toISOString(),
            network: "luksoTestnet",
            deployer: deployer.address,
            fixApplied: debugInfo.hasInconsistency,
            result: {
                oldNextDrawId: oldNextDrawId.toString(),
                newNextDrawId: (await adminFacet.getNextDrawId()).toString(),
                totalDrawsCreated: stats.totalDrawsCreated.toString()
            }
        };

        console.log("\n📝 Deployment bilgileri:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

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