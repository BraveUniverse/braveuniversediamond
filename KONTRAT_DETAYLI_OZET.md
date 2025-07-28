# 🎯 BraveUniverse Diamond Kontratları Detaylı Özeti

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Ana Diamond Kontratı](#ana-diamond-kontratı)
3. [Temel Yönetim Facet'leri](#temel-yönetim-facetleri)
4. [Gridotto Lottery Sistemi](#gridotto-lottery-sistemi)
5. [Yardımcı Sistemler](#yardımcı-sistemler)
6. [Depolama Kütüphaneleri](#depolama-kütüphaneleri)

---

## 🌟 Genel Bakış

BraveUniverse, **EIP-2535 Diamond Standard** kullanarak geliştirilmiş modüler bir akıllı kontrat sistemidir. Ana amacı, LUKSO blockchain üzerinde merkezi olmayan bir piyango (lottery) platformu sunmaktır.

### Temel Özellikler:
- 💎 **Diamond Proxy Pattern**: Yükseltilebilir ve modüler kontrat yapısı
- 🎰 **Gridotto Lottery**: Çoklu çekiliş türleri destekleyen piyango sistemi
- 🏆 **Liderlik Tabloları**: Kazananlar, bilet alanlar ve yaratıcılar için istatistikler
- 💰 **Otomatik Ücret Sistemi**: Platform, yürütücü ve aylık havuz ücretleri
- 🔐 **Erişim Kontrolü**: Rol tabanlı yetkilendirme sistemi

---

## 💎 Ana Diamond Kontratı

### BraveUniverseDiamond.sol
**Amaç**: Tüm facet'lere (modüllere) proxy görevi gören ana kontrat.

**Temel İşlevler**:
- Gelen çağrıları ilgili facet'lere yönlendirir
- EIP-2535 standardını uygular
- Facet ekleme/çıkarma/güncelleme işlemlerini destekler

**Çalışma Mantığı**:
1. Kullanıcı bir fonksiyon çağırır
2. Diamond, fonksiyon selector'ını kontrol eder
3. İlgili facet'i bulur ve `delegatecall` ile çağırır
4. Sonucu kullanıcıya döndürür

---

## 🛠️ Temel Yönetim Facet'leri

### 1. DiamondCutFacet
**Amaç**: Diamond'a yeni facet ekleme, çıkarma veya güncelleme işlemlerini yönetir.

**Ana Fonksiyonlar**:
- `diamondCut()`: Facet değişikliklerini uygular
- Fonksiyon selector'larını ekler/kaldırır
- Kontrat yükseltmelerini sağlar

### 2. DiamondLoupeFacet
**Amaç**: Diamond hakkında bilgi sorgulama (introspection) işlevleri sağlar.

**Ana Fonksiyonlar**:
- `facets()`: Tüm facet'leri ve fonksiyonlarını listeler
- `facetFunctionSelectors()`: Bir facet'in fonksiyonlarını döndürür
- `facetAddresses()`: Tüm facet adreslerini döndürür

### 3. OwnershipFacet
**Amaç**: Kontrat sahipliğini yönetir.

**Ana Fonksiyonlar**:
- `transferOwnership()`: Sahipliği transfer eder
- `owner()`: Mevcut sahibi döndürür

---

## 🎰 Gridotto Lottery Sistemi

### 1. GridottoCoreV2Facet
**Amaç**: Çekiliş oluşturma ve bilet satın alma temel işlevlerini sağlar.

**Desteklenen Çekiliş Türleri**:
1. **USER_LYX**: Kullanıcı tarafından oluşturulan LYX (native token) çekilişleri
2. **USER_LSP7**: LSP7 token çekilişleri
3. **USER_LSP8**: LSP8 NFT çekilişleri
4. **PLATFORM_WEEKLY**: Platform haftalık çekilişi
5. **PLATFORM_MONTHLY**: Platform aylık çekilişi

**Ana Fonksiyonlar**:
- `createLYXDraw()`: LYX çekilişi oluştur
- `createTokenDraw()`: Token çekilişi oluştur
- `createNFTDraw()`: NFT çekilişi oluştur
- `buyTickets()`: Bilet satın al
- `cancelDraw()`: Çekilişi iptal et

### 2. GridottoExecutionV2Facet & GridottoExecutionV2UpgradeFacet
**Amaç**: Çekilişleri sonuçlandırır ve kazananları belirler.

**Ana Fonksiyonlar**:
- `executeDraw()`: Normal çekilişleri yürütür
- Oracle'dan rastgele sayı alır
- Kazananları belirler
- Ödülleri dağıtır

**Ücret Dağılımı**:
- Platform ücreti: %5
- Yürütücü ücreti: %5
- Aylık havuz katkısı: %2
- Kazanan ödülü: Kalan miktar

### 3. GridottoPlatformDrawsFacet
**Amaç**: Platform tarafından yönetilen haftalık ve aylık çekilişleri yönetir.

**Ana Fonksiyonlar**:
- `initializePlatformDraws()`: Platform çekilişlerini başlatır
- `executeWeeklyDraw()`: Haftalık çekilişi yürütür
- `executeMonthlyDraw()`: Aylık çekilişi yürütür
- `awardMonthlyTickets()`: Kullanıcılara aylık bilet verir

**Özel Özellikler**:
- Haftalık çekiliş: 0.25 LYX bilet fiyatı, 7 gün süreli
- Aylık çekiliş: Ücretsiz biletlerle katılım
- Otomatik yenileme sistemi

### 4. GridottoRefundFacet
**Amaç**: İptal edilen çekilişler için iade işlemlerini yönetir.

**Ana Fonksiyonlar**:
- `claimRefund()`: İptal edilen çekilişten iade al
- `getRefundableAmount()`: İade edilebilir miktarı sorgula

### 5. GridottoPrizeClaimFacet
**Amaç**: Kazananların ödüllerini talep etmelerini sağlar.

**Ana Fonksiyonlar**:
- `claimPrize()`: Tekil ödül talebi
- `claimMultiplePrizes()`: Çoklu ödül talebi (gas optimizasyonu)
- `claimExecutorFees()`: Yürütücü ücretlerini talep et
- `getClaimableDraws()`: Talep edilebilir çekilişleri listele

### 6. GridottoAdminFacet & GridottoAdminFacetV2
**Amaç**: Sistem yönetimi ve acil durum fonksiyonları.

**Ana Fonksiyonlar**:
- `pauseSystem()`: Sistemi duraklat
- `unpauseSystem()`: Sistemi yeniden başlat
- `withdrawPlatformFees()`: Platform ücretlerini çek
- `updateFeePercentages()`: Ücret yüzdelerini güncelle
- `emergencyWithdraw()`: Acil durum çekimi

### 7. GridottoLeaderboardFacet
**Amaç**: Kullanıcı istatistikleri ve liderlik tablolarını sağlar.

**Sağlanan İstatistikler**:
- **Top Winners**: En çok kazananlar (toplam kazanç, kazanma sayısı)
- **Top Ticket Buyers**: En çok bilet alanlar
- **Top Draw Creators**: En başarılı çekiliş yaratıcıları
- **Top Executors**: En aktif yürütücüler
- **Platform Stats**: Genel platform istatistikleri

---

## 🔧 Yardımcı Sistemler

### 1. OracleFacet
**Amaç**: Güvenli rastgele sayı üretimi için oracle entegrasyonu.

**Ana Fonksiyonlar**:
- `getOracleValue()`: Oracle değerini sorgula
- `setOracleAddress()`: Oracle adresini güncelle
- `toggleBackupRandomness()`: Yedek rastgelelik sistemini aç/kapa

**Güvenlik Özellikleri**:
- Harici oracle kullanımı
- Yedek rastgelelik sistemi
- Manipülasyon koruması

### 2. GridottoDebugFacet
**Amaç**: Geliştirme ve test amaçlı debug fonksiyonları.

### 3. GridottoFixFacet & GridottoStorageFixFacet
**Amaç**: Hata düzeltmeleri ve depolama güncellemeleri için özel facet'ler.

---

## 📦 Depolama Kütüphaneleri

### 1. LibGridottoStorageV2
**Amaç**: Gridotto sisteminin tüm verilerini saklar.

**Saklanan Veriler**:
- Çekiliş bilgileri (Draw struct)
- Kullanıcı biletleri ve katılımları
- Platform istatistikleri
- Ücret havuzları

### 2. LibDiamond
**Amaç**: Diamond standard implementasyonu ve facet yönetimi.

**İşlevler**:
- Facet ekleme/çıkarma/güncelleme
- Sahiplik yönetimi
- Fonksiyon selector eşlemeleri

### 3. LibOracleStorage
**Amaç**: Oracle konfigürasyonu ve rastgele sayı depolama.

### 4. LibAdminStorage
**Amaç**: Admin ayarları ve sistem durumu.

---

## 💰 Gelir Modeli

### Ücret Dağılımı:
1. **Platform Ücreti**: %5 - Platform hazinesine
2. **Yürütücü Ücreti**: %5 - Çekilişi sonuçlandırana
3. **Aylık Havuz**: %2 - Aylık çekiliş havuzuna
4. **Haftalık-Aylık**: %20 - Haftalık çekilişten aylık havuza

### Gelir Kaynakları:
- Kullanıcı çekilişlerinden platform ücreti
- Haftalık platform çekilişi gelirleri
- NFT çekilişlerinde yaratıcı gelirleri

---

## 🔐 Güvenlik Özellikleri

1. **Erişim Kontrolü**: Tüm kritik fonksiyonlar owner-only
2. **Pause Mekanizması**: Acil durumlarda sistem durdurulabilir
3. **Reentrancy Koruması**: Checks-effects-interactions pattern
4. **Oracle Güvenliği**: Manipülasyon korumalı rastgele sayı üretimi
5. **Minimum Katılımcı**: Çekilişler için minimum katılımcı zorunluluğu

---

## 🚀 Kullanım Senaryoları

1. **Bireysel Çekilişler**: Kullanıcılar kendi LYX/token/NFT çekilişlerini oluşturabilir
2. **Platform Çekilişleri**: Haftalık ve aylık otomatik çekilişler
3. **NFT Pazarlama**: NFT projeleri için promosyon çekilişleri
4. **Token Dağıtımı**: Adil token dağıtımı için çekiliş mekanizması
5. **Topluluk Etkinlikleri**: Ödüllü yarışmalar ve etkinlikler

---

## 📊 Teknik Özellikler

- **Blockchain**: LUKSO Testnet
- **Standartlar**: EIP-2535 (Diamond), LSP7 (Token), LSP8 (NFT)
- **Programlama Dili**: Solidity ^0.8.19
- **Test Framework**: Hardhat
- **Gas Optimizasyonu**: Batch işlemler, storage optimizasyonu

---

## 🔌 Interface'ler

### 1. IDiamondCut
Diamond facet değişiklikleri için standart interface

### 2. IDiamondLoupe
Diamond sorgulama fonksiyonları için interface

### 3. IERC173
Sahiplik yönetimi için standart interface

### 4. IOracleFacet
Oracle entegrasyonu için özel interface

### 5. ILSP7DigitalAsset & ILSP8IdentifiableDigitalAsset
LUKSO token ve NFT standartları için interface'ler

---

## 📈 Sistem Akışı

### Çekiliş Yaşam Döngüsü:
1. **Oluşturma**: Kullanıcı veya platform çekiliş oluşturur
2. **Bilet Satışı**: Katılımcılar bilet satın alır
3. **Bekleme**: Çekiliş süresi dolana kadar bekler
4. **Yürütme**: Herhangi biri çekilişi sonuçlandırabilir
5. **Kazanan Seçimi**: Oracle ile rastgele kazanan belirlenir
6. **Ödül Dağıtımı**: Kazananlar ödüllerini talep eder

### Ücret Akışı:
```
Toplam Havuz (100%)
├── Platform Ücreti (5%)
├── Yürütücü Ücreti (5%)
├── Aylık Havuz Katkısı (2%)
└── Kazanan Ödülü (88%)
```

---

## 🎯 Önemli Notlar

1. **Modülerlik**: Her facet bağımsız olarak güncellenebilir
2. **Gas Verimliliği**: Toplu işlemler ve optimize edilmiş storage kullanımı
3. **Güvenlik**: Çoklu güvenlik katmanları ve erişim kontrolü
4. **Şeffaflık**: Tüm işlemler blockchain üzerinde izlenebilir
5. **Kullanıcı Dostu**: Basit arayüz fonksiyonları ve net hata mesajları