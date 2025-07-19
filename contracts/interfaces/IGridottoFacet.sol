// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/LibGridottoStorage.sol";

interface IGridottoFacet {
    // Events
    event TicketPurchased(address indexed buyer, address indexed profileId, uint256 amount, uint256 drawType);
    event DrawExecuted(uint256 drawNumber, address winner, uint256 prize, uint256 drawType);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event MonthlyDrawExecuted(uint256 drawNumber, address winner, uint256 prize);
    event AdminWithdrawal(address indexed admin, uint256 amount);
    event EmergencyWithdrawal(address indexed admin, address indexed to, uint256 amount);
    event DrawCancelled(uint256 drawNumber, string reason);
    event UserDrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorage.DrawType drawType, LibGridottoStorage.PrizeModel prizeModel);
    event UserDrawTicketPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount, uint256 totalCost);
    event CreatorWithdrawal(address indexed creator, uint256 amount);
    event UserDrawCompleted(uint256 indexed drawId, address[] winners, uint256 totalPrize);
    event DrawExecutorRewarded(address indexed executor, uint256 reward, uint256 drawId);

    // User Draw Functions
    function createUserDraw(
        LibGridottoStorage.DrawType drawType,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    ) external payable returns (uint256 drawId);
    
    function createTokenDraw(
        address tokenAddress,
        uint256 tokenAmount,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPriceLYX,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement
    ) external returns (uint256 drawId);
    
    function createNFTDraw(
        address nftAddress,
        bytes32[] memory tokenIds,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement
    ) external returns (uint256 drawId);
    
    function buyUserDrawTicket(uint256 drawId, uint256 amount) external payable;
    function buyUserDrawTicketWithToken(uint256 drawId, uint256 amount) external;
    function executeUserDraw(uint256 drawId) external;
    function cancelUserDraw(uint256 drawId) external;
    
    // Phase 4: Advanced draw creation with multi-winner
    function createAdvancedDraw(
        LibGridottoStorage.DrawType drawType,
        address assetAddress, // token or NFT address
        uint256 assetAmount, // amount for tokens, 0 for NFTs
        bytes32[] memory nftIds, // empty for token draws
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        uint256 minFollowerCount,
        LibGridottoStorage.MultiWinnerConfig memory winnerConfig
    ) external payable returns (uint256 drawId);
    
    // User Draw View Functions
    function getUserDraw(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorage.DrawType drawType,
        uint256 ticketPrice,
        uint256 ticketsSold,
        uint256 maxTickets,
        uint256 currentPrizePool,
        uint256 endTime,
        bool isCompleted
    );
    
    function getUserTickets(uint256 drawId, address user) external view returns (uint256);
    function getDrawParticipants(uint256 drawId) external view returns (address[] memory);
    function calculateCurrentPrize(uint256 drawId) external view returns (uint256);
    function canParticipate(uint256 drawId, address user) external view returns (bool);
    
    // New UI Functions
    function getActiveDraws() external view returns (uint256[] memory);
    function getTotalActiveDraws() external view returns (uint256);
    function getDrawDetails(uint256 drawId) external view returns (
        address creator,
        LibGridottoStorage.DrawType drawType,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 ticketsSold,
        uint256 maxTickets,
        uint256 currentPrizePool,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    );
    function getUserCreatedDraws(address user) external view returns (uint256[] memory);
    function getUserParticipatedDraws(address user) external view returns (uint256[] memory);
    function getDrawWinners(uint256 drawId) external view returns (address[] memory);
    function canExecuteDraw(uint256 drawId) external view returns (bool);
    function getExecutorReward(uint256 drawId) external view returns (uint256);
    function getOfficialDrawExecutorReward() external view returns (uint256);
    function getMonthlyDrawExecutorReward() external view returns (uint256);
    
    // Official Draw Functions (Legacy)
    function buyTicket(address profile) external payable;
    function buyMultipleTickets(address profile, uint256 amount) external payable;
    function executeDraw() external;
    function executeMonthlyDraw() external;
    function claimPrize() external;
    
    // View Functions (Legacy)
    function getDrawInfo() external view returns (uint256 drawNumber, uint256 endTime, uint256 prize, uint256 ticketsSold);
    function getMonthlyDrawInfo() external view returns (uint256 drawNumber, uint256 endTime, uint256 prize, uint256 ticketsSold);
    function getUserTicketCount(address user, uint256 drawNumber) external view returns (uint256);
    function getWinner(uint256 drawNumber) external view returns (address);
    function getMonthlyWinner(uint256 drawNumber) external view returns (address);
    function getPendingPrize(address user) external view returns (uint256);
    
    // Admin Functions
    function withdrawOwnerProfit() external;
    function emergencyWithdraw(address to, uint256 amount) external;
    function pause() external;
    function unpause() external;
    function setTicketPrice(uint256 newPrice) external;
    function setDrawInterval(uint256 newInterval) external;
    function setMonthlyDrawInterval(uint256 newInterval) external;
    function setOwnerFeePercent(uint256 newPercent) external;
    function setMonthlyPoolPercent(uint256 newPercent) external;
}