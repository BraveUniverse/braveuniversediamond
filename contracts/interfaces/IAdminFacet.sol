// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

interface IAdminFacet {
    // Events
    event PlatformFeeUpdated(uint256 newFee);
    event ExecutorRewardUpdated(uint256 percent, uint256 maxReward);
    event DrawLimitsUpdated(uint256 maxTickets, uint256 minDuration);
    event AddressBlacklisted(address indexed user);
    event AddressWhitelisted(address indexed user);
    event UserBanned(address indexed user);
    event UserUnbanned(address indexed user);
    event FeatureToggled(string feature, bool enabled);
    event LSP26AddressSet(address indexed lsp26Address);
    event VIPDiscountsUpdated(uint8 tier, uint256 discount);
    event DrawCancelled(uint256 indexed drawId, string reason);
    event EmergencyWithdrawal(address indexed admin, address indexed token, uint256 amount);
    
    // Platform Management
    function setPlatformFeePercent(uint256 feePercent) external;
    function setMaxTicketsPerDraw(uint256 maxTickets) external;
    function setMinDrawDuration(uint256 minDuration) external;
    function setLSP26Address(address lsp26Address) external;
    function setExecutorRewardConfig(uint256 percent, uint256 maxReward) external;
    
    // Financial Management
    function getPlatformStats() external view returns (
        uint256 totalVolume,
        uint256 totalProfit,
        uint256 activeDraws,
        uint256 completedDraws,
        uint256 totalUsers
    );
    
    function getTokenStats(address token) external view returns (
        uint256 totalVolume,
        uint256 totalProfit,
        uint256 activeDraws
    );
    
    // Draw Management
    function cancelDrawAsAdmin(uint256 drawId, string calldata reason) external;
    function extendDrawDuration(uint256 drawId, uint256 additionalTime) external;
    function setMinParticipants(uint256 minParticipants) external;
    
    // Access Control
    function blacklistAddress(address user) external;
    function whitelistAddress(address user) external;
    function isBlacklisted(address user) external view returns (bool);
    function banUser(address user) external;
    function unbanUser(address user) external;
    function isBanned(address user) external view returns (bool);
    
    // User Management
    function setUserDrawLimit(address user, uint256 maxActiveDraws) external;
    function setGlobalDrawLimit(uint256 maxDrawsPerUser) external;
    function getUserActivity(address user) external view returns (
        uint256 totalDrawsCreated,
        uint256 totalParticipations,
        uint256 totalWins,
        uint256 totalSpent
    );
    
    // VIP Management
    function setVIPTierDiscounts(uint8 tier, uint256 discountPercent) external;
    function setVIPTierBonusTickets(uint8 tier, uint256 bonusPercent) external;
    
    // Feature Toggles
    function enableFeature(string calldata feature) external;
    function disableFeature(string calldata feature) external;
    function isFeatureEnabled(string calldata feature) external view returns (bool);
    
    // Emergency Functions
    function emergencyPauseAllDraws() external;
    function emergencyResumeAllDraws() external;
    function emergencyWithdrawToken(address token, uint256 amount) external;
}