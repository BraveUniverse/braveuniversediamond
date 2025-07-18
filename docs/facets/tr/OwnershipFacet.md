# Facet: OwnershipFacet

### Amacı
Diamond kontratının sahipliğini yönetir, güvenli sahiplik transfer işlevselliği sağlar. Kontrat sahipliği için ERC173 standardını uygular ve yönetim fonksiyonları için uygun erişim kontrolü sağlar.

### Fonksiyonlar
- `owner()` — Mevcut sahip adresini döndürür
- `transferOwnership(address _newOwner)` — Sahipliği yeni bir adrese transfer eder (yalnızca mevcut sahip çağırabilir)

### Yetkiler
- `owner()` herkese açıktır (view fonksiyonu)
- `transferOwnership()` yalnızca mevcut kontrat sahibi tarafından çağrılabilir
- LibDiamond'dan `enforceIsContractOwner()` modifier'ı ile korunur
- Diamond cut'ları ve diğer yönetim fonksiyonları için sahiplik gereklidir

### Depolama
Diamond depolama yönetimi için `LibDiamond` kullanır. Sahip adresi, tüm facet'ler arasında erişilebilen paylaşılan Diamond depolama yapısında saklanır.

### Deployment Detayları
- **Ağ**: LUKSO Testnet
- **Adres**: `0xc6Ca514Ab32458bf35c04f908463345149a3c6A8`
- **Fonksiyon Seçicileri**: `0x8da5cb5b` (owner), `0xf2fde38b` (transferOwnership)