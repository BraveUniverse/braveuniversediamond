// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IAdminFacet.sol";
import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/ILSP7DigitalAsset.sol";

contract AdminFacet is IAdminFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    // Platform Management
    function setPlatformFeePercent(uint256 feePercent) external override onlyOwner {
        require(feePercent <= 20, "Fee too high"); // Max 20%
        LibGridottoStorage.layout().platformFeePercent = feePercent;
        emit PlatformFeeUpdated(feePercent);
    }
    
    function setMaxTicketsPerDraw(uint256 maxTickets) external override onlyOwner {
        require(maxTickets > 0, "Invalid max tickets");
        LibGridottoStorage.layout().maxTicketsPerDraw = maxTickets;
        emit DrawLimitsUpdated(maxTickets, LibGridottoStorage.layout().minDrawDuration);
    }
    
    function setMinDrawDuration(uint256 minDuration) external override onlyOwner {
        require(minDuration >= 300, "Min 5 minutes"); // At least 5 minutes
        LibGridottoStorage.layout().minDrawDuration = minDuration;
        emit DrawLimitsUpdated(LibGridottoStorage.layout().maxTicketsPerDraw, minDuration);
    }
    
    function setLSP26Address(address lsp26Address) external override onlyOwner {
        LibGridottoStorage.layout().lsp26Address = lsp26Address;
        emit LSP26AddressSet(lsp26Address);
    }
    
    function setExecutorRewardConfig(uint256 percent, uint256 maxReward) external override onlyOwner {
        require(percent <= 10, "Percent too high"); // Max 10%
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.executorRewardPercent = percent;
        l.maxExecutorReward = maxReward;
        emit ExecutorRewardUpdated(percent, maxReward);
    }
    
    // Financial Management
    function getPlatformStats() external view override returns (
        uint256 totalVolume,
        uint256 totalProfit,
        uint256 activeDraws,
        uint256 completedDraws,
        uint256 totalUsers
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        totalVolume = l.totalPlatformVolume;
        totalProfit = l.ownerProfit;
        activeDraws = l.activeUserDraws.length;
        completedDraws = l.totalCompletedDraws;
        // Count unique users (simplified - in production use a separate counter)
        totalUsers = l.pendingPrizes.length;
    }
    
    function getTokenStats(address token) external view override returns (
        uint256 totalVolume,
        uint256 totalProfit,
        uint256 activeDraws
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        totalVolume = l.tokenVolume[token];
        totalProfit = l.ownerTokenProfit[token];
        
        // Count active token draws
        for (uint256 i = 0; i < l.activeUserDraws.length; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[l.activeUserDraws[i]];
            if (draw.tokenAddress == token) {
                activeDraws++;
            }
        }
    }
    
    // Draw Management
    function cancelDrawAsAdmin(uint256 drawId, string calldata reason) external override onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Already completed");
        
        // Refund all participants
        uint256 ticketPrice = draw.ticketPrice;
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 refundAmount = draw.userTickets[participant] * ticketPrice;
            
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                (bool success, ) = participant.call{value: refundAmount}("");
                require(success, "Refund failed");
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                ILSP7DigitalAsset(draw.tokenAddress).transfer(
                    address(this),
                    participant,
                    refundAmount,
                    true,
                    ""
                );
            }
        }
        
        // Return creator's contribution
        if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX && draw.initialPrize > 0) {
            (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
            require(success, "Creator refund failed");
        }
        
        draw.isCompleted = true;
        emit DrawCancelled(drawId, reason);
    }
    
    function extendDrawDuration(uint256 drawId, uint256 additionalTime) external override onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Already completed");
        require(additionalTime > 0, "Invalid time");
        
        draw.endTime += additionalTime;
    }
    
    function setMinParticipants(uint256 minParticipants) external override onlyOwner {
        LibGridottoStorage.layout().minParticipants = minParticipants;
    }
    
    // Access Control
    function blacklistAddress(address user) external override onlyOwner {
        LibGridottoStorage.layout().blacklisted[user] = true;
        emit AddressBlacklisted(user);
    }
    
    function whitelistAddress(address user) external override onlyOwner {
        LibGridottoStorage.layout().blacklisted[user] = false;
        emit AddressWhitelisted(user);
    }
    
    function isBlacklisted(address user) external view override returns (bool) {
        return LibGridottoStorage.layout().blacklisted[user];
    }
    
    function banUser(address user) external override onlyOwner {
        LibGridottoStorage.layout().banned[user] = true;
        emit UserBanned(user);
    }
    
    function unbanUser(address user) external override onlyOwner {
        LibGridottoStorage.layout().banned[user] = false;
        emit UserUnbanned(user);
    }
    
    function isBanned(address user) external view override returns (bool) {
        return LibGridottoStorage.layout().banned[user];
    }
    
    // User Management
    function setUserDrawLimit(address user, uint256 maxActiveDraws) external override onlyOwner {
        LibGridottoStorage.layout().userDrawLimit[user] = maxActiveDraws;
    }
    
    function setGlobalDrawLimit(uint256 maxDrawsPerUser) external override onlyOwner {
        LibGridottoStorage.layout().globalDrawLimit = maxDrawsPerUser;
    }
    
    function getUserActivity(address user) external view override returns (
        uint256 totalDrawsCreated,
        uint256 totalParticipations,
        uint256 totalWins,
        uint256 totalSpent
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserStats memory stats = l.userStats[user];
        
        totalDrawsCreated = stats.totalDrawsCreated;
        totalParticipations = stats.totalParticipations;
        totalWins = stats.totalWins;
        totalSpent = stats.totalSpent;
    }
    
    // VIP Management
    function setVIPTierDiscounts(uint8 tier, uint256 discountPercent) external override onlyOwner {
        require(discountPercent <= 50, "Discount too high"); // Max 50% discount
        LibGridottoStorage.layout().vipTierFeeDiscount[tier] = discountPercent;
        emit VIPDiscountsUpdated(tier, discountPercent);
    }
    
    function setVIPTierBonusTickets(uint8 tier, uint256 bonusPercent) external override onlyOwner {
        require(bonusPercent <= 200, "Bonus too high"); // Max 200% bonus (3x tickets)
        LibGridottoStorage.layout().vipBonusTickets[tier] = bonusPercent;
    }
    
    // Feature Toggles
    function enableFeature(string calldata feature) external override onlyOwner {
        LibGridottoStorage.layout().features[feature] = true;
        emit FeatureToggled(feature, true);
    }
    
    function disableFeature(string calldata feature) external override onlyOwner {
        LibGridottoStorage.layout().features[feature] = false;
        emit FeatureToggled(feature, false);
    }
    
    function isFeatureEnabled(string calldata feature) external view override returns (bool) {
        return LibGridottoStorage.layout().features[feature];
    }
    
    // Emergency Functions
    function emergencyPauseAllDraws() external override onlyOwner {
        LibGridottoStorage.layout().paused = true;
    }
    
    function emergencyResumeAllDraws() external override onlyOwner {
        LibGridottoStorage.layout().paused = false;
    }
    
    function emergencyWithdrawToken(address token, uint256 amount) external override onlyOwner {
        require(token != address(0), "Invalid token");
        ILSP7DigitalAsset(token).transfer(address(this), msg.sender, amount, true, "");
        emit EmergencyWithdrawal(msg.sender, token, amount);
    }
}