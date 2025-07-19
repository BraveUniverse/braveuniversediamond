// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library LibGridottoStorage {
    bytes32 constant GRIDOTTO_STORAGE_POSITION = keccak256("braveUniverse.storage.gridotto");

    enum DrawType {
        OFFICIAL_DAILY,
        OFFICIAL_MONTHLY,
        USER_LYX,
        USER_LSP7,
        USER_LSP8
    }

    enum PrizeModel {
        CREATOR_FUNDED,
        PARTICIPANT_FUNDED,
        HYBRID_FUNDED
    }

    enum ParticipationRequirement {
        NONE,
        FOLLOWERS_ONLY,
        LSP7_HOLDER,
        LSP8_HOLDER,
        FOLLOWERS_AND_LSP7,
        FOLLOWERS_AND_LSP8
    }

    struct DrawPrizeConfig {
        PrizeModel model;
        uint256 creatorContribution;
        bool addParticipationFees;
        uint256 participationFeePercent;
    }
    
    struct PrizeTier {
        uint256 winnersCount;     // Number of winners in this tier
        uint256 prizePercent;     // Percentage of prize pool for this tier
        bytes32[] specificNFTIds; // For NFT draws: specific NFTs for this tier
    }
    
    struct MultiWinnerConfig {
        bool enabled;
        PrizeTier[] tiers;
        uint256 totalWinners;
    }
    
    struct UserStats {
        uint256 totalDrawsCreated;
        uint256 totalParticipations;
        uint256 totalWins;
        uint256 totalSpent;
        uint256 totalWon;
    }

    struct UserDraw {
        address creator;
        DrawType drawType;
        DrawPrizeConfig prizeConfig;
        
        // Pricing
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        
        // Prize details
        address prizeToken;
        uint256 initialPrize;
        uint256 currentPrizePool;
        uint256 collectedFees;
        
        // For NFT
        bytes32[] prizeTokenIds;
        
        // For LSP7/LSP8
        address tokenAddress;
        address nftAddress;
        bytes32[] nftTokenIds;
        
        // Participation
        ParticipationRequirement requirement;
        address requiredToken;
        uint256 minTokenAmount;
        uint256 minFollowerCount; // For LSP26
        
        // Multi-winner configuration
        MultiWinnerConfig winnerConfig;
        
        // Status
        uint256 startTime;
        uint256 endTime;
        bool isCompleted;
        address[] winners;
        
        // Fees
        uint256 platformFeeCollected;
        
        // Ticket tracking
        mapping(address => uint256) userTickets;
        address[] participants;
        mapping(address => bool) hasParticipated;
    }

    struct Layout {
        // Official draws (legacy)
        uint256 currentDraw;
        uint256 currentMonthlyDraw;
        uint256 drawInterval;
        uint256 monthlyDrawInterval;
        uint256 drawTime;
        uint256 monthlyDrawTime;
        uint256 ticketPrice;
        uint256 ownerFeePercent;
        uint256 monthlyPoolPercent;
        
        // User draws
        uint256 nextDrawId;
        mapping(uint256 => UserDraw) userDraws;
        mapping(address => uint256[]) userCreatedDraws;
        mapping(address => uint256[]) userParticipatedDraws;
        uint256[] activeUserDraws;
        mapping(uint256 => mapping(address => bool)) hasParticipated;
        
        // Official draw storage (legacy compatible)
        mapping(uint256 => address[]) drawTickets;
        mapping(uint256 => address[]) monthlyDrawTickets;
        mapping(uint256 => address) winners;
        mapping(uint256 => address) monthlyWinners;
        mapping(uint256 => uint256) drawPrizes;
        mapping(uint256 => uint256) monthlyDrawPrizes;
        
        // User balances
        mapping(address => uint256) pendingPrizes;
        
        // Pool amounts
        uint256 monthlyPrizePool;
        uint256 currentDrawPrizePool;
        uint256 ownerProfit;
        mapping(address => uint256) ownerTokenProfit; // token address => amount
        
        // Oracle
        address oracleAddress;
        bytes32 oracleMethodId;
        
        // VIP Pass
        address vipPassAddress;
        mapping(uint8 => uint256) vipTierFeeDiscount;
        
        // LSP26 Follower System (mainnet only)
        address lsp26Address;
        
        // Security
        bool paused;
        mapping(address => uint256) lastActionTimestamp;
        
        // Creator profit tracking  
        mapping(address => uint256) creatorProfit;
        mapping(address => mapping(address => uint256)) creatorTokenProfit; // creator => token => amount
        
        // Admin configurations
        uint256 platformFeePercent; // Default 5%
        uint256 executorRewardPercent; // Default 5%
        uint256 maxExecutorReward; // Default 5 LYX
        uint256 maxTicketsPerDraw; // Default 100000
        uint256 minDrawDuration; // Default 1 hour
        uint256 minParticipants; // Default 1
        
        // Access control
        mapping(address => bool) blacklisted;
        mapping(address => bool) banned;
        mapping(address => uint256) userDrawLimit; // Per user draw creation limit
        uint256 globalDrawLimit; // Global draw limit per user
        
        // Statistics
        uint256 totalPlatformVolume;
        uint256 totalCompletedDraws;
        mapping(address => uint256) tokenVolume; // token => volume
        mapping(address => UserStats) userStats;
        
        // Feature toggles
        mapping(string => bool) features;
        
        // VIP configurations
        mapping(uint8 => uint256) vipBonusTickets; // tier => bonus percent
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = GRIDOTTO_STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
}