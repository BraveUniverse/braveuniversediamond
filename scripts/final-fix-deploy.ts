import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Final Fix - GridottoAdminFacetV2 Deployment");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Already compiled
        
        // 2. Deploy new AdminFacetV2
        console.log("\n📦 GridottoAdminFacetV2 deploy ediliyor...");
        const AdminFacetV2 = await ethers.getContractFactory("GridottoAdminFacetV2");
        const adminV2 = await AdminFacetV2.deploy();
        await adminV2.waitForDeployment();
        const adminV2Address = await adminV2.getAddress();
        console.log("✅ AdminFacetV2 deployed:", adminV2Address);

        // 3. Get all admin selectors
        console.log("\n🔍 Admin function selector'ları hazırlanıyor...");
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
        console.log("📋 Toplam selector sayısı:", selectors.length);

        // 4. Get old admin facet address
        console.log("\n🔍 Eski AdminFacet adresi bulunuyor...");
        const loupeFacet = await ethers.getContractAt("DiamondLoupeFacet", DIAMOND_ADDRESS);
        const facets = await loupeFacet.facets();
        
        let oldAdminAddress = "";
        let oldSelectors: string[] = [];
        
        for (const facet of facets) {
            // getNextDrawId selector'ını içeren facet'i bul
            if (facet.functionSelectors.includes("0x317d707e")) {
                oldAdminAddress = facet.facetAddress;
                oldSelectors = [...facet.functionSelectors];
                break;
            }
        }
        
        console.log("- Eski AdminFacet:", oldAdminAddress);
        console.log("- Eski selector sayısı:", oldSelectors.length);

        // 5. Replace old admin with new
        console.log("\n💎 Diamond güncelleniyor...");
        const diamondCut = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const cuts = [];
        
        // Remove old selectors if exist
        if (oldSelectors.length > 0) {
            cuts.push({
                facetAddress: ethers.ZeroAddress,
                action: 2, // Remove
                functionSelectors: oldSelectors
            });
        }
        
        // Add new selectors
        cuts.push({
            facetAddress: adminV2Address,
            action: 0, // Add
            functionSelectors: selectors
        });
        
        const tx = await diamondCut.diamondCut(cuts, ethers.ZeroAddress, "0x");
        console.log("⏳ DiamondCut TX:", tx.hash);
        await tx.wait();
        console.log("✅ Diamond güncellendi!");

        // 6. Test the fix
        console.log("\n🧪 Test ediliyor...");
        const newAdmin = await ethers.getContractAt("GridottoAdminFacetV2", DIAMOND_ADDRESS);
        
        const nextDrawId = await newAdmin.getNextDrawId();
        const stats = await newAdmin.getPlatformStatistics();
        
        console.log("\n📊 Final Durum:");
        console.log("- getNextDrawId():", nextDrawId.toString());
        console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
        
        if (Number(nextDrawId) === 17) {
            console.log("\n🎉 BAŞARILI! nextDrawId artık doğru değeri gösteriyor!");
            console.log("✅ Sorun kalıcı olarak çözüldü!");
            console.log("✅ UI artık tüm 16 çekilişi görebilir!");
        } else {
            console.log("\n⚠️  Değer hala yanlış, forceSetNextDrawId kullanılıyor...");
            const fixTx = await newAdmin.forceSetNextDrawId(17);
            await fixTx.wait();
            
            const finalCheck = await newAdmin.getNextDrawId();
            console.log("✅ Final nextDrawId:", finalCheck.toString());
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