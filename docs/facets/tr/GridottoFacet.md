# Facet: GridottoFacet

## Amacı
GridottoFacet, BraveUniverse ekosistemi için loto/çekiliş oyun sistemi uygular. Bilet tabanlı çekilişler, ödül havuzları, katılımcı yönetimi ve otomatik kazanan seçimi işlevselliği sağlar. Kullanıcılar haftalık çekilişler için bilet satın alabilir, ödüller bilet satışlarından ve aylık ödül havuzlarından birikir.

## Fonksiyonlar

### Görüntüleme Fonksiyonları
- `getDrawInfo()` — Mevcut çekiliş bilgilerini döner (ID, bitiş zamanı, toplam ödül, katılımcı sayısı ve durum)
- `getCurrentDrawPrize()` — Mevcut çekilişin toplam ödül miktarını wei cinsinden döner
- `getMonthlyPrize()` — Aylık temel ödül miktarını wei cinsinden döner
- `getTicketPrice()` — Bilet başına fiyatı wei cinsinden döner
- `getActiveUserDraws(address user)` — Belirli bir kullanıcının aktif çekilişlerinin dizisini döner
- `getOfficialDrawInfo(uint256 drawId)` — ID'ye göre belirli bir çekilişin resmi bilgilerini döner
- `getTotalRevenue()` — Bilet satışlarından elde edilen toplam geliri döner
- `getCurrentDrawId()` — Mevcut aktif çekiliş ID'sini döner

### Kullanıcı Fonksiyonları
- `purchaseTickets(uint256 ticketCount)` — Mevcut çekiliş için bilet satın al (ödeme gerektiren)

### Sahip Fonksiyonları
- `initializeGridotto(uint256 _ticketPrice, uint256 _monthlyPrize)` — Loto sistemini bilet fiyatı ve aylık ödül ile başlat
- `finalizeDraw()` — Mevcut çekilişi sonlandır, kazananı seç ve yeni çekiliş oluştur
- `updateMonthlyPrize(uint256 newMonthlyPrize)` — Aylık temel ödül miktarını güncelle
- `updateTicketPrice(uint256 newTicketPrice)` — Bilet fiyatını güncelle
- `withdrawBalance()` — Kontrat bakiyesini çek (acil durum fonksiyonu)

## Yetkiler
- **Herkese Açık**: Tüm görüntüleme fonksiyonları ve `purchaseTickets()` herkes tarafından çağrılabilir
- **Sadece Sahip**: `initializeGridotto()`, `finalizeDraw()`, `updateMonthlyPrize()`, `updateTicketPrice()` ve `withdrawBalance()` sadece kontrat sahibi ile sınırlıdır
- **Yetki Kontrol Yapısı**: Sahiplik doğrulaması için LibDiamond.contractOwner() kullanır

## Depolama
GridottoFacet, `keccak256("gridotto.storage")` slot'u ile özel depolama kütüphanesi yapısı kullanır. Depolama şunları içerir:
- Mevcut çekiliş ID'si ve konfigürasyonu
- Bilet fiyatı ve aylık ödül ayarları
- Çekiliş bilgi eşlemesi (ID → DrawInfo)
- Kullanıcı çekilişleri eşlemesi (adres → UserDraw[])
- Çekiliş katılımcıları eşlemesi (ID → adres[])
- Toplam gelir takibi

## Olaylar
- `DrawCreated(uint256 indexed drawId, uint256 endTime, uint256 prize)` — Yeni çekiliş oluşturulduğunda yayılır
- `TicketPurchased(address indexed user, uint256 indexed drawId, uint256 ticketCount)` — Bilet satın alındığında yayılır
- `DrawFinalized(uint256 indexed drawId, address indexed winner, uint256 prize)` — Çekiliş kazananla sonlandırıldığında yayılır
- `PrizeUpdated(uint256 newMonthlyPrize)` — Aylık ödül güncellendiğinde yayılır

## Örnekler

### Bilet Satın Alma
```solidity
// Mevcut çekiliş için 3 bilet satın al
uint256 ticketCount = 3;
uint256 ticketPrice = gridottoFacet.getTicketPrice();
uint256 totalCost = ticketPrice * ticketCount;

gridottoFacet.purchaseTickets{value: totalCost}(ticketCount);
```

### Çekiliş Bilgilerini Kontrol Etme
```solidity
// Mevcut çekiliş detaylarını al
GridottoFacet.DrawInfo memory drawInfo = gridottoFacet.getDrawInfo();
console.log("Çekiliş ID:", drawInfo.drawId);
console.log("Ödül Havuzu:", drawInfo.totalPrize);
console.log("Katılımcılar:", drawInfo.participantCount);
```

### Kullanıcı Katılımını Kontrol Etme
```solidity
// Kullanıcının aktif çekilişlerini kontrol et
GridottoFacet.UserDraw[] memory userDraws = gridottoFacet.getActiveUserDraws(userAddress);
for (uint i = 0; i < userDraws.length; i++) {
    console.log("Çekiliş:", userDraws[i].drawId, "Biletler:", userDraws[i].ticketCount);
}
```

## Deployment Bilgileri
- **Ağ**: LUKSO Testnet
- **Facet Adresi**: `0x280B1EF2F7729B18f7b46711bA5ED28be6e6163f`
- **Diamond Adresi**: `0xda142c5978D707E83618390F4f8796bD7eb3a790`
- **Başlangıç Bilet Fiyatı**: 0.01 LYX
- **Başlangıç Aylık Ödülü**: 10.0 LYX
- **Çekiliş Süresi**: Çekiliş başına 7 gün
- **Durum**: BUILD_READY ✅