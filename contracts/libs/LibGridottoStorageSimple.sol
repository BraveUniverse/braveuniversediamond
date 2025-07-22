// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library LibGridottoStorageSimple {
    bytes32 constant STORAGE_POSITION = keccak256("gridotto.storage.simple");

    enum DrawType {
        USER_LYX,
        USER_LSP7,
        USER_LSP8
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
    }

    struct Layout {
        // Draw management
        uint256 nextDrawId;
        mapping(uint256 => Draw) draws;
        
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
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
}