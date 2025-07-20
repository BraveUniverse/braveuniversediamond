# 🎮 Gridotto UI Rehberi - Çok Basit Anlatım

## 🎰 BÖLÜM 1: RESMİ ÇEKİLİŞLER (GridottoFacet)

### 1. buyTickets - Haftalık Bilet Al
**Ne yapar?** → Haftalık çekilişe bilet alırsın

**Ne verirsin?**
- `amount`: Kaç bilet istiyorsun? (sayı)

**Ne ödemen gerek?**
- Her bilet 0.01 LYX
- 5 bilet = 0.05 LYX ödeme

**Örnek kod:**
```javascript
// 5 bilet almak istiyorum
const biletSayisi = 5;
const biletFiyati = "0.01"; // LYX
const toplamOdeme = biletSayisi * 0.01; // = 0.05 LYX

await kontrat.buyTickets(biletSayisi, {
    value: web3.utils.toWei(toplamOdeme.toString(), 'ether')
});
```

**UI'da nasıl göster:**
- [ ] Bilet sayısı kutusu
- [ ] "5 bilet = 0.05 LYX" yazısı
- [ ] "Satın Al" butonu
- [ ] İşlem sonrası "✅ Biletler alındı!" mesajı

---

### 2. buyMonthlyTickets - Aylık Bilet Al
**Ne yapar?** → Aylık BÜYÜK çekilişe bilet alırsın

**Ne verirsin?**
- `amount`: Kaç bilet? (sayı)

**Ne ödemen gerek?**
- Yine bilet başı 0.01 LYX

**UI'da nasıl göster:**
- [ ] "AYLIK ÇEKİLİŞ 🎉" başlığı (büyük)
- [ ] Bilet sayısı kutusu
- [ ] "Satın Al" butonu

---

### 3. claimPrize - Ödülünü Al
**Ne yapar?** → Kazandığın parayı cüzdanına çeker

**Ne verirsin?**
- HİÇBİR ŞEY! Sadece butona bas

**Örnek kod:**
```javascript
await kontrat.claimPrize();
// Para otomatik cüzdanına gelir
```

**UI'da nasıl göster:**
- [ ] "🎁 Ödülünü Al" butonu
- [ ] Butonda kazandığın miktar: "5.5 LYX Al"
- [ ] Alınca konfeti 🎊 animasyonu

---

### 4. getPendingPrize - Bekleyen Ödülün Var mı?
**Ne yapar?** → Alman gereken para var mı bakar

**Ne verirsin?**
- `user`: Kimin ödülüne bakacağız? (adres)

**Ne alırsın?**
- Bir sayı (wei formatında, çevirmek gerek)

**Örnek kod:**
```javascript
const bekleyenOdul = await kontrat.getPendingPrize(kullaniciAdresi);
const odulLYX = web3.utils.fromWei(bekleyenOdul, 'ether');

if (odulLYX > 0) {
    // Claim butonu göster
    buton.textContent = `${odulLYX} LYX Al`;
}
```

**UI'da nasıl göster:**
- [ ] Sürekli kontrol et (10 saniyede bir)
- [ ] Para varsa butonu göster
- [ ] Para yoksa butonu gizle

---

### 5. getTicketPrice - Bilet Fiyatı Ne Kadar?
**Ne yapar?** → 1 biletin fiyatını söyler

**Ne verirsin?**
- HİÇBİR ŞEY!

**Ne alırsın?**
- Fiyat (genelde 0.01 LYX)

**UI'da nasıl göster:**
- [ ] "Bilet Fiyatı: 0.01 LYX" yazısı

---

### 6. getDrawInfo - Çekiliş Bilgileri
**Ne yapar?** → Şu anki çekilişler hakkında her şeyi söyler

**Ne verirsin?**
- HİÇBİR ŞEY!

**Ne alırsın?**
- `currentDraw`: Haftalık çekiliş numarası (örn: 42)
- `currentMonthlyDraw`: Aylık çekiliş numarası (örn: 12)
- `drawTime`: Haftalık çekiliş ne zaman? (zaman)
- `monthlyDrawTime`: Aylık çekiliş ne zaman? (zaman)

**Örnek kod:**
```javascript
const bilgiler = await kontrat.getDrawInfo();

// Kalan süreyi hesapla
const simdi = Date.now() / 1000;
const kalanSure = bilgiler.drawTime - simdi;
const kalanGun = Math.floor(kalanSure / 86400);
const kalanSaat = Math.floor((kalanSure % 86400) / 3600);
```

**UI'da nasıl göster:**
- [ ] "Çekiliş #42" başlığı
- [ ] "⏰ 3 gün 14 saat kaldı" sayacı
- [ ] Süre 1 saatten azsa KIRMIZI yap

---

### 7. getCurrentDrawPrize - Haftalık Ödül Ne Kadar?
**Ne yapar?** → Haftalık çekilişte dağıtılacak toplam para

**Ne alırsın?**
- Büyük bir sayı (ödül havuzu)

**UI'da nasıl göster:**
- [ ] "🏆 ÖDÜL: 125.5 LYX" (büyük font)
- [ ] Sürekli artan animasyon
- [ ] Altın rengi kullan

---

### 8. getMonthlyPrize - Aylık Ödül Ne Kadar?
**Ne yapar?** → Aylık MEGA ödül miktarı

**UI'da nasıl göster:**
- [ ] "🏆 AYLIK MEGA ÖDÜL: 1,250 LYX" (ÇOK büyük)
- [ ] Parıldayan efekt
- [ ] Arka plan gradyan

---

### 9. getUserTickets - Kaç Biletin Var?
**Ne yapar?** → Bu çekilişte kaç biletin olduğunu söyler

**Ne verirsin?**
- `user`: Kimin biletine bakacağız? (adres)
- `drawNumber`: Hangi çekiliş? (numara)

**Ne alırsın?**
- Bilet sayısı

**UI'da nasıl göster:**
- [ ] "🎫 Biletlerin: 5" 
- [ ] 0 ise "Henüz bilet almadın" yaz

---

### 10. getUserMonthlyTickets - Aylık Biletin Var mı?
**Ne yapar?** → Aylık çekilişte kaç biletin var

**Ne verirsin?**
- `user`: Kimin? (adres)
- `drawNumber`: Hangi aylık çekiliş? (numara)

---

### 11. getTotalTickets - Toplam Kaç Bilet Satıldı?
**Ne yapar?** → Bu çekilişte toplam satılan bilet sayısı

**Ne verirsin?**
- `drawNumber`: Hangi çekiliş? (numara)

**UI'da nasıl göster:**
- [ ] "Toplam: 1,234 bilet satıldı"
- [ ] "Senin şansın: 5/1234 = %0.4" hesapla

---

### 12. getTotalMonthlyTickets - Aylıkta Toplam Bilet
**Ne yapar?** → Aylık çekilişte toplam bilet sayısı

---

### 13. getDrawWinner - Geçen Haftanın Kazananı Kim?
**Ne yapar?** → Önceki çekilişi kim kazandı söyler

**Ne verirsin?**
- `drawNumber`: Hangi çekiliş? (numara)

**Ne alırsın?**
- Kazananın adresi
- 0x0000... ise kimse kazanmamış

**UI'da nasıl göster:**
- [ ] "🏆 Önceki Kazanan: 0x1234...5678"
- [ ] Eğer senin adresinse "🎉 SEN KAZANDIN!" yaz

---

### 14. getMonthlyDrawWinner - Aylık Kazanan
**Ne yapar?** → Geçen ayın kazananı

---

### 15. getDrawPrize - O Çekilişin Ödülü Neydi?
**Ne yapar?** → Eski bir çekilişin ödül miktarı

**Ne verirsin?**
- `drawNumber`: Hangi çekiliş? (numara)

**UI'da nasıl göster:**
- [ ] Tablo halinde son 10 çekiliş
- [ ] En büyük ödülü vurgula

---

### 16. getMonthlyDrawPrize - Aylık Çekiliş Ödülü
**Ne yapar?** → Eski aylık çekilişin ödülü

---

### 17. isDrawn - Çekiliş Yapıldı mı?
**Ne yapar?** → Bu çekiliş çekildi mi söyler

**Ne alırsın?**
- true = Evet çekildi
- false = Hayır henüz çekilmedi

---

### 18. isMonthlyDrawn - Aylık Çekildi mi?
**Ne yapar?** → Aylık çekiliş yapıldı mı

---

### 19. canExecuteDraw - Çekiliş Zamanı Geldi mi?
**Ne yapar?** → Çekilişi yapma zamanı geldi mi bakar

**UI'da nasıl göster:**
- [ ] Zaman geldiyse "Çekilişi Yap" butonu göster

---

### 20. canExecuteMonthlyDraw - Aylık Zamanı mı?
**Ne yapar?** → Aylık çekiliş zamanı mı

---

### 21. executeDraw - Çekilişi Yap!
**Ne yapar?** → Haftalık çekilişi yapar, kazananı belirler

**ÖNEMLİ**: Bunu yapan kişi ödül alır! (Executor reward)

**UI'da nasıl göster:**
- [ ] "Çekilişi Yap ve 2.5 LYX Kazan" butonu

---

### 22. executeMonthlyDraw - Aylık Çekilişi Yap
**Ne yapar?** → Aylık çekilişi yapar

---

### 23. getCreatorProfit - Creator Ne Kadar Kazandı?
**Ne yapar?** → Çekiliş oluşturan kişinin kazancı

**Ne verirsin?**
- `creator`: Kimin kazancı? (adres)

---

### 24. getCreatorTokenProfit - Token Kazancı
**Ne yapar?** → Creator'ın token kazancı

---

## 🎯 UI'DA DİKKAT EDİLECEKLER

### Renkler:
- 💚 Yeşil = İyi şeyler (kazanç, başarı)
- 🔴 Kırmızı = Uyarı (süre az, hata)
- 🟡 Sarı/Altın = Ödüller
- 🔵 Mavi = Bilgi

### Animasyonlar:
- ✨ Ödül miktarları parıldasın
- 🎊 Kazanınca konfeti
- ⏰ Geri sayım canlı olsun
- 📈 Ödül havuzu büyürken animasyon

### Ses Efektleri:
- 🔔 Bilet alınca "ding"
- 🎉 Kazanınca "tada"
- ⏰ Son 1 saat kalınca "tik tak"

### Mobil Uyumluluk:
- 📱 Büyük butonlar (parmakla basılabilir)
- 📱 Yazılar okunabilir boyutta
- 📱 Kaydırma kolay olsun