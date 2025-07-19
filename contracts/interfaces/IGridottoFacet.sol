// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

interface IGridottoFacet {
    // Events
    event TicketPurchased(address indexed buyer, address indexed profile, uint256 amount, uint256 drawId);
    event DrawCompleted(uint256 indexed drawNumber, address indexed winner, uint256 amount);
    event MonthlyDrawCompleted(uint256 indexed drawNumber, address indexed winner, uint256 amount);
    event UserDrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorage.DrawType drawType);
    event UserDrawCompleted(uint256 indexed drawId, address[] winners, uint256 totalPrize);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event DrawCancelled(uint256 indexed drawId, string reason);

    // Official Draw Functions (Legacy)
    function buyTicket(address contextProfile, uint256 amount) external payable;
    function buyTicketsForSelected(address[] calldata selectedAddresses) external payable;
    function claimPrize() external;
    function getPendingPrize(address user) external view returns (uint256);
    
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
    
    // View Functions
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
    
    // Official Draw View Functions
    function getCurrentDrawInfo() external view returns (
        uint256 drawNumber,
        uint256 prizePool,
        uint256 ticketsSold,
        uint256 drawTime
    );
    
    function getMonthlyDrawInfo() external view returns (
        uint256 drawNumber,
        uint256 prizePool,
        uint256 ticketsSold,
        uint256 drawTime
    );
    
    // Admin Functions
    function setTicketPrice(uint256 newPrice) external;
    function setDrawIntervals(uint256 daily, uint256 monthly) external;
    function setFeePercentages(uint256 ownerFee, uint256 monthlyPoolFee) external;
    function setPaused(bool paused) external;
    function withdrawOwnerProfit() external;
}