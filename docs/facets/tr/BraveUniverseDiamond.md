# Facet: BraveUniverseDiamond

### Amacı
BraveUniverse ekosistemi için ana Diamond kontratı. EIP-2535 Diamond proxy desenini uygulayarak, yükseltilebilir facet'ler ve paylaşılan depolama imkanı sunan modüler bir akıllı kontrat sistemi sağlar. Tüm BraveUniverse işlevselliği için merkezi hub görevi görür.

### Fonksiyonlar
- `fallback()` — Tüm fonksiyon çağrılarını Diamond proxy deseni kullanarak uygun facet'lere yönlendirir
- `receive()` — Diamond kontratına ETH transferlerini kabul eder

### Yetkiler
- Fallback fonksiyonu herkes tarafından çağrılabilir, ancak gerçek erişim kontrolü bireysel facet'ler tarafından uygulanır
- Yalnızca kayıtlı facet'lerde bulunan fonksiyonlar çağrılabilir
- Sahiplik ve yönetim fonksiyonları OwnershipFacet tarafından yönetilir

### Depolama
Facet kayıt defteri, fonksiyon seçicileri ve ERC165 arayüz desteği dahil olmak üzere Diamond depolama yönetimi için `LibDiamond` kullanır. Diamond depolaması, Diamond depolama deseni kullanılarak tüm facet'ler arasında paylaşılır.

### Deployment Detayları
- **Ağ**: LUKSO Testnet
- **Adres**: `0xda142c5978D707E83618390F4f8796bD7eb3a790`
- **Başlangıç Facet'leri**: DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet