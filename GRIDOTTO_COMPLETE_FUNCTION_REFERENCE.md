# 📚 Gridotto Complete Function Reference for UI Development

## 🎮 GridottoFacet - Base Lottery Functions

### 1. **buyTickets(uint256 amount)**
- **Açıklama**: Resmi haftalık çekiliş için bilet satın al
- **Parametreler**: 
  - `amount`: Alınacak bilet sayısı
- **Ödeme**: `msg.value = amount * ticketPrice` (0.01 LYX per bilet)
- **Returns**: -
- **Events**: `TicketsPurchased(address buyer, uint256 drawNumber, uint256 amount)`
- **UI Notu**: Kullanıcı bilet sayısını girer, otomatik fiyat hesaplanır

### 2. **buyMonthlyTickets(uint256 amount)**
- **Açıklama**: Resmi aylık çekiliş için bilet satın al
- **Parametreler**: 
  - `amount`: Alınacak bilet sayısı
- **Ödeme**: `msg.value = amount * ticketPrice`
- **Returns**: -
- **Events**: `MonthlyTicketsPurchased(address buyer, uint256 drawNumber, uint256 amount)`

### 3. **claimPrize()**
- **Açıklama**: Bekleyen LYX ödüllerini talep et
- **Parametreler**: -
- **Returns**: -
- **Events**: `PrizeClaimed(address winner, uint256 amount)`
- **UI Notu**: Kullanıcının bekleyen ödülü varsa buton aktif

### 4. **getPendingPrize(address user)**
- **Açıklama**: Kullanıcının bekleyen ödül miktarını sorgula
- **Parametreler**: 
  - `user`: Kullanıcı adresi
- **Returns**: `uint256` - Bekleyen LYX miktarı
- **Gas**: View function (ücretsiz)

### 5. **getTicketPrice()**
- **Açıklama**: Bilet fiyatını öğren
- **Returns**: `uint256` - Bilet fiyatı (wei cinsinden)
- **Gas**: View function
- **UI Notu**: Default 0.01 LYX

### 6. **getDrawInfo()**
- **Açıklama**: Aktif çekiliş bilgilerini al
- **Returns**: 
  - `currentDraw`: Güncel çekiliş numarası
  - `currentMonthlyDraw`: Güncel aylık çekiliş numarası
  - `drawTime`: Sonraki haftalık çekiliş zamanı
  - `monthlyDrawTime`: Sonraki aylık çekiliş zamanı

## 🎨 GridottoPhase3Facet - Token & NFT Functions

### 1. **createTokenDraw()**
```solidity
function createTokenDraw(
    address tokenAddress,
    uint256 initialPrize,    // Başlangıç ödülü (opsiyonel, 0 olabilir)
    uint256 ticketPriceLYX,
    uint256 duration,
    uint256 minParticipants,
    uint256 maxParticipants,
    uint256 creatorFeePercent
) external payable
```
- **Açıklama**: LSP7 token ödüllü çekiliş oluştur
- **Parametreler**:
  - `tokenAddress`: Ödül token adresi
  - `initialPrize`: Başlangıç ödülü (0 = sadece bilet satışlarından oluşacak)
  - `ticketPriceLYX`: Bilet fiyatı (0 = ücretsiz) ⚡ **OPSİYONEL**
  - `duration`: Çekiliş süresi (saniye)
  - `minParticipants`: Min katılımcı (0 = limit yok) ⚡ **OPSİYONEL**
  - `maxParticipants`: Max katılımcı (0 = limit yok) ⚡ **OPSİYONEL**
  - `creatorFeePercent`: Creator ücreti (0-10%) ⚡ **OPSİYONEL**
- **Ödeme**: Ücretsiz (çekiliş oluşturma ücreti yok)
- **Returns**: `uint256 drawId`
- **UI Notları**:
  - Ücretsiz çekiliş için ticketPrice = 0
  - Creator fee almak istemezse = 0
  - Katılımcı limiti istemezse min/max = 0
  - Platform her durumda %5 alır

### 2. **createNFTDraw()**
```solidity
function createNFTDraw(
    address nftContract,
    bytes32 tokenId,
    uint256 ticketPrice,
    uint256 duration,
    uint256 minParticipants,
    uint256 maxParticipants
) external payable
```
- **Açıklama**: LSP8 NFT ödüllü çekiliş oluştur
- **Parametreler**:
  - `nftContract`: NFT kontrat adresi
  - `tokenId`: NFT token ID
  - `ticketPrice`: Bilet fiyatı (0 = ücretsiz) ⚡ **OPSİYONEL**
  - `duration`: Çekiliş süresi
  - `minParticipants`: Min katılımcı ⚡ **OPSİYONEL**
  - `maxParticipants`: Max katılımcı ⚡ **OPSİYONEL**
- **Ödeme**: Ücretsiz
- **Returns**: `uint256 drawId`
- **Not**: NFT çekilişlerinde ücret alınırsa %5'i platform, kalanı creator'a gider

### 3. **buyUserDrawTicket(uint256 drawId, uint256 amount)**
- **Açıklama**: Kullanıcı çekilişine katıl
- **Parametreler**:
  - `drawId`: Çekiliş ID
  - `amount`: Bilet sayısı
- **Ödeme**: `amount * ticketPrice` (ücretsizse 0)
- **Events**: `UserDrawTicketPurchased`

### 4. **executeUserDraw(uint256 drawId)**
- **Açıklama**: Çekilişi sonuçlandır
- **Parametreler**: 
  - `drawId`: Çekiliş ID
- **Koşullar**: 
  - Süre dolmuş olmalı
  - Min katılımcı sağlanmış olmalı
- **Executor Ödülü**: 
  - LYX: Toplanan ücretlerin %5'i (max 5 LYX)
  - Token: Toplanan ücretlerin %5'i (limit yok)
  - NFT: Ücret alınmıyorsa executor ödülü yok
- **Events**: `UserDrawExecuted`

### 5. **claimTokenPrize(address token)**
- **Açıklama**: Token ödülünü talep et
- **Parametreler**:
  - `token`: Token adresi
- **Events**: `TokenPrizeClaimed`

### 6. **claimNFTPrize(address nftContract)**
- **Açıklama**: NFT ödülünü talep et
- **Parametreler**:
  - `nftContract`: NFT kontrat adresi
- **Events**: `NFTPrizeClaimed`

## 🏆 GridottoPhase4Facet - Advanced Multi-Winner Functions

### 1. **createAdvancedDraw()**
```solidity
function createAdvancedDraw(
    AdvancedDrawConfig memory config
) external payable returns (uint256)
```

**AdvancedDrawConfig Struct**:
```solidity
struct AdvancedDrawConfig {
    // Temel bilgiler
    DrawType drawType;           // USER_LYX, USER_LSP7, USER_LSP8
    uint256 ticketPrice;         // 0 = ücretsiz ⚡ **OPSİYONEL**
    uint256 duration;            // Süre (saniye)
    
    // Ödül yapılandırması
    address prizeToken;          // Token/NFT adresi (LYX ise 0x0)
    uint256 initialPrize;        // Başlangıç ödülü (opsiyonel)
    bytes32[] nftTokenIds;       // NFT'ler için token ID'ler
    
    // Multi-winner yapılandırması
    uint256 numberOfWinners;     // 1-100 arası kazanan sayısı
    PrizeTier[] tiers;          // Kademeli ödül dağılımı ⚡ **OPSİYONEL**
    
    // Katılım gereksinimleri ⚡ TAMAMEN OPSİYONEL
    ParticipationRequirement requirement; // NONE, TOKEN_HOLDER, NFT_HOLDER, MIN_FOLLOWERS
    address requiredToken;       // Gerekli token/NFT adresi
    uint256 minTokenAmount;      // Min token miktarı
    uint256 minFollowers;        // Min takipçi sayısı
    
    // Ücretler ⚡ OPSİYONEL
    uint256 creatorFeePercent;   // 0-10% arası, 0 = ücretsiz
    
    // Limitler ⚡ OPSİYONEL
    uint256 minParticipants;     // 0 = limit yok
    uint256 maxParticipants;     // 0 = limit yok
    uint256 maxTicketsPerUser;   // 0 = limit yok
}
```

**PrizeTier Struct**:
```solidity
struct PrizeTier {
    uint256 winnerCount;        // Bu kademedeki kazanan sayısı
    uint256 prizePercentage;    // Ödül yüzdesi (10000 = %100)
    uint256 fixedPrizeAmount;   // Sabit ödül (percentage yerine)
    bytes32 specificNFTId;      // Belirli NFT (NFT draw için)
}
```

**UI Notları**:
- Basit çekiliş için sadece `numberOfWinners = 1` ve tiers boş bırak
- Eşit dağıtım için tiers boş bırak, otomatik eşit dağıtılır
- Özel dağıtım için tiers doldur
- Katılım şartı istemiyorsan `requirement = NONE`
- Creator fee istemiyorsan `creatorFeePercent = 0`

### 2. **getAdvancedDrawInfo(uint256 drawId)**
- **Açıklama**: Detaylı çekiliş bilgilerini al
- **Returns** (sırasıyla):
  1. `creator`: Çekiliş oluşturan (address)
  2. `drawType`: Çekiliş tipi (DrawType enum)
  3. `startTime`: Başlangıç zamanı (uint256)
  4. `endTime`: Bitiş zamanı (uint256)
  5. `ticketPrice`: Bilet fiyatı (uint256)
  6. `totalTickets`: Satılan toplam bilet (uint256)
  7. `participantCount`: Katılımcı sayısı (uint256)
  8. `prizePool`: Güncel ödül havuzu (uint256)
  9. `tokenAddress`: Token adresi (address, LSP7 için)
  10. `nftContract`: NFT kontrat adresi (address, LSP8 için)
  11. `nftCount`: NFT sayısı (uint256, LSP8 için)
  12. `isCompleted`: Tamamlandı mı (bool)
  13. `winners`: Kazananlar listesi (address[])
  14. `minParticipants`: Min katılımcı (uint256)
  15. `maxParticipants`: Max katılımcı (uint256)
  16. `requirement`: Katılım şartı (ParticipationRequirement)
  17. `executorReward`: Hesaplanan executor ödülü (uint256)
- **Gas**: View function

### 3. **getDrawExecutorReward(uint256 drawId)**
- **Açıklama**: Çekilişi sonuçlandıracak kişinin alacağı ödülü hesapla
- **Returns**: `uint256` - Executor ödülü (wei)
- **Formül**: 
  - LYX: Toplanan ücretlerin %5'i (max 5 LYX)
  - Token: Toplanan ücretlerin %5'i (limit yok)
- **UI Notu**: "Execute draw and earn X LYX" şeklinde göster

## 👨‍💼 AdminFacet - Admin Functions

### 1. **setPlatformFee(uint256 newFee)**
- **Açıklama**: Platform ücretini ayarla
- **Parametreler**: 
  - `newFee`: Yeni ücret (10000 = %100, max %50)
- **Yetki**: Sadece owner
- **Default**: %5

### 2. **withdrawPlatformFees()**
- **Açıklama**: Biriken platform ücretlerini çek
- **Returns**: Çekilen miktar
- **Yetki**: Sadece owner

## 🔧 GridottoUIHelperFacet - UI Helper Functions

### 1. **getUserCreatedDraws(address creator, uint256 offset, uint256 limit)**
- **Açıklama**: Kullanıcının oluşturduğu çekilişler
- **Returns**: `uint256[]` - Draw ID listesi
- **Pagination**: offset ve limit ile sayfalama

### 2. **getActiveUserDraws(uint256 limit)**
- **Açıklama**: Aktif kullanıcı çekilişleri
- **Returns**: 
  - `drawIds`: Çekiliş ID'leri
  - `creators`: Oluşturanlar
  - `endTimes`: Bitiş zamanları

### 3. **getAllClaimablePrizes(address user)**
- **Açıklama**: Kullanıcının tüm bekleyen ödülleri
- **Returns**:
  - `totalLYX`: Toplam LYX
  - `hasTokenPrizes`: Token ödülü var mı
  - `hasNFTPrizes`: NFT ödülü var mı

### 4. **getUserDrawStats(uint256 drawId)**
- **Açıklama**: Çekiliş istatistikleri
- **Returns**:
  - `creator`: Oluşturan
  - `endTime`: Bitiş zamanı
  - `prizePool`: Ödül havuzu
  - `participantCount`: Katılımcı sayısı
  - `ticketsSold`: Satılan bilet

### 5. **getOfficialDrawInfo()**
- **Açıklama**: Resmi çekiliş bilgileri
- **Returns**: Tüm resmi çekiliş detayları

### 6. **getUserDrawExecutorReward(uint256 drawId)**
- **Açıklama**: Kullanıcı çekilişi için executor reward hesapla
- **Returns**: `uint256` - Executor alacağı miktar
- **Formül**: 
  - LYX: Toplanan ücretlerin %5'i (max 5 LYX)
  - Token: Toplanan ücretlerin %5'i (limit yok)
- **UI Notu**: Execute butonunda göster

### 7. **getDrawParticipants(uint256 drawId, uint256 offset, uint256 limit)**
- **Açıklama**: Çekiliş katılımcılarını listele
- **Returns**: 
  - `participants`: Katılımcı adresleri
  - `ticketCounts`: Her katılımcının bilet sayısı
- **Pagination**: Sayfalama destekli

### 8. **canUserParticipate(uint256 drawId, address user)**
- **Açıklama**: Kullanıcının çekilişe katılıp katılamayacağını kontrol et
- **Returns**: 
  - `canParticipate`: Katılabilir mi (bool)
  - `reason`: Katılamazsa nedeni (string)
- **UI Notu**: Katıl butonu aktif/pasif durumu için kullan

### 9. **getUserParticipationHistory(address user, uint256 offset, uint256 limit)**
- **Açıklama**: Kullanıcının katıldığı çekilişler
- **Returns**: 
  - `drawIds`: Katıldığı çekiliş ID'leri
  - `ticketsBought`: Alınan bilet sayıları
  - `won`: Kazanıp kazanmadığı (bool array)
- **UI Notu**: Kullanıcı profil sayfası için

### 10. **getRecentWinners(uint256 offset, uint256 limit)**
- **Açıklama**: Son kazananlar listesi (leaderboard için)
- **Returns**: `WinnerInfo[]` - Kazanan bilgileri
  - `winner`: Kazanan adresi
  - `drawId`: Çekiliş ID
  - `drawType`: Çekiliş tipi
  - `prizeAmount`: Kazanılan miktar
  - `prizeToken`: Token adresi (LYX ise 0x0)
  - `nftTokenId`: NFT ID (NFT ödülü için)
  - `drawCreator`: Çekilişi oluşturan
  - `timestamp`: Kazanma zamanı
- **UI Notu**: En yeniden eskiye doğru sıralı

## 🚀 GridottoBatchFacet - Batch Operations

### 1. **claimAll()**
- **Açıklama**: Tüm ödülleri tek seferde talep et
- **Returns**: Talep edilen toplam LYX
- **Gas Tasarrufu**: %50'ye kadar

### 2. **batchTransferLYX(address[] recipients, uint256[] amounts)**
- **Açıklama**: Çoklu LYX transferi
- **Kullanım**: Airdrop veya toplu ödeme için

### 3. **batchGetUserDrawInfo(uint256[] drawIds)**
- **Açıklama**: Çoklu çekiliş bilgisi sorgula
- **Returns**: Her çekiliş için detaylar

## 💡 UI Implementation Tips

### Çekiliş Oluşturma Formu
```javascript
// Minimum gerekli alanlar
const createDraw = {
  drawType: "USER_LYX",        // Zorunlu
  duration: 86400,             // Zorunlu (1 gün)
  initialPrize: 0,             // Opsiyonel başlangıç ödülü
  
  // Opsiyonel alanlar (UI'da toggle/checkbox ile)
  ticketPrice: 0,              // "Ücretsiz çekiliş" checkbox
  creatorFeePercent: 0,        // "Komisyon al" toggle (max %10)
  minParticipants: 0,          // "Min katılımcı şartı" toggle
  maxParticipants: 0,          // "Max katılımcı limiti" toggle
  numberOfWinners: 1,          // "Çoklu kazanan" toggle
  requirement: "NONE",         // "Katılım şartı" dropdown
}
```

### Executor Reward Gösterimi
```javascript
// Çekilişi sonuçlandır butonu
const executorReward = await contract.getDrawExecutorReward(drawId);
if (executorReward > 0) {
  button.text = `Execute & Earn ${formatEther(executorReward)} LYX`;
} else {
  button.text = "Execute Draw";
}
```

### Ödül Talep Butonu
```javascript
// Tek butonla tüm ödülleri göster
const prizes = await contract.getAllClaimablePrizes(userAddress);
if (prizes.totalLYX > 0 || prizes.hasTokenPrizes || prizes.hasNFTPrizes) {
  claimButton.show();
  claimButton.text = `Claim ${formatEther(prizes.totalLYX)} LYX`;
  if (prizes.hasTokenPrizes) claimButton.text += " + Tokens";
  if (prizes.hasNFTPrizes) claimButton.text += " + NFTs";
}
```

## 🔄 Platform Sistematiği

### Fee Dağılımı:
- **Platform Fee**: Her durumda %5
- **Executor Fee**: Toplanan ücretlerin %5'i (LYX'de max 5 LYX)
- **Creator Fee**: Max %10 (opsiyonel)

### Ödül Havuzu Hesaplama:
```
Toplam Havuz = Başlangıç Ödülü + (Bilet Satışları - Platform Fee - Executor Fee - Creator Fee)
```

### NFT Çekilişleri:
- Creator fee yoktur
- Ücret alınırsa: %5 platform, kalanı creator'a
- Ücretsizse: Executor ödülü yok

## 🎯 Özet

**Opsiyonel Parametreler**:
1. `ticketPrice = 0` → Ücretsiz çekiliş
2. `creatorFeePercent = 0` → Creator komisyon almaz (max %10)
3. `minParticipants = 0` → Min katılımcı şartı yok
4. `maxParticipants = 0` → Max katılımcı limiti yok
5. `requirement = NONE` → Katılım şartı yok
6. `tiers = []` → Eşit ödül dağıtımı
7. `initialPrize = 0` → Sadece bilet satışlarından oluşan havuz

**Executor Rewards**:
- Formül: `(ticketsSold * ticketPrice * 5%) / 100`
- LYX çekilişlerde max 5 LYX
- Token çekilişlerde limit yok
- Ücretsiz çekilişlerde: 0
- `getDrawExecutorReward(drawId)` ile sorgula

**UI Best Practices**:
1. Form'da opsiyonel alanları toggle/checkbox ile göster
2. Executor reward'ı buton üzerinde göster
3. Tüm ödülleri tek "Claim All" butonu ile topla
4. Çekiliş tipine göre dinamik form alanları
5. Real-time validation ve gas tahmini
6. Leaderboard için getRecentWinners kullan
