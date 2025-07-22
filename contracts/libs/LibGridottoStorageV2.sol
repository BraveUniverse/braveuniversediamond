// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library LibGridottoStorageV2 {
    bytes32 constant STORAGE_POSITION = keccak256("gridotto.storage.v2");

    enum DrawType {
        USER_LYX,
        USER_LSP7,
        USER_LSP8,
        PLATFORM_WEEKLY,
        PLATFORM_MONTHLY
    }

    struct DrawConfig {
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 duration;
        uint256 minParticipants;
        uint256 platformFeePercent; // in basis points (10000 = 100%)
    }

    struct Draw {
        // Basic info
        address creator;
        DrawType drawType;
        DrawConfig config;
        
        // Token info (for LSP7/LSP8)
        address tokenAddress;
        bytes32[] nftTokenIds; // For LSP8
        
        // State
        uint256 ticketsSold;
        uint256 prizePool;
        uint256 creatorContribution;
        uint256 startTime;
        uint256 endTime;
        bool isCompleted;
        bool isCancelled;
        
        // Winners
        address[] winners;
        uint256[] winnerAmounts;
        mapping(address => bool) hasClaimed;
        
        // Participants
        address[] participants;
        mapping(address => uint256) ticketCount;
        mapping(address => bool) hasParticipated;
        
        // Execution
        address executor;
        uint256 executedAt;
        
        // Monthly pool contribution (for eligible draws)
        uint256 monthlyPoolContribution;
    }

    struct MonthlyTickets {
        uint256 fromWeekly;      // Tickets from weekly participation
        uint256 fromCreating;    // Tickets from creating draws (max 5/month)
        uint256 fromParticipating; // Tickets from participating (max 15/month)
        uint256 lastResetTime;   // Last monthly reset timestamp
        mapping(uint256 => bool) participatedDraws; // Track which draws user participated
    }

    struct Layout {
        // Draw management
        uint256 nextDrawId;
        mapping(uint256 => Draw) draws;
        
        // User draw history
        mapping(address => uint256[]) userDrawHistory;
        
        // Monthly ticket tracking
        mapping(address => MonthlyTickets) userMonthlyTickets;
        address[] monthlyParticipants; // List of users with monthly tickets
        mapping(address => bool) isMonthlyParticipant; // Quick lookup
        
        // Platform draws
        uint256 currentWeeklyDrawId;
        uint256 currentMonthlyDrawId;
        uint256 lastWeeklyDrawTime;
        uint256 weeklyDrawCount; // Count to track when to create monthly
        uint256 monthlyPoolBalance; // Accumulated monthly pool
        
        // Global stats
        uint256 totalDrawsCreated;
        uint256 totalTicketsSold;
        uint256 totalPrizesDistributed;
        uint256 totalExecutions;
        
        // Platform fees
        uint256 platformFeesLYX;
        mapping(address => uint256) platformFeesToken;
        
        // User stats for leaderboard
        mapping(address => uint256) userTotalWins;
        mapping(address => uint256) userTotalWinnings;
        mapping(address => uint256) userTotalTickets;
        mapping(address => uint256) userTotalSpent;
        mapping(address => uint256) userDrawsCreated;
        mapping(address => uint256) userDrawsExecuted;
        mapping(address => uint256) userExecutionFees;
        
        // System state
        bool paused;
        uint256 defaultPlatformFee; // Default 500 = 5%
        uint256 executorFeePercent; // Default 500 = 5%
        uint256 monthlyPoolPercent; // Default 200 = 2%
        uint256 weeklyMonthlyPercent; // Default 2000 = 20%
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
}