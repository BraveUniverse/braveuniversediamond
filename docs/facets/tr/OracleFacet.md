# Facet: OracleFacet

### Amacı
BraveUniverse ekosistemindeki tüm oyun ve uygulamalar için güvenli rastgele sayı üretimi sağlar. Mainnet'te harici bir oracle ile entegre çalışır ve testnet ortamları için yedek rastgelelik mekanizması sunar.

### Fonksiyonlar
- `initializeOracle()` — Oracle'ı varsayılan mainnet yapılandırmasıyla başlatır
- `setOracleAddress(address)` — Oracle kontrat adresini günceller (sadece admin)
- `setOracleMethodID(bytes32)` — Oracle metod tanımlayıcısını günceller (sadece admin)
- `setUseBackupRandomness(bool)` — Yedek rastgelelik modunu açar/kapar (sadece admin)
- `getRandomNumber()` — Oracle veya yedek kullanarak rastgele sayı üretir
- `getRandomNumberWithSeed(bytes32)` — Ek entropi ile rastgele sayı üretir
- `getRandomInRange(uint256,uint256)` — Belirtilen aralıkta rastgele sayı döndürür
- `getGameRandomNumber(bytes32,uint256,address)` — Oyuna özel rastgele sayı üretimi
- `getOracleData()` — Mevcut oracle yapılandırmasını döndürür
- `getOracleAge()` — Son oracle değerinin yaşını saniye cinsinden döndürür
- `testOracleConnection()` — Oracle'a erişilebilir olup olmadığını test eder
- `forceUpdateOracle()` — Oracle değerini güncellemeye zorlar (sadece admin)

### Yetkiler
- Admin fonksiyonları: Sadece kontrat sahibi oracle ayarlarını değiştirebilir
- Public fonksiyonlar: Herhangi bir kontrat/kullanıcı rastgele sayı isteyebilir
- Dahili kullanım: Diğer facet'ler rastgele sayı üretim fonksiyonlarını çağırabilir

### Depolama
`LibOracleStorage` kullanarak şunları depolar:
- Oracle kontrat adresi
- Oracle metod ID'si
- Yedek rastgelelik açma/kapama durumu
- Son oracle değeri ve zaman damgası

### Event'ler
- `OracleValueUpdated(uint256 value, uint256 timestamp)`
- `OracleAddressChanged(address oldAddress, address newAddress)`
- `OracleMethodIDChanged(bytes32 oldMethodID, bytes32 newMethodID)`
- `BackupRandomnessToggled(bool enabled)`

### Örnekler
```solidity
// Oracle'ı başlat
oracleFacet.initializeOracle();

// Rastgele sayı al
uint256 rastgele = oracleFacet.getRandomNumber();

// [1, 100] aralığında rastgele sayı
uint256 zarAtisi = oracleFacet.getRandomInRange(1, 100);

// Oyuna özel rastgele
bytes32 oyunId = keccak256("GRIDOTTO");
uint256 oyunRastgele = oracleFacet.getGameRandomNumber(oyunId, turNumarasi, oyuncu);
```