import { ethers } from "hardhat";

async function main() {
    console.log("🔧 GridottoFixFacet Deployment");
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

    try {
        // 1. Deploy GridottoFixFacet
        console.log("\n📦 GridottoFixFacet deploy ediliyor...");
        const GridottoFixFacet = await ethers.getContractFactory("GridottoFixFacet");
        const fixFacet = await GridottoFixFacet.deploy();
        await fixFacet.waitForDeployment();
        const fixFacetAddress = await fixFacet.getAddress();
        console.log("✅ GridottoFixFacet deployed:", fixFacetAddress);

        // 2. Get function selectors
        console.log("\n🔍 Function selector'lar alınıyor...");
        const selectors = [
            fixFacet.interface.getFunction("fixNextDrawId").selector,
            fixFacet.interface.getFunction("syncNextDrawIdWithTotal").selector,
            fixFacet.interface.getFunction("getStorageDiagnostics").selector,
            fixFacet.interface.getFunction("setNextDrawId").selector
        ];
        
        console.log("📋 Selectors:");
        selectors.forEach((selector, index) => {
            const funcName = ["fixNextDrawId", "syncNextDrawIdWithTotal", "getStorageDiagnostics", "setNextDrawId"][index];
            console.log(`  - ${funcName}: ${selector}`);
        });

        // 3. Add facet to Diamond
        console.log("\n💎 Diamond'a ekleniyor...");
        const diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", DIAMOND_ADDRESS);
        
        const diamondCut = [{
            facetAddress: fixFacetAddress,
            action: 0, // Add
            functionSelectors: selectors
        }];

        const tx = await diamondCutFacet.diamondCut(diamondCut, ethers.ZeroAddress, "0x");
        console.log("⏳ Transaction gönderildi:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Diamond güncellendi!");
        console.log("  - Block:", receipt.blockNumber);
        console.log("  - Gas kullanımı:", receipt.gasUsed.toString());

        // 4. Test the diagnostics
        console.log("\n🔍 Storage durumu kontrol ediliyor...");
        const fixFacetContract = await ethers.getContractAt("GridottoFixFacet", DIAMOND_ADDRESS);
        const diagnostics = await fixFacetContract.getStorageDiagnostics();
        
        console.log("📊 Storage Diagnostics:");
        console.log("  - nextDrawId:", diagnostics.nextDrawId.toString());
        console.log("  - totalDrawsCreated:", diagnostics.totalDrawsCreated.toString());
        console.log("  - highestExistingId:", diagnostics.highestExistingId.toString());
        console.log("  - inconsistencyFound:", diagnostics.inconsistencyFound ? "❌ EVET" : "✅ HAYIR");

        if (diagnostics.inconsistencyFound) {
            console.log("\n⚠️  Storage tutarsızlığı tespit edildi!");
            console.log("🔧 Düzeltmek için şu komutu çalıştırın:");
            console.log("   npx hardhat run scripts/fix-storage.ts --network luksoTestnet");
        }

        // 5. Save deployment info
        const deploymentInfo = {
            facetName: "GridottoFixFacet",
            address: fixFacetAddress,
            deployedAt: new Date().toISOString(),
            network: "luksoTestnet",
            deployer: deployer.address,
            selectors: selectors
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