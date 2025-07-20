# Gridotto Edge Case Improvements

## 🎯 Geliştirmeler Özeti

### 1. Minimum Katılımcı Grace Period (7 Gün)
- Çekiliş süresi dolmuş ama minimum katılımcı sayısına ulaşamamışsa
- 7 gün ek süre tanınır
- Bu süre sonunda herkes executeUserDraw çağırabilir
- Kazanan normal şekilde seçilir

### 2. Owner Cleanup Yetkisi
- Owner istediği zaman çekilişi iptal edebilir
- UI'ı temiz tutmak için eski/sorunlu çekilişler silinebilir
- Katılımcı varsa bile owner iptal edebilir (refund yapılır)

### 3. Force Execute (Owner Only)
- Owner minimum katılımcı şartı olmadan çekilişi sonuçlandırabilir
- Süre dolmuş olması yeterli
- Normal executor reward ödenir

### 4. Refund Mekanizması
- Minimum katılımcıya ulaşamayan çekilişler için
- Grace period (7 gün) sonunda refund edilebilir
- İki yöntem:
  - `refundDraw()`: Toplu refund (herkes birden)
  - `claimRefund()`: Bireysel refund talebi

### 5. Gelişmiş UI Helper Fonksiyonları
- `getExpiredDrawsWaitingExecution()`: Grace period'da bekleyen çekilişler
- `canExecuteDraw()`: Çekilişin execute edilebilir olup olmadığı
- `getDrawsForCleanup()`: 30+ gün eski temizlenebilir çekilişler

## 📝 Yeni Fonksiyonlar

### GridottoExecutionFacet

#### forceExecuteDraw(uint256 drawId)
```solidity
// Sadece owner çağırabilir
// Minimum katılımcı şartı aranmaz
// Süre dolmuş olmalı
function forceExecuteDraw(uint256 drawId) external
```

#### cancelUserDraw(uint256 drawId) - Güncellenmiş
```solidity
// Creator: Katılımcı yoksa iptal edebilir
// Owner: Her zaman iptal edebilir
// Initial prize iade edilir
function cancelUserDraw(uint256 drawId) external
```

### GridottoPhase3Facet

#### refundDraw(uint256 drawId)
```solidity
// Minimum katılımcıya ulaşamamış çekilişler için
// Grace period (7 gün) sonunda çağrılabilir
// Tüm katılımcılara toplu refund
function refundDraw(uint256 drawId) external
```

#### claimRefund(uint256 drawId)
```solidity
// Bireysel refund talebi
// Sadece bilet alan kullanıcılar
// Grace period sonunda
function claimRefund(uint256 drawId) external
```

### GridottoUIHelperFacet

#### getExpiredDrawsWaitingExecution(uint256 limit)
```solidity
// Grace period'da bekleyen çekilişleri listele
// Min katılımcı sağlanmamış ama süre dolmuş
function getExpiredDrawsWaitingExecution(uint256 limit) external view returns (
    uint256[] memory drawIds,
    uint256[] memory endTimes,
    uint256[] memory participantCounts,
    uint256[] memory minParticipants
)
```

#### canExecuteDraw(uint256 drawId)
```solidity
// Çekilişin execute edilebilir olup olmadığını kontrol et
// Detaylı hata mesajı döner
function canExecuteDraw(uint256 drawId) external view returns (
    bool canExecute,
    string memory reason
)
```

#### getDrawsForCleanup(uint256 limit)
```solidity
// 30+ gün eski temizlenebilir çekilişler
// Owner tarafından iptal edilebilir
function getDrawsForCleanup(uint256 limit) external view returns (
    uint256[] memory drawIds,
    address[] memory creators,
    uint256[] memory endTimes,
    bool[] memory hasParticipants
)
```

## 🔧 UI Kullanım Örnekleri

### 1. Grace Period Kontrolü
```javascript
const [canExecute, reason] = await contract.canExecuteDraw(drawId);

if (!canExecute) {
    if (reason.includes("Wait")) {
        // Grace period'da, kaç gün kaldığını göster
        console.log(reason); // "Min participants not met. Wait 5 more days"
    } else {
        console.log("Cannot execute:", reason);
    }
}
```

### 2. Refund İşlemleri
```javascript
// Toplu refund (herkes için)
await contract.refundDraw(drawId);

// Bireysel refund
await contract.claimRefund(drawId);
```

### 3. Admin Panel
```javascript
// Temizlenecek çekilişleri listele
const cleanupDraws = await contract.getDrawsForCleanup(50);

for (const draw of cleanupDraws) {
    console.log(`Draw #${draw.drawId} - ${draw.hasParticipants ? 'Has participants' : 'Empty'}`);
    
    // Owner olarak iptal et
    if (isOwner) {
        await contract.cancelUserDraw(draw.drawId);
    }
}
```

### 4. Executor Dashboard
```javascript
// Grace period'da bekleyen çekilişler
const waitingDraws = await contract.getExpiredDrawsWaitingExecution(20);

for (const draw of waitingDraws) {
    const gracePeriodEnd = draw.endTime + (7 * 24 * 60 * 60);
    if (Date.now() / 1000 > gracePeriodEnd) {
        // Execute edilebilir
        await contract.executeUserDraw(draw.drawId);
    }
}
```

## ⚠️ Önemli Notlar

1. **Grace Period**: 7 gün sabit, değiştirilemez
2. **Refund Gas**: Refund işlemlerinde gas ücreti çağıran öder
3. **Owner Yetkileri**: Sadece cleanup amaçlı, kötüye kullanılmamalı
4. **Cleanup Threshold**: 30 gün sonra otomatik cleanup listesine girer

## 🚀 Deployment

```bash
npx hardhat run scripts/deploy-edge-case-improvements.ts --network luksoTestnet
```

Bu geliştirmeler ile edge case'ler düzgün şekilde yönetilir ve UI temiz kalır!