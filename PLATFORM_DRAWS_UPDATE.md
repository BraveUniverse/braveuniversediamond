# Platform Çekilişleri Güncelleme - v2.0

## 🎯 Yapılan Değişiklikler

### 1. Başlangıç Durumu
**Eski Sistem:**
- Sadece haftalık çekiliş başlatılıyordu
- Aylık çekiliş 4 hafta sonra oluşturuluyordu
- Bazen aktif aylık çekiliş olmayabiliyordu

**Yeni Sistem:**
- Hem haftalık hem aylık çekiliş aynı anda başlatılıyor
- Her zaman 2 aktif çekiliş var (1 haftalık, 1 aylık)
- Daha tutarlı ve öngörülebilir sistem

### 2. Kod Değişiklikleri

#### `initializePlatformDraws()` Fonksiyonu:
```solidity
// Eski
_createWeeklyDraw();

// Yeni
_createWeeklyDraw();
_createMonthlyDraw(); // Aylık çekiliş de hemen başlatılıyor
```

#### Haftalık Çekiliş Yürütme:
- 4 hafta kontrolü kaldırıldı
- Sadece yeni haftalık çekiliş oluşturuluyor
- Aylık havuz birikmeye devam ediyor

#### Aylık Çekiliş Yürütme:
```solidity
// Ödül havuzu güncelleme
draw.prizePool += s.monthlyPoolBalance;

// İşlem sonrası
_resetAllMonthlyTickets();
_createMonthlyDraw(); // Yeni aylık çekiliş hemen başlatılıyor
```

### 3. Aylık Çekiliş Ödül Havuzu

**İlk Aylık Çekiliş:**
- Başlangıç ödül havuzu: 0 LYX
- 4 hafta boyunca haftalık çekilişlerden %20 birikir
- Yürütme anında birikmiş havuz ödül havuzuna eklenir

**Sonraki Aylık Çekilişler:**
- Her aylık çekiliş 0 LYX ile başlar
- 28 gün boyunca haftalık çekilişlerden pay birikir
- Dinamik ödül havuzu sistemi

### 4. Avantajlar

1. **Tutarlılık**: Her zaman 2 aktif çekiliş
2. **Şeffaflık**: Kullanıcılar her zaman aylık çekilişi görebilir
3. **Planlama**: 28 günlük sabit döngüler
4. **Basitlik**: Karmaşık kontroller kaldırıldı

### 5. Kullanıcı Deneyimi

**Kullanıcılar için:**
- Platform'a girdiğinde her zaman 2 aktif çekiliş görür
- Aylık biletlerini ne zaman kullanacaklarını bilir
- Aylık çekiliş bitiş tarihini önceden görebilir

**Yöneticiler için:**
- Daha basit sistem yönetimi
- Öngörülebilir çekiliş döngüleri
- Daha az manuel müdahale

### 6. Test Senaryoları

```typescript
// Her zaman 2 aktif çekiliş olmalı
expect(info.weeklyDrawId).to.be.gt(0);
expect(info.monthlyDrawId).to.be.gt(0);

// Aylık çekiliş yürütüldükten sonra yeni aylık çekiliş
await platformDrawsFacet.executeMonthlyDraw();
expect(newInfo.monthlyDrawId).to.be.gt(oldMonthlyId);
```

### 7. Deployment Adımları

1. Yeni `GridottoPlatformDrawsFacet` deploy et
2. Diamond'a ekle
3. `initializePlatformDraws()` çağır
4. Her iki çekilişin de aktif olduğunu doğrula

### 8. Dikkat Edilmesi Gerekenler

- İlk aylık çekiliş 0 LYX ödül havuzu ile başlar
- 28 gün boyunca birikir
- Minimum 4 haftalık çekiliş yapılmalı ki aylık havuz dolu olsun
- Aylık bilet sistemi değişmedi

## 📊 Özet

Bu güncelleme ile platform çekilişleri daha tutarlı ve kullanıcı dostu hale getirildi. Artık kullanıcılar her zaman hem haftalık hem de aylık çekilişi görebilecek ve katılım planlarını daha iyi yapabilecekler.