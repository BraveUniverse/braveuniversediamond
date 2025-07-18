# Facet: DiamondCutFacet

### Amacı
Diamond'a facet'leri ve fonksiyonlarını ekleme, değiştirme ve kaldırma işlevselliği sağlar. Bu, Diamond proxy deseni için temel yükseltme mekanizmasıdır ve durum korunurken modüler kontrat evrimine olanak tanır.

### Fonksiyonlar
- `diamondCut(FacetCut[] memory _diamondCut, address _init, bytes memory _calldata)` — Facet'leri değiştirmek için diamond cut'ları yürütür. Yeni fonksiyonlar ekleyebilir, mevcut olanları değiştirebilir veya Diamond'dan fonksiyonları kaldırabilir.

### Yetkiler
- Yalnızca kontrat sahibi diamond cut'ları yürütebilir
- LibDiamond'dan `enforceIsContractOwner()` modifier'ı ile korunur
- Tüm yükseltme işlevselliğini kontrol ettiği için Diamond güvenliği açısından kritiktir

### Depolama
Diamond depolama yönetimi için `LibDiamond` kullanır. Doğrudan temel Diamond depolama yapısı üzerinde çalıştığı için ek depolama kütüphanesi gerektirmez.

### Deployment Detayları
- **Ağ**: LUKSO Testnet
- **Adres**: `0x7C1BedB4DB36c95f810361aC291E50e1719AE4BF`
- **Fonksiyon Seçicileri**: `0x1f931c1c` (diamondCut)