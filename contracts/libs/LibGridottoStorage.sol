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
        
        // Security
        bool paused;
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
}