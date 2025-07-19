# GridottoFacet Phase 2 - User Draw Scenarios

## 🎯 Kullanıcı Çekiliş Senaryoları

### 1. **LYX Ödüllü Çekiliş Oluşturma**

#### A) Creator Funded (Yaratıcı Fonlamalı)
- Kullanıcı çekilişi oluştururken tüm ödülü kendisi koyar
- Örnek: 10 LYX ödül, bilet fiyatı 0.1 LYX
- Katılımcı ödemeleri prize pool'a eklenir
- Platform %5 kesinti alır
- Kazanan: İnitial prize + (Bilet satışlarının %95'i)

#### B) Participant Funded (Katılımcı Fonlamalı)
- Kullanıcı ödül koymaz, sadece çekiliş oluşturur
- Tüm ödül havuzu bilet satışlarından oluşur
- Platform %5 kesinti alır
- Kazanan: Bilet satışlarının %95'i

#### C) Hybrid Funded (Karma Fonlamalı)
- Kullanıcı başlangıç ödülü koyar (örn: 5 LYX)
- Bilet satışları da havuza eklenir
- Platform %5 kesinti alır
- Kazanan: İnitial prize + (Bilet satışlarının %95'i)

### 2. **Katılım Şartları**

#### A) Şartsız (NONE)
- Herkes katılabilir
- En yaygın senaryo

#### B) Takipçi Şartı (FOLLOWERS_ONLY)
- Sadece çekiliş sahibini takip edenler katılabilir
- Social feature entegrasyonu gerekir

#### C) Token Sahipliği (LSP7_HOLDER)
- Belirli bir LSP7 token'ına sahip olanlar
- Minimum miktar belirlenebilir (örn: 100 TOKEN)

#### D) NFT Sahipliği (LSP8_HOLDER)
- Belirli bir LSP8 NFT koleksiyonuna sahip olanlar
- Herhangi bir NFT'ye sahip olmak yeterli

#### E) VIP Pass Sahipliği (VIP_PASS_HOLDER)
- VIP Pass NFT'sine sahip olanlar
- Tier farkı gözetmez, herhangi bir tier yeterli

#### F) Karma Şartlar
- FOLLOWERS_AND_LSP7: Hem takipçi hem token sahibi
- FOLLOWERS_AND_LSP8: Hem takipçi hem NFT sahibi

### 3. **Bilet Satın Alma Senaryoları**

#### A) Normal Satın Alma
```solidity
buyUserDrawTicket(drawId, 5) // 5 bilet al
// Ödeme: 5 * ticketPrice
// Platform fee: %5
// Prize pool'a: %95
```

#### B) VIP Pass İndirimi
- Silver: %20 platform fee indirimi
- Gold: %40 platform fee indirimi
- Diamond: %60 platform fee indirimi
- Universe: %80 platform fee indirimi

Örnek: 1 LYX'lik bilet alımında:
- Normal: 0.05 LYX platform, 0.95 LYX prize pool
- Universe VIP: 0.01 LYX platform, 0.99 LYX prize pool

### 4. **Çekiliş Yürütme**

#### A) Süre Dolunca
- endTime geçince herkes executeUserDraw() çağırabilir
- Rastgele kazanan seçilir (ağırlıklı)
- Ödül pending prize'a eklenir

#### B) Max Bilet Satılınca
- maxTickets'a ulaşılınca anında çekilebilir
- Süre dolmasını beklemeye gerek yok

### 5. **Özel Durumlar**

#### A) Katılımcı Yoksa
- Çekiliş iptal edilebilir
- Creator ödülünü geri alabilir

#### B) Minimum Katılım
- Creator minimum katılımcı sayısı belirleyebilir
- Ulaşılmazsa iptal hakkı

#### C) Creator Fee
- participationFeePercent ile creator ek gelir elde edebilir
- Örnek: %10 creator fee = bilet satışlarının %10'u creator'a

### 6. **Token/NFT Çekilişleri (Gelecek)**

#### A) LSP7 Token Çekilişi
```solidity
createTokenDraw(
    tokenAddress,    // Ödül token adresi
    tokenAmount,     // Ödül miktarı
    prizeConfig,     // Ödül yapılandırması
    ticketPriceLYX,  // LYX cinsinden bilet fiyatı
    duration,        // Süre
    maxTickets,      // Max bilet
    requirement      // Katılım şartı
)
```

#### B) LSP8 NFT Çekilişi
```solidity
createNFTDraw(
    nftAddress,      // NFT kontrat adresi
    tokenIds[],      // Ödül NFT ID'leri
    ticketPrice,     // Bilet fiyatı
    duration,        // Süre
    maxTickets,      // Max bilet
    requirement      // Katılım şartı
)
```

### 7. **Güvenlik ve Limitler**

- Min süre: 1 saat
- Max süre: 30 gün
- Max bilet: 10,000
- Min bilet fiyatı: 0 dan büyük
- Platform fee: %5 (sabit)
- Reentrancy koruması
- Pull pattern (claim yöntemi)

### 8. **Gelir Modeli**

#### Platform Geliri:
- Her bilet satışından %5
- VIP Pass sahipleri indirim alır (platform daha az kazanır)

#### Creator Geliri:
- participationFeePercent ile ek gelir
- Hybrid model'de bilet satışlarından pay

#### Katılımcı Kazancı:
- Tek kazanan tüm prize pool'u alır
- Birden fazla NFT varsa birden fazla kazanan olabilir