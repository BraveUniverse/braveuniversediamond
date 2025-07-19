// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library LibAdminStorage {
    bytes32 constant GRIDOTTO_ADMIN_STORAGE_POSITION = keccak256("braveUniverse.storage.gridotto.admin");

    struct UserStats {
        uint256 totalDrawsCreated;
        uint256 totalParticipations;
        uint256 totalWins;
        uint256 totalSpent;
        uint256 totalWon;
        uint256 lastActivity;
    }

    struct AdminLayout {
        // Platform configurations
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
        uint256 totalUsers;
        mapping(address => uint256) tokenVolume; // token => volume
        mapping(address => UserStats) userStats;
        
        // Feature toggles
        mapping(string => bool) features;
        
        // VIP configurations
        mapping(uint8 => uint256) vipBonusTickets; // tier => bonus percent
        
        // Emergency states
        bool emergencyPause;
        uint256 lastEmergencyAction;
    }

    function adminLayout() internal pure returns (AdminLayout storage l) {
        bytes32 position = GRIDOTTO_ADMIN_STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
    
    // Helper functions for common checks
    function isBlacklisted(address user) internal view returns (bool) {
        return adminLayout().blacklisted[user];
    }
    
    function isBanned(address user) internal view returns (bool) {
        return adminLayout().banned[user];
    }
    
    function getPlatformFee() internal view returns (uint256) {
        uint256 fee = adminLayout().platformFeePercent;
        return fee == 0 ? 5 : fee; // Default 5% if not set
    }
    
    function getExecutorRewardConfig() internal view returns (uint256 percent, uint256 maxReward) {
        AdminLayout storage l = adminLayout();
        percent = l.executorRewardPercent == 0 ? 5 : l.executorRewardPercent; // Default 5%
        maxReward = l.maxExecutorReward == 0 ? 5 ether : l.maxExecutorReward; // Default 5 LYX
    }
    
    function getMaxTicketsPerDraw() internal view returns (uint256) {
        uint256 max = adminLayout().maxTicketsPerDraw;
        return max == 0 ? 100000 : max; // Default 100k
    }
    
    function getMinDrawDuration() internal view returns (uint256) {
        uint256 min = adminLayout().minDrawDuration;
        return min == 0 ? 3600 : min; // Default 1 hour
    }
    
    function updateUserStats(
        address user,
        bool isCreation,
        bool isParticipation,
        bool isWin,
        uint256 spent,
        uint256 won
    ) internal {
        UserStats storage stats = adminLayout().userStats[user];
        
        if (isCreation) stats.totalDrawsCreated++;
        if (isParticipation) stats.totalParticipations++;
        if (isWin) stats.totalWins++;
        
        stats.totalSpent += spent;
        stats.totalWon += won;
        stats.lastActivity = block.timestamp;
    }
    
    function incrementTotalUsers() internal {
        adminLayout().totalUsers++;
    }
    
    function addPlatformVolume(uint256 amount) internal {
        adminLayout().totalPlatformVolume += amount;
    }
    
    function addTokenVolume(address token, uint256 amount) internal {
        adminLayout().tokenVolume[token] += amount;
    }
    
    function incrementCompletedDraws() internal {
        adminLayout().totalCompletedDraws++;
    }
}