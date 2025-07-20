# Gridotto Detaylı Fonksiyon Parametreleri Dökümanı

## GridottoFacet - Resmi Çekiliş Fonksiyonları

### 1. buyTickets(uint256 amount)
**Parametre:**
- `amount` (uint256): Alınacak bilet sayısı

**Ödeme:** Fonksiyon çağrılırken msg.value ile LYX gönderilmeli
**Return:** Yok
**Event:** TicketsPurchased

---

### 2. buyMonthlyTickets(uint256 amount)
**Parametre:**
- `amount` (uint256): Aylık çekiliş için alınacak bilet sayısı

**Ödeme:** msg.value gerekli
**Return:** Yok
**Event:** MonthlyTicketsPurchased

---

### 3. claimPrize()
**Parametre:** YOK
**Return:** Yok
**Event:** PrizeClaimed

---

### 4. getPendingPrize(address user)
**Parametre:**
- `user` (address): Sorgulanacak kullanıcı adresi

**Return:** uint256 - Bekleyen ödül miktarı (wei cinsinden)

---

### 5. getTicketPrice()
**Parametre:** YOK
**Return:** uint256 - Bilet fiyatı (wei)

---

### 6. getDrawInfo()
**Parametre:** YOK
**Return:** Tuple olarak:
- `currentDraw` (uint256): Aktif haftalık çekiliş numarası
- `currentMonthlyDraw` (uint256): Aktif aylık çekiliş numarası
- `drawTime` (uint256): Sonraki haftalık çekiliş timestamp'i
- `monthlyDrawTime` (uint256): Sonraki aylık çekiliş timestamp'i

---

### 7. getCurrentDrawPrize()
**Parametre:** YOK
**Return:** uint256 - Haftalık çekiliş ödül havuzu (wei)

---

### 8. getMonthlyPrize()
**Parametre:** YOK
**Return:** uint256 - Aylık çekiliş ödül havuzu (wei)

---

### 9. getUserTickets(address user, uint256 drawNumber)
**Parametreler (SIRASI ÖNEMLİ):**
1. `user` (address): Kullanıcı adresi
2. `drawNumber` (uint256): Çekiliş numarası

**Return:** uint256 - Kullanıcının o çekilişteki bilet sayısı

---

### 10. getUserMonthlyTickets(address user, uint256 drawNumber)
**Parametreler:**
1. `user` (address): Kullanıcı adresi
2. `drawNumber` (uint256): Aylık çekiliş numarası

**Return:** uint256 - Aylık çekilişteki bilet sayısı

---

### 11. getTotalTickets(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Çekiliş numarası

**Return:** uint256 - O çekilişte satılan toplam bilet

---

### 12. getTotalMonthlyTickets(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Aylık çekiliş numarası

**Return:** uint256 - Aylık çekilişte toplam bilet

---

### 13. getDrawWinner(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Çekiliş numarası

**Return:** address - Kazanan adresi (0x0 ise henüz çekilmemiş)

---

### 14. getMonthlyDrawWinner(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Aylık çekiliş numarası

**Return:** address - Aylık çekiliş kazananı

---

### 15. getDrawPrize(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Çekiliş numarası

**Return:** uint256 - O çekilişin ödül miktarı (wei)

---

### 16. getMonthlyDrawPrize(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Aylık çekiliş numarası

**Return:** uint256 - Aylık çekilişin ödülü (wei)

---

### 17. isDrawn(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Çekiliş numarası

**Return:** bool - true ise çekilmiş, false ise çekilmemiş

---

### 18. isMonthlyDrawn(uint256 drawNumber)
**Parametre:**
- `drawNumber` (uint256): Aylık çekiliş numarası

**Return:** bool

---

### 19. canExecuteDraw()
**Parametre:** YOK
**Return:** bool - Çekiliş zamanı geldiyse true

---

### 20. canExecuteMonthlyDraw()
**Parametre:** YOK
**Return:** bool

---

### 21. executeDraw()
**Parametre:** YOK
**Return:** Yok
**Not:** Çağıran kişi executor reward alır

---

### 22. executeMonthlyDraw()
**Parametre:** YOK
**Return:** Yok

---

### 23. getCreatorProfit(address creator)
**Parametre:**
- `creator` (address): Creator adresi

**Return:** uint256 - LYX cinsinden kazanç

---

### 24. getCreatorTokenProfit(address creator, address tokenAddress)
**Parametreler:**
1. `creator` (address): Creator adresi
2. `tokenAddress` (address): Token kontrat adresi

**Return:** uint256 - Token cinsinden kazanç

---

## GridottoPhase3Facet - Token & NFT Çekiliş Fonksiyonları

### 1. createTokenDraw(address tokenAddress, uint256 initialPrize, uint256 ticketPriceLYX, uint256 duration, uint256 minParticipants, uint256 maxParticipants, uint256 creatorFeePercent)
**Parametreler (SIRASI ÇOK ÖNEMLİ):**
1. `tokenAddress` (address): LSP7 token kontrat adresi
2. `initialPrize` (uint256): Başlangıç token ödülü (0 olabilir)
3. `ticketPriceLYX` (uint256): Bilet fiyatı wei cinsinden (0 = ücretsiz)
4. `duration` (uint256): Çekiliş süresi saniye cinsinden
5. `minParticipants` (uint256): Minimum katılımcı sayısı (0 = limit yok)
6. `maxParticipants` (uint256): Maximum katılımcı sayısı (0 = limit yok)
7. `creatorFeePercent` (uint256): Creator fee yüzdesi (0-10 arası)

**Return:** uint256 - Oluşturulan çekilişin ID'si
**Event:** TokenDrawCreated

---

### 2. createNFTDraw(address nftContract, bytes32 tokenId, uint256 ticketPrice, uint256 duration, uint256 minParticipants, uint256 maxParticipants)
**Parametreler:**
1. `nftContract` (address): LSP8 NFT kontrat adresi
2. `tokenId` (bytes32): NFT'nin token ID'si
3. `ticketPrice` (uint256): Bilet fiyatı wei cinsinden (0 = ücretsiz)
4. `duration` (uint256): Çekiliş süresi saniye cinsinden
5. `minParticipants` (uint256): Minimum katılımcı (0 = yok)
6. `maxParticipants` (uint256): Maximum katılımcı (0 = yok)

**Return:** uint256 - Draw ID
**Event:** NFTDrawCreated

---

### 3. buyUserDrawTicket(uint256 drawId, uint256 amount)
**Parametreler:**
1. `drawId` (uint256): Katılınacak çekilişin ID'si
2. `amount` (uint256): Alınacak bilet sayısı

**Ödeme:** Ücretli çekilişlerde msg.value gerekli
**Event:** UserDrawTicketPurchased

---

### 4. claimTokenPrize(address token)
**Parametre:**
- `token` (address): Talep edilecek token'ın kontrat adresi

**Return:** Yok
**Event:** TokenPrizeClaimed

---

### 5. claimNFTPrize(address nftContract)
**Parametre:**
- `nftContract` (address): NFT kontrat adresi

**Return:** Yok
**Event:** NFTPrizeClaimed

---

## GridottoPhase4Facet - Gelişmiş Multi-Winner Fonksiyonları

### 1. createAdvancedDraw(AdvancedDrawConfig memory config)
**Parametre:**
- `config` (AdvancedDrawConfig struct): Tüm çekiliş ayarları

**AdvancedDrawConfig Struct İçeriği:**
- `drawType` (DrawType enum): USER_LYX, USER_LSP7, USER_LSP8
- `ticketPrice` (uint256): Bilet fiyatı wei cinsinden
- `duration` (uint256): Süre saniye cinsinden
- `prizeToken` (address): Token adresi (LYX için 0x0)
- `initialPrize` (uint256): Başlangıç ödülü
- `nftTokenIds` (bytes32[]): NFT ID listesi
- `numberOfWinners` (uint256): Kazanan sayısı (1-100)
- `tiers` (PrizeTier[]): Ödül dağılım kademeleri
- `requirement` (ParticipationRequirement enum): Katılım şartı
- `requiredToken` (address): Gerekli token adresi
- `minTokenAmount` (uint256): Minimum token miktarı
- `minFollowers` (uint256): Minimum takipçi sayısı
- `creatorFeePercent` (uint256): Creator fee (0-10)
- `minParticipants` (uint256): Min katılımcı
- `maxParticipants` (uint256): Max katılımcı
- `maxTicketsPerUser` (uint256): Kişi başı max bilet

**Return:** uint256 - Draw ID

---

## GridottoUIHelperFacet - UI Yardımcı Fonksiyonları

### 1. getUserCreatedDraws(address creator, uint256 offset, uint256 limit)
**Parametreler:**
1. `creator` (address): Çekilişleri sorgulanan adres
2. `offset` (uint256): Başlangıç indeksi
3. `limit` (uint256): Döndürülecek maksimum sonuç (max 100)

**Return:** uint256[] - Draw ID listesi

---

### 2. getActiveUserDraws(uint256 limit)
**Parametre:**
- `limit` (uint256): Maksimum sonuç sayısı

**Return:** Tuple olarak:
- `drawIds` (uint256[]): Aktif çekiliş ID'leri
- `creators` (address[]): Çekiliş sahipleri
- `endTimes` (uint256[]): Bitiş zamanları

---

### 3. getAllClaimablePrizes(address user)
**Parametre:**
- `user` (address): Kullanıcı adresi

**Return:** Tuple olarak:
- `totalLYX` (uint256): Toplam bekleyen LYX
- `hasTokenPrizes` (bool): Token ödülü var mı
- `hasNFTPrizes` (bool): NFT ödülü var mı

---

### 4. getUserDrawStats(uint256 drawId)
**Parametre:**
- `drawId` (uint256): Çekiliş ID'si

**Return:** Tuple olarak:
- `creator` (address): Oluşturan
- `endTime` (uint256): Bitiş zamanı
- `prizePool` (uint256): Ödül havuzu
- `participantCount` (uint256): Katılımcı sayısı
- `ticketsSold` (uint256): Satılan bilet

---

### 5. getOfficialDrawInfo()
**Parametre:** YOK
**Return:** Tüm resmi çekiliş detayları struct olarak

---

### 6. getUserDrawExecutorReward(uint256 drawId)
**Parametre:**
- `drawId` (uint256): Çekiliş ID'si

**Return:** uint256 - Executor alacağı miktar (wei)

---

### 7. getDrawParticipants(uint256 drawId, uint256 offset, uint256 limit)
**Parametreler:**
1. `drawId` (uint256): Çekiliş ID'si
2. `offset` (uint256): Başlangıç indeksi
3. `limit` (uint256): Max sonuç (max 100)

**Return:** Tuple olarak:
- `participants` (address[]): Katılımcı adresleri
- `ticketCounts` (uint256[]): Her katılımcının bilet sayısı

---

### 8. canUserParticipate(uint256 drawId, address user)
**Parametreler:**
1. `drawId` (uint256): Çekiliş ID'si
2. `user` (address): Kontrol edilecek kullanıcı

**Return:** Tuple olarak:
- `canParticipate` (bool): Katılabilir mi
- `reason` (string): Katılamazsa nedeni

---

### 9. getUserParticipationHistory(address user, uint256 offset, uint256 limit)
**Parametreler:**
1. `user` (address): Kullanıcı adresi
2. `offset` (uint256): Başlangıç
3. `limit` (uint256): Max sonuç

**Return:** Tuple olarak:
- `drawIds` (uint256[]): Katıldığı çekilişler
- `ticketsBought` (uint256[]): Alınan biletler
- `won` (bool[]): Kazanıp kazanmadığı

---

### 10. getRecentWinners(uint256 offset, uint256 limit)
**Parametreler:**
1. `offset` (uint256): Başlangıç indeksi
2. `limit` (uint256): Max sonuç (max 100)

**Return:** WinnerInfo[] struct array
**WinnerInfo içeriği:**
- `winner` (address)
- `drawId` (uint256)
- `drawType` (DrawType enum)
- `prizeAmount` (uint256)
- `prizeToken` (address)
- `nftTokenId` (bytes32)
- `drawCreator` (address)
- `timestamp` (uint256)

---

### 11. getAdvancedDrawInfo(uint256 drawId)
**Parametre:**
- `drawId` (uint256): Çekiliş ID'si

**Return değerleri (SIRASI ÖNEMLİ):**
1. `creator` (address)
2. `drawType` (DrawType enum)
3. `startTime` (uint256)
4. `endTime` (uint256)
5. `ticketPrice` (uint256)
6. `totalTickets` (uint256)
7. `participantCount` (uint256)
8. `prizePool` (uint256)
9. `tokenAddress` (address)
10. `nftContract` (address)
11. `nftCount` (uint256)
12. `isCompleted` (bool)
13. `winners` (address[])
14. `minParticipants` (uint256)
15. `maxParticipants` (uint256)
16. `requirement` (ParticipationRequirement enum)
17. `executorReward` (uint256)

---

## GridottoBatchFacet - Toplu İşlem Fonksiyonları

### 1. claimAll()
**Parametre:** YOK
**Return:** uint256 - Talep edilen toplam LYX
**Event:** BatchClaimCompleted

---

### 2. batchTransferLYX(address[] calldata recipients, uint256[] calldata amounts)
**Parametreler:**
1. `recipients` (address[]): Alıcı adresleri
2. `amounts` (uint256[]): Her alıcıya gönderilecek miktar

**Ödeme:** msg.value >= toplam miktar
**Event:** BatchTransferCompleted

---

### 3. batchGetUserDrawInfo(uint256[] calldata drawIds)
**Parametre:**
- `drawIds` (uint256[]): Sorgulanacak çekiliş ID'leri

**Return:** Her çekiliş için tuple array:
- `creators` (address[])
- `endTimes` (uint256[])
- `prizePools` (uint256[])

---

## GridottoExecutionFacet - Çekiliş Yürütme Fonksiyonları

### 1. executeUserDraw(uint256 drawId)
**Parametre:**
- `drawId` (uint256): Sonuçlandırılacak çekiliş ID'si

**Return:** Yok
**Event:** UserDrawExecuted
**Not:** Çağıran executor reward alır

---

### 2. cancelUserDraw(uint256 drawId)
**Parametre:**
- `drawId` (uint256): İptal edilecek çekiliş ID'si

**Return:** Yok
**Koşul:** Sadece creator yapabilir, katılımcı yoksa

---

## AdminFacet - Yönetici Fonksiyonları

### 1. setPlatformFee(uint256 newFee)
**Parametre:**
- `newFee` (uint256): Yeni platform fee (10000 = %100)

**Kısıt:** Max %50 (5000)
**Yetki:** Sadece owner

---

### 2. withdrawPlatformFees()
**Parametre:** YOK
**Return:** uint256 - Çekilen miktar
**Yetki:** Sadece owner

---

### 3. setExecutorRewardConfig(uint256 percent, uint256 maxReward)
**Parametreler:**
1. `percent` (uint256): Executor reward yüzdesi
2. `maxReward` (uint256): Max reward limiti (wei)

**Yetki:** Sadece owner

---

### 4. setMaxCreatorFee(uint256 maxFee)
**Parametre:**
- `maxFee` (uint256): Max creator fee yüzdesi

**Yetki:** Sadece owner

---

## Enum Değerleri

### DrawType
- OFFICIAL_DAILY = 0
- OFFICIAL_MONTHLY = 1
- USER_LYX = 2
- USER_LSP7 = 3
- USER_LSP8 = 4

### ParticipationRequirement
- NONE = 0
- TOKEN_HOLDER = 1
- NFT_HOLDER = 2
- MIN_FOLLOWERS = 3

### PrizeModel
- CREATOR_FUNDED = 0
- PARTICIPATION_FUNDED = 1
- MIXED = 2