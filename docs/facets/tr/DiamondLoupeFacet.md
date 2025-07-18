# Facet: DiamondLoupeFacet

### Amacı
Diamond için inceleme yetenekleri sağlar, kullanıcıların ve harici kontratların facet'ler, fonksiyonları ve desteklenen arayüzler hakkında bilgi sorgulamasına olanak tanır. Diamond şeffaflığı ve iç gözlem için gereklidir.

### Fonksiyonlar
- `facets()` — Tüm facet'leri ve fonksiyon seçicilerini döndürür
- `facetFunctionSelectors(address _facet)` — Belirli bir facet için fonksiyon seçicilerini döndürür
- `facetAddresses()` — Tüm facet adreslerini döndürür
- `facetAddress(bytes4 _functionSelector)` — Belirli bir fonksiyon seçicisi için facet adresini döndürür
- `supportsInterface(bytes4 _interfaceId)` — ERC165 arayüz desteği kontrolü

### Yetkiler
- Tüm fonksiyonlar herkese açıktır (view fonksiyonları)
- Bunlar salt okunur inceleme fonksiyonları olduğu için kısıtlama yoktur
- Harici kontratlar ve dApp'ler için güvenli çağrım

### Depolama
Diamond depolama erişimi için `LibDiamond` kullanır. Facet bilgisi sağlamak için paylaşılan Diamond depolamasından okur. Ek depolama kütüphanesi gerektirmez.

### Deployment Detayları
- **Ağ**: LUKSO Testnet
- **Adres**: `0x8C272e3e0a3B0dB07c152F38981c3a04021a6377`
- **Fonksiyon Seçicileri**: `0x7a0ed627`, `0xadfca15e`, `0x52ef6b2c`, `0xcdffacc6`, `0x01ffc9a7`