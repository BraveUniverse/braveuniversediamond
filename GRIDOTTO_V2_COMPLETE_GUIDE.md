# Gridotto V2 Complete Guide / Gridotto V2 Tam Rehber

## 🌐 English Documentation

### Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Smart Contract Functions](#smart-contract-functions)
4. [Revenue Model](#revenue-model)
5. [Testing Guide](#testing-guide)
6. [UI Integration](#ui-integration)
7. [Deployment](#deployment)

---

## Overview

Gridotto V2 is a decentralized lottery platform built on the LUKSO blockchain using the EIP-2535 Diamond Standard. The platform supports multiple draw types, automated weekly/monthly draws, and comprehensive leaderboard systems.

### Key Features
- **Multiple Draw Types**: LYX (native token), LSP7 (tokens), LSP8 (NFTs)
- **Platform-Managed Draws**: Automated weekly and monthly draws
- **Monthly Ticket System**: Earn tickets through participation
- **Comprehensive Leaderboards**: Track top winners, buyers, creators, and executors
- **Refund Mechanism**: Automatic refunds for cancelled draws
- **Modular Architecture**: Diamond standard for upgradability

## Architecture

### Diamond Facets
1. **GridottoCoreV2Facet**: Core draw creation and ticket purchase
2. **GridottoExecutionV2Facet**: Draw execution and winner selection
3. **GridottoPlatformDrawsFacet**: Platform weekly/monthly draw management
4. **GridottoRefundFacet**: Prize claiming and refund handling
5. **GridottoAdminFacet**: Administrative functions
6. **GridottoLeaderboardFacet**: Statistics and leaderboards
7. **OracleFacet**: Random number generation

### Storage Structure (LibGridottoStorageV2)
```solidity
enum DrawType {
    USER_LYX,      // User-created LYX draws
    USER_LSP7,     // User-created token draws
    USER_LSP8,     // User-created NFT draws
    PLATFORM_WEEKLY,   // Platform weekly draw
    PLATFORM_MONTHLY   // Platform monthly draw
}
```

## Smart Contract Functions

### Core Functions (GridottoCoreV2Facet)

#### Create LYX Draw
```solidity
function createLYXDraw(
    uint256 ticketPrice,      // Price per ticket in LYX
    uint256 maxTickets,       // Maximum tickets available
    uint256 duration,         // Duration in seconds (60 - 30 days)
    uint256 minParticipants,  // Minimum participants required
    uint256 platformFeePercent // Platform fee (max 2000 = 20%)
) external payable returns (uint256 drawId)
```

#### Create Token Draw (LSP7)
```solidity
function createTokenDraw(
    address tokenAddress,     // LSP7 token contract
    uint256 ticketPrice,      // Price per ticket in tokens
    uint256 maxTickets,       
    uint256 duration,         
    uint256 minParticipants,  
    uint256 platformFeePercent,
    uint256 initialPrize      // Initial prize pool in tokens
) external returns (uint256 drawId)
```

#### Create NFT Draw (LSP8)
```solidity
function createNFTDraw(
    address nftContract,      // LSP8 NFT contract
    bytes32[] memory nftTokenIds, // NFT token IDs as prizes
    uint256 ticketPrice,      // Price per ticket in LYX
    uint256 maxTickets,
    uint256 duration,
    uint256 minParticipants,
    uint256 platformFeePercent
) external returns (uint256 drawId)
```

#### Buy Tickets
```solidity
function buyTickets(
    uint256 drawId,
    uint256 amount
) external payable
```

### Execution Functions (GridottoExecutionV2Facet)

#### Execute Draw
```solidity
function executeDraw(uint256 drawId) external
// Anyone can execute after draw ends
// Executor receives 5% fee
```

### Platform Draw Functions (GridottoPlatformDrawsFacet)

#### Execute Weekly Draw
```solidity
function executeWeeklyDraw() external
// Executes current weekly draw
// Creates new weekly draw automatically
// Every 4th execution creates monthly draw
```

#### Execute Monthly Draw
```solidity
function executeMonthlyDraw() external
// Executes monthly draw for ticket holders
// Uses accumulated monthly tickets
```

### Refund Functions (GridottoRefundFacet)

#### Claim Prize
```solidity
function claimPrize(uint256 drawId) external
// Winners claim their prizes
```

#### Claim Refund
```solidity
function claimRefund(uint256 drawId) external
// Claim refund for cancelled draws
```

## Revenue Model

### Fee Distribution

#### User-Created Draws (LYX/LSP7/LSP8)
- **Platform Fee**: 5% (customizable per draw)
- **Executor Fee**: 5% 
- **Monthly Pool**: 2% (only for non-weekly LYX draws)
- **Winner Prize**: 88-90%

#### Weekly Platform Draws
- **Platform Fee**: 5%
- **Executor Fee**: 5%
- **Monthly Pool**: 20%
- **Winner Prize**: 70%

#### Monthly Platform Draws
- **Platform Fee**: 5%
- **Executor Fee**: 5%
- **Winner Prize**: 90%
- **Prize Pool**: Accumulated monthly pool

### Monthly Ticket Earning

Users earn tickets for monthly draws through:
1. **Weekly Participation**: 1 ticket per weekly draw ticket
2. **Draw Creation**: 1 ticket per draw created (max 5/month)
3. **Draw Participation**: 1 ticket per unique draw (max 15/month)

## Testing Guide

### Prerequisites
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your private key to .env
```

### Run Comprehensive Tests
```bash
# Deploy and test all features
npx hardhat run scripts/test-comprehensive-multi-account.ts --network luksoTestnet

# Quick test
npx hardhat run scripts/test-final-working.ts --network luksoTestnet
```

### Test Scenarios Covered
1. ✅ Multi-account LYX draw creation and execution
2. ✅ LSP7 token draw with multiple participants
3. ✅ LSP8 NFT draw and prize distribution
4. ✅ Draw cancellation and refund claims
5. ✅ Weekly draw participation
6. ✅ Monthly ticket accumulation
7. ✅ Platform fee collection
8. ✅ Leaderboard functionality

## UI Integration

### Important Contract Addresses
- **Diamond**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Network**: LUKSO Testnet

### Key UI Components

#### Draw Creation Form
- Draw type selector (LYX/LSP7/LSP8)
- Ticket price input
- Duration selector (1 hour to 30 days)
- Minimum participants
- Platform fee percentage

#### Draw List View
- Active draws
- Draw type badges
- Time remaining
- Participant count
- Prize pool display

#### Leaderboards
1. **Top Winners**: Total winnings, draws won, last win
2. **Top Ticket Buyers**: Total tickets, LYX spent, last purchase
3. **Top Draw Creators**: Draws created, revenue, success rate
4. **Top Executors**: Executions, fees earned, average time

### Event Listeners
```javascript
// Draw Created
contract.on("DrawCreated", (drawId, creator, drawType) => {
    // Update UI
});

// Tickets Purchased
contract.on("TicketsPurchased", (drawId, buyer, amount) => {
    // Update participant list
});

// Draw Executed
contract.on("DrawExecuted", (drawId, executor, winners) => {
    // Show winner announcement
});
```

## Deployment

### Deploy Diamond
```bash
npx hardhat run scripts/deploy-diamond.ts --network luksoTestnet
```

### Verify Deployment
```bash
npx hardhat run scripts/verify-deployment.ts --network luksoTestnet
```

### Initialize Platform Draws
```bash
npx hardhat run scripts/initialize-platform.ts --network luksoTestnet
```

---

## 🇹🇷 Türkçe Dokümantasyon

### İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Mimari](#mimari)
3. [Akıllı Sözleşme Fonksiyonları](#akıllı-sözleşme-fonksiyonları)
4. [Gelir Modeli](#gelir-modeli)
5. [Test Rehberi](#test-rehberi)
6. [UI Entegrasyonu](#ui-entegrasyonu)
7. [Deployment](#deployment-tr)

---

## Genel Bakış

Gridotto V2, EIP-2535 Diamond Standardı kullanılarak LUKSO blockchain üzerinde inşa edilmiş merkezi olmayan bir piyango platformudur. Platform birden fazla çekiliş türünü, otomatik haftalık/aylık çekilişleri ve kapsamlı liderlik tablosu sistemlerini destekler.

### Ana Özellikler
- **Çoklu Çekiliş Türleri**: LYX (yerel token), LSP7 (tokenlar), LSP8 (NFT'ler)
- **Platform Yönetimli Çekilişler**: Otomatik haftalık ve aylık çekilişler
- **Aylık Bilet Sistemi**: Katılım yoluyla bilet kazanma
- **Kapsamlı Liderlik Tabloları**: En çok kazananlar, alıcılar, yaratıcılar ve yürütücüler
- **İade Mekanizması**: İptal edilen çekilişler için otomatik iade
- **Modüler Mimari**: Yükseltilebilirlik için Diamond standardı

## Mimari

### Diamond Facet'leri
1. **GridottoCoreV2Facet**: Temel çekiliş oluşturma ve bilet satın alma
2. **GridottoExecutionV2Facet**: Çekiliş yürütme ve kazanan seçimi
3. **GridottoPlatformDrawsFacet**: Platform haftalık/aylık çekiliş yönetimi
4. **GridottoRefundFacet**: Ödül talep etme ve iade işlemleri
5. **GridottoAdminFacet**: Yönetimsel fonksiyonlar
6. **GridottoLeaderboardFacet**: İstatistikler ve liderlik tabloları
7. **OracleFacet**: Rastgele sayı üretimi

## Akıllı Sözleşme Fonksiyonları

### Temel Fonksiyonlar (GridottoCoreV2Facet)

#### LYX Çekilişi Oluştur
```solidity
createLYXDraw(
    ticketPrice,      // Bilet başına LYX fiyatı
    maxTickets,       // Maksimum bilet sayısı
    duration,         // Saniye cinsinden süre (60 - 30 gün)
    minParticipants,  // Minimum katılımcı sayısı
    platformFeePercent // Platform ücreti (maks 2000 = %20)
)
```

#### Token Çekilişi Oluştur (LSP7)
```solidity
createTokenDraw(
    tokenAddress,     // LSP7 token sözleşmesi
    ticketPrice,      // Token cinsinden bilet fiyatı
    maxTickets,       
    duration,         
    minParticipants,  
    platformFeePercent,
    initialPrize      // Token cinsinden başlangıç ödül havuzu
)
```

#### NFT Çekilişi Oluştur (LSP8)
```solidity
createNFTDraw(
    nftContract,      // LSP8 NFT sözleşmesi
    nftTokenIds,      // Ödül olarak NFT token ID'leri
    ticketPrice,      // LYX cinsinden bilet fiyatı
    maxTickets,
    duration,
    minParticipants,
    platformFeePercent
)
```

## Gelir Modeli

### Ücret Dağılımı

#### Kullanıcı Çekilişleri (LYX/LSP7/LSP8)
- **Platform Ücreti**: %5 (çekiliş başına özelleştirilebilir)
- **Yürütücü Ücreti**: %5
- **Aylık Havuz**: %2 (sadece haftalık olmayan LYX çekilişleri)
- **Kazanan Ödülü**: %88-90

#### Haftalık Platform Çekilişleri
- **Platform Ücreti**: %5
- **Yürütücü Ücreti**: %5
- **Aylık Havuz**: %20
- **Kazanan Ödülü**: %70

#### Aylık Platform Çekilişleri
- **Platform Ücreti**: %5
- **Yürütücü Ücreti**: %5
- **Kazanan Ödülü**: %90
- **Ödül Havuzu**: Birikmiş aylık havuz

### Aylık Bilet Kazanma

Kullanıcılar şu yollarla aylık çekiliş bileti kazanır:
1. **Haftalık Katılım**: Haftalık çekiliş bileti başına 1 bilet
2. **Çekiliş Oluşturma**: Oluşturulan çekiliş başına 1 bilet (maks 5/ay)
3. **Çekiliş Katılımı**: Benzersiz çekiliş başına 1 bilet (maks 15/ay)

## Test Rehberi

### Test Senaryoları
1. ✅ Çok hesaplı LYX çekilişi oluşturma ve yürütme
2. ✅ Birden fazla katılımcılı LSP7 token çekilişi
3. ✅ LSP8 NFT çekilişi ve ödül dağıtımı
4. ✅ Çekiliş iptali ve iade talepleri
5. ✅ Haftalık çekiliş katılımı
6. ✅ Aylık bilet birikimi
7. ✅ Platform ücreti toplama
8. ✅ Liderlik tablosu işlevselliği

### Test Çalıştırma
```bash
# Kapsamlı test
npx hardhat run scripts/test-comprehensive-multi-account.ts --network luksoTestnet

# Hızlı test
npx hardhat run scripts/test-final-working.ts --network luksoTestnet
```

## UI Entegrasyonu

### Önemli Sözleşme Adresleri
- **Diamond**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`
- **Ağ**: LUKSO Testnet

### Ana UI Bileşenleri

#### Çekiliş Oluşturma Formu
- Çekiliş tipi seçici (LYX/LSP7/LSP8)
- Bilet fiyatı girişi
- Süre seçici (1 saat - 30 gün)
- Minimum katılımcı
- Platform ücret yüzdesi

#### Çekiliş Listesi
- Aktif çekilişler
- Çekiliş tipi rozetleri
- Kalan süre
- Katılımcı sayısı
- Ödül havuzu gösterimi

#### Liderlik Tabloları
1. **En Çok Kazananlar**: Toplam kazanç, kazanılan çekilişler, son kazanç
2. **En Çok Bilet Alanlar**: Toplam bilet, harcanan LYX, son satın alma
3. **En Çok Çekiliş Oluşturanlar**: Oluşturulan çekilişler, gelir, başarı oranı
4. **En Çok Yürütenler**: Yürütmeler, kazanılan ücretler, ortalama süre

## Deployment

### Diamond Deploy Etme
```bash
npx hardhat run scripts/deploy-diamond.ts --network luksoTestnet
```

### Platform Çekilişlerini Başlatma
```bash
npx hardhat run scripts/initialize-platform.ts --network luksoTestnet
```

---

## 📞 Contact / İletişim

- **GitHub**: [Repository Link]
- **Documentation**: This file
- **Network**: LUKSO Testnet
- **Diamond Address**: `0x5Ad808FAE645BA3682170467114e5b80A70bF276`

## 🚀 Quick Start / Hızlı Başlangıç

```bash
# Clone repository / Repoyu klonla
git clone [repository-url]

# Install dependencies / Bağımlılıkları yükle
npm install

# Configure environment / Ortamı yapılandır
cp .env.example .env

# Run tests / Testleri çalıştır
npm test

# Deploy / Deploy et
npm run deploy
```

---

**Version**: 2.0.0  
**Last Updated**: December 2024  
**License**: MIT