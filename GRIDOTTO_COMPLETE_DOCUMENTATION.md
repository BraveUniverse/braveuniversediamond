# Gridotto Complete Documentation / Gridotto Komple Dokümantasyon

## Table of Contents / İçindekiler

1. [System Overview / Sistem Genel Bakış](#system-overview--sistem-genel-bakış)
2. [Architecture / Mimari](#architecture--mimari)
3. [Smart Contracts / Akıllı Kontratlar](#smart-contracts--akıllı-kontratlar)
4. [Functions / Fonksiyonlar](#functions--fonksiyonlar)
5. [Testing / Test](#testing--test)
6. [Deployment / Dağıtım](#deployment--dağıtım)
7. [UI Integration / UI Entegrasyonu](#ui-integration--ui-entegrasyonu)
8. [Troubleshooting / Sorun Giderme](#troubleshooting--sorun-giderme)

---

## System Overview / Sistem Genel Bakış

### English

Gridotto is a decentralized lottery system built on LUKSO blockchain using the EIP-2535 Diamond Standard. The system allows users to:
- Create custom lottery draws with LYX or LSP7 tokens
- Buy tickets and participate in draws
- Execute draws and claim prizes
- View leaderboards and statistics

### Türkçe

Gridotto, LUKSO blockchain üzerinde EIP-2535 Diamond Standardı kullanılarak geliştirilmiş merkezi olmayan bir piyango sistemidir. Sistem kullanıcılara şunları sağlar:
- LYX veya LSP7 token'ları ile özel piyango çekilişleri oluşturma
- Bilet satın alma ve çekilişlere katılma
- Çekilişleri yürütme ve ödülleri talep etme
- Lider tabloları ve istatistikleri görüntüleme

---

## Architecture / Mimari

### English

The system uses a modular architecture with the following components:

1. **Diamond Proxy**: Central contract that delegates calls to facets
2. **Facets**: Modular components containing business logic
   - GridottoCoreFacet: Draw creation, ticket purchase, views
   - GridottoExecutionFacetSimple: Draw execution and prize claiming
   - GridottoAdminFacetSimple: Administrative functions
   - GridottoLeaderboardFacetSimple: Statistics and leaderboards
3. **Storage**: Simplified storage library (LibGridottoStorageSimple)

### Türkçe

Sistem aşağıdaki bileşenlerle modüler bir mimari kullanır:

1. **Diamond Proxy**: Çağrıları facet'lere yönlendiren merkezi kontrat
2. **Facet'ler**: İş mantığını içeren modüler bileşenler
   - GridottoCoreFacet: Çekiliş oluşturma, bilet satın alma, görüntüleme
   - GridottoExecutionFacetSimple: Çekiliş yürütme ve ödül talep etme
   - GridottoAdminFacetSimple: Yönetim fonksiyonları
   - GridottoLeaderboardFacetSimple: İstatistikler ve lider tabloları
3. **Depolama**: Basitleştirilmiş depolama kütüphanesi (LibGridottoStorageSimple)

---

## Smart Contracts / Akıllı Kontratlar

### Contract Addresses / Kontrat Adresleri

**Diamond Proxy**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

**Current Facets / Mevcut Facet'ler**:
- GridottoCoreFacet: `0x8400Ec09EdB6D454A00274176eB3AFc15CCB0aFE`
- GridottoExecutionFacetSimple: `0x71b49A77325C483d404dE22edaD29E6e164BDB36`
- GridottoAdminFacetSimple: `0x6a029f8654334130bA500f05ccc939576D83516f`
- GridottoLeaderboardFacetSimple: `0xb4DDeC2d27CeEb93883139257Cc367e77D8f5Ca7`

---

## Functions / Fonksiyonlar

### GridottoCoreFacet

#### English

**Draw Creation**
```solidity
function createLYXDraw(
    uint256 ticketPrice,      // Price per ticket in LYX
    uint256 maxTickets,       // Maximum tickets available
    uint256 duration,         // Duration in seconds (min 60, max 30 days)
    uint256 minParticipants,  // Minimum participants required
    uint256 platformFeePercent // Platform fee (max 2000 = 20%)
) external payable returns (uint256 drawId)
```

**Ticket Purchase**
```solidity
function buyTickets(
    uint256 drawId,  // Draw ID to buy tickets for
    uint256 amount   // Number of tickets to buy
) external payable
```

**View Functions**
```solidity
function getDrawDetails(uint256 drawId) external view returns (DrawDetails memory)
function getUserTickets(uint256 drawId, address user) external view returns (uint256)
function getActiveDraws() external view returns (uint256[] memory)
function getDrawParticipants(uint256 drawId) external view returns (address[] memory)
```

#### Türkçe

**Çekiliş Oluşturma**
```solidity
function createLYXDraw(
    uint256 ticketPrice,      // LYX cinsinden bilet fiyatı
    uint256 maxTickets,       // Maksimum bilet sayısı
    uint256 duration,         // Saniye cinsinden süre (min 60, maks 30 gün)
    uint256 minParticipants,  // Minimum katılımcı sayısı
    uint256 platformFeePercent // Platform ücreti (maks 2000 = %20)
) external payable returns (uint256 drawId)
```

**Bilet Satın Alma**
```solidity
function buyTickets(
    uint256 drawId,  // Bilet alınacak çekiliş ID'si
    uint256 amount   // Alınacak bilet sayısı
) external payable
```

**Görüntüleme Fonksiyonları**
```solidity
function getDrawDetails(uint256 drawId) external view returns (DrawDetails memory)
function getUserTickets(uint256 drawId, address user) external view returns (uint256)
function getActiveDraws() external view returns (uint256[] memory)
function getDrawParticipants(uint256 drawId) external view returns (address[] memory)
```

### GridottoExecutionFacetSimple

#### English

**Draw Execution**
```solidity
function executeDraw(uint256 drawId) external
// Executes a draw after it ends, selects winner randomly
```

**Prize Claiming**
```solidity
function claimPrize(uint256 drawId) external
// Winners claim their prizes
```

#### Türkçe

**Çekiliş Yürütme**
```solidity
function executeDraw(uint256 drawId) external
// Çekiliş sona erdikten sonra yürütür, kazananı rastgele seçer
```

**Ödül Talep Etme**
```solidity
function claimPrize(uint256 drawId) external
// Kazananlar ödüllerini talep eder
```

### GridottoAdminFacetSimple

#### English

- `pause()`: Pause the system
- `unpause()`: Unpause the system
- `emergencyWithdraw()`: Withdraw all LYX in emergency
- `withdrawPlatformFees()`: Withdraw accumulated platform fees
- `setDefaultPlatformFee(uint256 fee)`: Set default platform fee

#### Türkçe

- `pause()`: Sistemi duraklat
- `unpause()`: Sistemi devam ettir
- `emergencyWithdraw()`: Acil durumda tüm LYX'i çek
- `withdrawPlatformFees()`: Birikmiş platform ücretlerini çek
- `setDefaultPlatformFee(uint256 fee)`: Varsayılan platform ücretini ayarla

### GridottoLeaderboardFacetSimple

#### English

- `getTopWinners(uint256 limit)`: Get top winners by total winnings
- `getTopTicketBuyers(uint256 limit)`: Get top ticket buyers by total spent
- `getTopDrawCreators(uint256 limit)`: Get top draw creators by revenue
- `getTopExecutors(uint256 limit)`: Get top executors by fees earned
- `getPlatformStats()`: Get overall platform statistics

#### Türkçe

- `getTopWinners(uint256 limit)`: Toplam kazanca göre en iyi kazananlar
- `getTopTicketBuyers(uint256 limit)`: Toplam harcamaya göre en çok bilet alanlar
- `getTopDrawCreators(uint256 limit)`: Gelire göre en iyi çekiliş oluşturucular
- `getTopExecutors(uint256 limit)`: Kazanılan ücrete göre en iyi yürütücüler
- `getPlatformStats()`: Genel platform istatistikleri

---

## Testing / Test

### English

**Quick Test Script**
```bash
npx hardhat run scripts/test-simple-draw.ts --network luksoTestnet
```

This script:
1. Creates a draw with 0.1 LYX initial prize
2. Buys 5 tickets
3. Waits for draw to end (60 seconds)
4. Executes the draw
5. Claims the prize if won

**Comprehensive Test**
```bash
npx hardhat run scripts/test-simplified-system.ts --network luksoTestnet
```

### Türkçe

**Hızlı Test Scripti**
```bash
npx hardhat run scripts/test-simple-draw.ts --network luksoTestnet
```

Bu script:
1. 0.1 LYX başlangıç ödülü ile çekiliş oluşturur
2. 5 bilet satın alır
3. Çekilişin bitmesini bekler (60 saniye)
4. Çekilişi yürütür
5. Kazandıysa ödülü talep eder

**Kapsamlı Test**
```bash
npx hardhat run scripts/test-simplified-system.ts --network luksoTestnet
```

---

## Deployment / Dağıtım

### English

**Deploy New System**
```bash
npx hardhat run scripts/deploy-simplified-system-v2.ts --network luksoTestnet
```

This will:
1. Deploy all new facets
2. Remove old facets (except Diamond standard facets)
3. Add new facets to the Diamond
4. Display deployment summary

### Türkçe

**Yeni Sistem Dağıtımı**
```bash
npx hardhat run scripts/deploy-simplified-system-v2.ts --network luksoTestnet
```

Bu işlem:
1. Tüm yeni facet'leri dağıtır
2. Eski facet'leri kaldırır (Diamond standart facet'leri hariç)
3. Yeni facet'leri Diamond'a ekler
4. Dağıtım özetini gösterir

---

## UI Integration / UI Entegrasyonu

### English

**Initialize Contract Instances**
```javascript
import { ethers } from 'ethers';

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Get provider (e.g., from MetaMask)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Contract instances
const core = new ethers.Contract(DIAMOND_ADDRESS, CoreABI, signer);
const execution = new ethers.Contract(DIAMOND_ADDRESS, ExecutionABI, signer);
const leaderboard = new ethers.Contract(DIAMOND_ADDRESS, LeaderboardABI, signer);
```

**Create Draw Example**
```javascript
async function createDraw() {
    const ticketPrice = ethers.parseEther("0.1");
    const maxTickets = 100;
    const duration = 3600; // 1 hour
    const minParticipants = 5;
    const platformFee = 500; // 5%
    const initialPrize = ethers.parseEther("1");
    
    const tx = await core.createLYXDraw(
        ticketPrice,
        maxTickets,
        duration,
        minParticipants,
        platformFee,
        { value: initialPrize }
    );
    
    const receipt = await tx.wait();
    // Extract drawId from events
}
```

### Türkçe

**Kontrat Örneklerini Başlatma**
```javascript
import { ethers } from 'ethers';

const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";

// Provider al (örn. MetaMask'tan)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Kontrat örnekleri
const core = new ethers.Contract(DIAMOND_ADDRESS, CoreABI, signer);
const execution = new ethers.Contract(DIAMOND_ADDRESS, ExecutionABI, signer);
const leaderboard = new ethers.Contract(DIAMOND_ADDRESS, LeaderboardABI, signer);
```

**Çekiliş Oluşturma Örneği**
```javascript
async function createDraw() {
    const ticketPrice = ethers.parseEther("0.1");
    const maxTickets = 100;
    const duration = 3600; // 1 saat
    const minParticipants = 5;
    const platformFee = 500; // %5
    const initialPrize = ethers.parseEther("1");
    
    const tx = await core.createLYXDraw(
        ticketPrice,
        maxTickets,
        duration,
        minParticipants,
        platformFee,
        { value: initialPrize }
    );
    
    const receipt = await tx.wait();
    // Event'lerden drawId çıkar
}
```

---

## Troubleshooting / Sorun Giderme

### English

**Common Issues**

1. **"Draw ended" error when buying tickets**
   - Check if draw has actually ended
   - Verify block.timestamp < endTime

2. **"Not enough participants" when executing**
   - Check minParticipants requirement
   - Ensure enough unique addresses bought tickets

3. **Gas estimation errors**
   - Increase gas limit manually
   - Check if contract is paused

**Debug Commands**
```javascript
// Check draw details
const details = await core.getDrawDetails(drawId);
console.log(details);

// Check if can execute
const canExecute = await execution.canExecuteDraw(drawId);
console.log(canExecute);

// Check system status
const isPaused = await admin.isPaused();
console.log(isPaused);
```

### Türkçe

**Yaygın Sorunlar**

1. **Bilet alırken "Draw ended" hatası**
   - Çekilişin gerçekten bitip bitmediğini kontrol et
   - block.timestamp < endTime olduğunu doğrula

2. **Yürütürken "Not enough participants" hatası**
   - minParticipants gereksinimini kontrol et
   - Yeterli benzersiz adresin bilet aldığından emin ol

3. **Gas tahmin hataları**
   - Gas limitini manuel olarak artır
   - Kontratın duraklatılıp duraklatılmadığını kontrol et

**Hata Ayıklama Komutları**
```javascript
// Çekiliş detaylarını kontrol et
const details = await core.getDrawDetails(drawId);
console.log(details);

// Yürütülebilir mi kontrol et
const canExecute = await execution.canExecuteDraw(drawId);
console.log(canExecute);

// Sistem durumunu kontrol et
const isPaused = await admin.isPaused();
console.log(isPaused);
```

---

## Important Notes / Önemli Notlar

### English

1. **Storage Structure**: The system uses a simplified storage structure to avoid mapping issues
2. **Minimum Duration**: Draws must run for at least 60 seconds
3. **Platform Fee**: Maximum 20% (2000 basis points)
4. **Random Number**: Uses block.prevrandao for randomness (suitable for testnet)
5. **Executor Reward**: 10% of platform fee goes to executor

### Türkçe

1. **Depolama Yapısı**: Sistem haritalama sorunlarını önlemek için basitleştirilmiş depolama yapısı kullanır
2. **Minimum Süre**: Çekilişler en az 60 saniye sürmeli
3. **Platform Ücreti**: Maksimum %20 (2000 baz puan)
4. **Rastgele Sayı**: Rastgelelik için block.prevrandao kullanır (testnet için uygun)
5. **Yürütücü Ödülü**: Platform ücretinin %10'u yürütücüye gider

---

## Contract ABIs / Kontrat ABI'ları

ABIs can be found in:
- `artifacts/contracts/facets/GridottoCoreFacet.sol/GridottoCoreFacet.json`
- `artifacts/contracts/facets/GridottoExecutionFacetSimple.sol/GridottoExecutionFacetSimple.json`
- `artifacts/contracts/facets/GridottoAdminFacetSimple.sol/GridottoAdminFacetSimple.json`
- `artifacts/contracts/facets/GridottoLeaderboardFacetSimple.sol/GridottoLeaderboardFacetSimple.json`

---

## Support / Destek

For questions or issues, please check:
1. This documentation
2. Test scripts for examples
3. Contract source code

---

Last Updated / Son Güncelleme: 22 July 2025