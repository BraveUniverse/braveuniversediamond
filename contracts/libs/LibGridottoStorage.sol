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
        HYBRID_FUNDED,
        WINNER_TAKES_ALL,
        SPLIT_EQUALLY,
        TIERED_PERCENTAGE,
        TIERED_FIXED
    }

    enum ParticipationRequirement {
        NONE,
        FOLLOWERS_ONLY,
        LSP7_HOLDER,
        LSP8_HOLDER,
        FOLLOWERS_AND_LSP7,
        FOLLOWERS_AND_LSP8,
        HOLD_TOKEN,
        VIP_PASS,
        PROFILE_REQUIRED
    }

    struct DrawPrizeConfig {
        PrizeModel model;
        uint256 creatorContribution;
        bool addParticipationFees;
        uint256 participationFeePercent;
        uint256 totalWinners; // For multi-winner draws
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
    
    struct TierConfig {
        uint256 prizePercentage; // For percentage-based
        uint256 fixedPrize;      // For fixed amount
        bytes32 nftTokenId;      // Specific NFT for this tier
    }
    
    struct LSP26Config {
        bool requireFollowing;
        address profileToFollow;
        uint256 minFollowers;
        bool requireMutualFollow;
    }
    


    struct UserDraw {
        address creator;
        DrawType drawType;
        DrawPrizeConfig prizeConfig;
        
        // Pricing
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        uint256 totalTickets; // Total tickets sold
        
        // Prize details
        address prizeToken;
        uint256 initialPrize;
        uint256 currentPrizePool;
        uint256 currentPrize; // Current prize amount
        uint256 collectedFees;
        
        // For NFT
        bytes32[] prizeTokenIds;
        
        // For LSP7/LSP8
        address tokenAddress;
        address nftAddress;
        address nftContract; // NFT contract address
        bytes32[] nftTokenIds;
        
        // Participation
        ParticipationRequirement requirement;
        address requiredToken;
        uint256 minTokenAmount;
        uint256 minFollowerCount; // For LSP26
        
        // Multi-winner configuration
        MultiWinnerConfig winnerConfig;
        
        // LSP26 configuration
        LSP26Config lsp26Config;
        
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

    // Winner tracking for leaderboard
    struct WinnerInfo {
        address winner;
        uint256 drawId;
        DrawType drawType;
        uint256 prizeAmount;
        address prizeToken; // address(0) for LYX
        bytes32 nftTokenId; // For NFT prizes
        address drawCreator;
        uint256 timestamp;
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
        mapping(address => mapping(address => uint256)) pendingTokenPrizes; // user => token => amount
        mapping(address => mapping(address => bytes32[])) pendingNFTPrizes; // user => nftContract => tokenIds
        
        // Recent winners tracking for leaderboard
        WinnerInfo[] recentWinners;
        uint256 maxRecentWinners; // Default 100
        
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
        
        // Phase 4: Tier configurations
        mapping(uint256 => TierConfig[]) drawTiers; // drawId => tiers
        mapping(uint256 => mapping(uint256 => bytes32)) tierNFTAssignments; // drawId => tier => nftTokenId
        
        // Security
        bool paused;
        bool locked; // Reentrancy guard
        mapping(address => uint256) lastActionTimestamp;
        
        // Creator profit tracking  
        mapping(address => uint256) creatorProfit;
        mapping(address => mapping(address => uint256)) creatorTokenProfit; // creator => token => amount
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = GRIDOTTO_STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
    
    // Track winner for leaderboard
    function trackWinner(
        address winner,
        uint256 drawId,
        DrawType drawType,
        uint256 prizeAmount,
        address prizeToken,
        bytes32 nftTokenId,
        address drawCreator
    ) internal {
        Layout storage l = layout();
        
        // Initialize max if not set
        if (l.maxRecentWinners == 0) {
            l.maxRecentWinners = 100;
        }
        
        // Add to recent winners
        l.recentWinners.push(WinnerInfo({
            winner: winner,
            drawId: drawId,
            drawType: drawType,
            prizeAmount: prizeAmount,
            prizeToken: prizeToken,
            nftTokenId: nftTokenId,
            drawCreator: drawCreator,
            timestamp: block.timestamp
        }));
        
        // Keep only the most recent winners
        if (l.recentWinners.length > l.maxRecentWinners) {
            // Remove oldest winner
            for (uint256 i = 0; i < l.recentWinners.length - 1; i++) {
                l.recentWinners[i] = l.recentWinners[i + 1];
            }
            l.recentWinners.pop();
        }
    }
}