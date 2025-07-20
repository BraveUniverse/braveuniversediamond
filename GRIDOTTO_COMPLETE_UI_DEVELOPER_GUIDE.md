# Gridotto Smart Contract - Complete UI Developer Guide

## 📚 İçindekiler
1. [Kritik Uyarılar](#kritik-uyarılar)
2. [Temel Kavramlar](#temel-kavramlar)
3. [Çekiliş Oluşturma Fonksiyonları](#çekiliş-oluşturma-fonksiyonları)
4. [Bilet Satın Alma Fonksiyonları](#bilet-satın-alma-fonksiyonları)
5. [Ödül Talep Fonksiyonları](#ödül-talep-fonksiyonları)
6. [Sorgulama Fonksiyonları](#sorgulama-fonksiyonları)
7. [Yönetici Fonksiyonları](#yönetici-fonksiyonları)
8. [Enum ve Struct Referansı](#enum-ve-struct-referansı)
9. [Hata Kodları ve Çözümleri](#hata-kodları-ve-çözümleri)
10. [Best Practices](#best-practices)

---

## 🚨 Kritik Uyarılar

### 1. Struct Parametreleri
```javascript
// ❌ YANLIŞ - Düz obje göndermeyin
await contract.createAdvancedDraw(drawType, {
    ticketPrice: "1000000000000000000",
    duration: 604800
    // ...
});

// ✅ DOĞRU - Tam struct formatında gönderin
const config = {
    ticketPrice: "1000000000000000000",
    duration: 604800,
    maxTickets: 100, // ZORUNLU ve > 0
    initialPrize: "1000000000000000000",
    requirement: 0,
    requiredToken: "0x0000000000000000000000000000000000000000", // undefined DEĞİL!
    minTokenAmount: 0, // undefined DEĞİL!
    prizeConfig: { /* tam struct */ },
    lsp26Config: { /* tam struct */ },
    tokenAddress: "0x0000000000000000000000000000000000000000",
    nftContract: "0x0000000000000000000000000000000000000000",
    nftTokenIds: [],
    tiers: []
};
```

### 2. Wei/Ether Dönüşümleri
```javascript
// ❌ YANLIŞ
const price = 1; // 1 wei!

// ✅ DOĞRU
const price = ethers.parseEther("1"); // 1 LYX = 1000000000000000000 wei
```

### 3. Gas ve Value
```javascript
// LYX çekilişi oluştururken initialPrize kadar LYX gönderin
await contract.createAdvancedDraw(drawType, config, {
    value: config.initialPrize // Zorunlu!
});
```

---

## 📖 Temel Kavramlar

### Ödül Sistemi
- **Tüm ödüller CLAIMABLE** - Otomatik transfer YOK
- Gas ücretini **kazanan öder**
- Oracle ile güvenli random number generation

### Çekiliş Türleri
1. **USER_LYX (2)**: LYX ödüllü çekilişler
2. **USER_LSP7 (3)**: Token ödüllü çekilişler
3. **USER_LSP8 (4)**: NFT ödüllü çekilişler

### Fee Sistemi
- Platform fee: %5
- Creator fee: Max %10
- Executor reward: %5 (max 5 LYX)

---

## 🎲 Çekiliş Oluşturma Fonksiyonları

### 1. createAdvancedDraw - Gelişmiş Multi-Winner Çekiliş

**Fonksiyon İmzası:**
```solidity
function createAdvancedDraw(
    DrawType drawType,
    AdvancedDrawConfig calldata config
) external payable returns (uint256 drawId)
```

**JavaScript Kullanımı:**
```javascript
// ADIM 1: Form verilerini hazırlayın
const formData = {
    drawType: 'LYX', // 'LYX', 'TOKEN', veya 'NFT'
    ticketPrice: ethers.parseEther("0.1"), // 0.1 LYX per bilet
    duration: 7 * 24 * 60 * 60, // 7 gün
    maxTickets: 1000,
    numberOfWinners: 3,
    initialPrize: ethers.parseEther("10"), // 10 LYX ödül
    creatorFeePercent: 5,
    // Token/NFT gereksinimleri (opsiyonel)
    requirement: 0, // 0=YOK, 1=TOKEN_HOLDER, 2=NFT_HOLDER
    requiredToken: null,
    minTokenAmount: 0
};

// ADIM 2: DrawType enum değerini belirleyin
const DrawTypeEnum = {
    USER_LYX: 2,
    USER_LSP7: 3,
    USER_LSP8: 4
};

// ADIM 3: AdvancedDrawConfig struct'ını oluşturun
const config = {
    ticketPrice: formData.ticketPrice.toString(),
    duration: formData.duration,
    maxTickets: formData.maxTickets,
    initialPrize: formData.initialPrize.toString(),
    requirement: formData.requirement,
    requiredToken: formData.requiredToken || ethers.ZeroAddress,
    minTokenAmount: formData.minTokenAmount || 0,
    prizeConfig: {
        model: 0, // CREATOR_FUNDED
        creatorContribution: formData.initialPrize.toString(),
        addParticipationFees: formData.creatorFeePercent > 0,
        participationFeePercent: formData.creatorFeePercent,
        totalWinners: formData.numberOfWinners
    },
    lsp26Config: {
        requireFollowing: false,
        profileToFollow: ethers.ZeroAddress,
        minFollowers: 0,
        requireMutualFollow: false
    },
    tokenAddress: ethers.ZeroAddress,
    nftContract: ethers.ZeroAddress,
    nftTokenIds: [],
    tiers: []
};

// Multi-winner tier yapılandırması (opsiyonel)
if (formData.numberOfWinners > 1) {
    config.tiers = [
        {
            prizePercentage: 5000, // %50 (10000 = %100)
            fixedPrize: 0,
            nftTokenId: ethers.ZeroHash
        },
        {
            prizePercentage: 3000, // %30
            fixedPrize: 0,
            nftTokenId: ethers.ZeroHash
        },
        {
            prizePercentage: 2000, // %20
            fixedPrize: 0,
            nftTokenId: ethers.ZeroHash
        }
    ];
}

// ADIM 4: Transaction gönder
try {
    const tx = await contract.createAdvancedDraw(
        DrawTypeEnum.USER_LYX,
        config,
        { value: formData.initialPrize }
    );
    
    const receipt = await tx.wait();
    
    // Event'ten drawId'yi al
    const event = receipt.events.find(e => e.event === 'UserDrawCreated');
    const drawId = event.args.drawId;
    
    console.log("Çekiliş oluşturuldu! ID:", drawId.toString());
    
} catch (error) {
    console.error("Hata:", error.message);
    // Hata mesajlarını kullanıcı dostu hale getir
    if (error.message.includes("Invalid max tickets")) {
        alert("Maksimum bilet sayısı 1 ile 10000 arasında olmalıdır");
    }
}
```

**Validasyon Kuralları:**
- `ticketPrice` > 0
- `duration`: Min 1 saat, Max 30 gün
- `maxTickets`: 1-10000 arası
- `totalWinners`: 1-100 arası
- `creatorFeePercent`: 0-10 arası

---

### 2. createTokenDraw - Basit Token Çekilişi

**Fonksiyon İmzası:**
```solidity
function createTokenDraw(
    address tokenAddress,
    uint256 initialPrize,
    uint256 ticketPriceLYX,
    uint256 duration,
    uint256 minParticipants,
    uint256 maxParticipants,
    uint256 creatorFeePercent
) external returns (uint256 drawId)
```

**JavaScript Kullanımı:**
```javascript
// Token approve işlemi (önce yapılmalı)
const tokenContract = await ethers.getContractAt("ILSP7DigitalAsset", tokenAddress);
await tokenContract.approve(gridottoAddress, initialPrize);

// Çekiliş oluştur
const params = {
    tokenAddress: "0x123...", // LSP7 token adresi
    initialPrize: ethers.parseUnits("1000", 18), // 1000 token
    ticketPriceLYX: ethers.parseEther("0.1"), // 0.1 LYX per bilet
    duration: 3 * 24 * 60 * 60, // 3 gün
    minParticipants: 10,
    maxParticipants: 500,
    creatorFeePercent: 5
};

const tx = await contract.createTokenDraw(
    params.tokenAddress,
    params.initialPrize,
    params.ticketPriceLYX,
    params.duration,
    params.minParticipants,
    params.maxParticipants,
    params.creatorFeePercent
);

const receipt = await tx.wait();
console.log("Token çekilişi oluşturuldu!");
```

---

### 3. createNFTDraw - NFT Çekilişi

**Fonksiyon İmzası:**
```solidity
function createNFTDraw(
    address nftContract,
    bytes32 tokenId,
    uint256 ticketPrice,
    uint256 duration,
    uint256 minParticipants,
    uint256 maxParticipants
) external returns (uint256 drawId)
```

**JavaScript Kullanımı:**
```javascript
// NFT approve işlemi (önce yapılmalı)
const nftContract = await ethers.getContractAt("ILSP8IdentifiableDigitalAsset", nftAddress);
await nftContract.approve(gridottoAddress, tokenId, true, "0x");

// NFT çekilişi oluştur
const params = {
    nftContract: "0x456...",
    tokenId: "0x0000000000000000000000000000000000000000000000000000000000000001",
    ticketPrice: ethers.parseEther("0.5"), // 0.5 LYX per bilet
    duration: 7 * 24 * 60 * 60, // 7 gün
    minParticipants: 5,
    maxParticipants: 100
};

const tx = await contract.createNFTDraw(
    params.nftContract,
    params.tokenId,
    params.ticketPrice,
    params.duration,
    params.minParticipants,
    params.maxParticipants
);
```

---

## 🎫 Bilet Satın Alma Fonksiyonları

### 1. buyUserDrawTicket - Kullanıcı Çekilişi Bileti

**Fonksiyon İmzası:**
```solidity
function buyUserDrawTicket(
    uint256 drawId,
    uint256 amount
) external payable
```

**JavaScript Kullanımı:**
```javascript
// Önce çekiliş bilgilerini al
const drawInfo = await contract.getAdvancedDrawInfo(drawId);
const ticketPrice = drawInfo[4]; // ticketPrice
const isActive = drawInfo[3] > Date.now() / 1000; // endTime > now

if (!isActive) {
    alert("Bu çekiliş sona ermiş!");
    return;
}

// Bilet satın al
const ticketCount = 5; // 5 bilet
const totalCost = BigInt(ticketPrice) * BigInt(ticketCount);

try {
    const tx = await contract.buyUserDrawTicket(
        drawId,
        ticketCount,
        { value: totalCost.toString() }
    );
    
    await tx.wait();
    console.log(`${ticketCount} bilet satın alındı!`);
    
} catch (error) {
    if (error.message.includes("Draw ended")) {
        alert("Çekiliş sona erdi!");
    } else if (error.message.includes("Exceeds max tickets")) {
        alert("Maksimum bilet sayısı aşıldı!");
    }
}
```

**Katılım Kontrolü:**
```javascript
// Kullanıcının katılıp katılamayacağını kontrol et
const [canParticipate, reason] = await contract.canUserParticipate(drawId, userAddress);

if (!canParticipate) {
    alert(`Katılamazsınız: ${reason}`);
    return;
}
```

---

### 2. buyTickets - Resmi Haftalık Çekiliş Bileti

**Fonksiyon İmzası:**
```solidity
function buyTickets(uint256 amount) external payable
```

**JavaScript Kullanımı:**
```javascript
// Bilet fiyatını öğren
const ticketPrice = await contract.getTicketPrice();

// 10 bilet satın al
const amount = 10;
const totalCost = BigInt(ticketPrice) * BigInt(amount);

const tx = await contract.buyTickets(amount, {
    value: totalCost.toString()
});

await tx.wait();
console.log("Resmi çekiliş biletleri alındı!");
```

---

## 💰 Ödül Talep Fonksiyonları

### 1. claimPrize - LYX Ödülü Talep Et

**Fonksiyon İmzası:**
```solidity
function claimPrize() external
```

**JavaScript Kullanımı:**
```javascript
// Bekleyen ödül kontrolü
const pendingPrize = await contract.getPendingPrize(userAddress);

if (pendingPrize > 0) {
    const tx = await contract.claimPrize();
    await tx.wait();
    
    console.log(`${ethers.formatEther(pendingPrize)} LYX talep edildi!`);
} else {
    console.log("Bekleyen LYX ödülü yok");
}
```

---

### 2. claimTokenPrize - Token Ödülü Talep Et

**Fonksiyon İmzası:**
```solidity
function claimTokenPrize(address token) external
```

**JavaScript Kullanımı:**
```javascript
// Belirli bir token için ödül talep et
const tokenAddress = "0x123...";

try {
    const tx = await contract.claimTokenPrize(tokenAddress);
    await tx.wait();
    console.log("Token ödülü talep edildi!");
} catch (error) {
    if (error.message.includes("No token prize")) {
        console.log("Bu token için ödül yok");
    }
}
```

---

### 3. claimNFTPrize - NFT Ödülü Talep Et

**Fonksiyon İmzası:**
```solidity
function claimNFTPrize(address nftContract) external
```

**JavaScript Kullanımı:**
```javascript
const nftContract = "0x456...";

const tx = await contract.claimNFTPrize(nftContract);
await tx.wait();
console.log("NFT ödülü talep edildi!");
```

---

### 4. claimAll - Tüm Ödülleri Toplu Talep Et

**Fonksiyon İmzası:**
```solidity
function claimAll() external returns (uint256 totalClaimed)
```

**JavaScript Kullanımı:**
```javascript
// Önce bekleyen ödülleri kontrol et
const prizes = await contract.getAllClaimablePrizes(userAddress);

console.log("Bekleyen LYX:", ethers.formatEther(prizes.totalLYX));
console.log("Token ödülü var mı:", prizes.hasTokenPrizes);
console.log("NFT ödülü var mı:", prizes.hasNFTPrizes);

if (prizes.totalLYX > 0 || prizes.hasTokenPrizes || prizes.hasNFTPrizes) {
    const tx = await contract.claimAll();
    const receipt = await tx.wait();
    
    // Event'ten talep edilen miktarı al
    const event = receipt.events.find(e => e.event === 'BatchClaimCompleted');
    const totalClaimed = event.args.totalAmount;
    
    console.log(`Toplam ${ethers.formatEther(totalClaimed)} LYX değerinde ödül talep edildi!`);
}
```