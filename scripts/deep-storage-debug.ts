import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Deep Storage Debug - Raw Slot Analysis");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    try {
        const provider = ethers.provider;
        
        // Storage positions
        const GRIDOTTO_V2_STORAGE = ethers.keccak256(ethers.toUtf8Bytes("gridotto.storage.v2"));
        const ADMIN_STORAGE = ethers.keccak256(ethers.toUtf8Bytes("braveUniverse.storage.gridotto.admin"));
        
        console.log("\n📍 Storage Positions:");
        console.log("- Gridotto V2:", GRIDOTTO_V2_STORAGE);
        console.log("- Admin:", ADMIN_STORAGE);
        
        // nextDrawId is the first slot in the storage struct
        const nextDrawIdSlot = GRIDOTTO_V2_STORAGE;
        
        // Read raw storage
        console.log("\n🔍 Raw Storage Values:");
        const rawNextDrawId = await provider.getStorage(DIAMOND_ADDRESS, nextDrawIdSlot);
        console.log("- Raw nextDrawId slot value:", rawNextDrawId);
        console.log("- Decoded nextDrawId:", ethers.toBigInt(rawNextDrawId).toString());
        
        // totalDrawsCreated is at position 1
        const totalDrawsCreatedSlot = ethers.toBigInt(GRIDOTTO_V2_STORAGE) + 1n;
        const rawTotalDrawsCreated = await provider.getStorage(DIAMOND_ADDRESS, "0x" + totalDrawsCreatedSlot.toString(16));
        console.log("- Raw totalDrawsCreated slot value:", rawTotalDrawsCreated);
        console.log("- Decoded totalDrawsCreated:", ethers.toBigInt(rawTotalDrawsCreated).toString());
        
        // Check via contracts
        console.log("\n📊 Contract Reads:");
        const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
        const storageFixFacet = await ethers.getContractAt("GridottoStorageFixFacet", DIAMOND_ADDRESS);
        
        console.log("- AdminFacet getNextDrawId():", (await adminFacet.getNextDrawId()).toString());
        const debugInfo = await storageFixFacet.debugStorage();
        console.log("- StorageFixFacet nextDrawId:", debugInfo.nextDrawId.toString());
        
        // THE SOLUTION
        console.log("\n💡 ÇÖZÜM:");
        console.log("Raw storage'da nextDrawId =", ethers.toBigInt(rawNextDrawId).toString());
        console.log("Bu değer 3 ise, storage gerçekten 3'tür.");
        console.log("StorageFixFacet farklı bir değer gösteriyorsa, farklı bir storage slot okuyor olabilir.");
        
        // Try to fix by writing directly to storage (if we had access)
        console.log("\n🔧 ÖNERİLEN ÇÖZÜM:");
        console.log("1. Yeni bir FixFacet yaz ki direkt doğru storage slot'a yazsın");
        console.log("2. Ya da mevcut CoreFacet'te bir admin fonksiyonu ekle:");
        console.log("   function forceSetNextDrawId(uint256 _value) external onlyOwner {");
        console.log("       LibGridottoStorageV2.layout().nextDrawId = _value;");
        console.log("   }");
        
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