// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IGridottoFacet.sol";
import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IOracleFacet.sol";

interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ILSP8 {
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) external;
    function tokenOwnerOf(bytes32 tokenId) external view returns (address);
}

interface IVIPPass {
    function getHighestTierOwned(address owner) external view returns (uint8);
}

contract GridottoFacet is IGridottoFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Constants
    uint256 constant MIN_TIME_BUFFER = 2 seconds;
    uint256 constant DRAW_LOCK_PERIOD = 10 minutes;
    uint256 constant MAX_BULK_BUY_ADDRESSES = 50;
    
    // VIP Tiers
    uint8 constant NO_TIER = 0;
    uint8 constant SILVER_TIER = 1;
    uint8 constant GOLD_TIER = 2;
    uint8 constant DIAMOND_TIER = 3;
    uint8 constant UNIVERSE_TIER = 4;
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        require(l.lastActionTimestamp[msg.sender] != block.timestamp, "Reentrant call");
        l.lastActionTimestamp[msg.sender] = block.timestamp;
        _;
    }
    
    // Initialize function (called once when adding to diamond)
    function initializeGridotto() external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Set default values if not already set
        if (l.ticketPrice == 0) {
            l.ticketPrice = 0.1 ether;
        }
        if (l.drawInterval == 0) {
            l.drawInterval = 7 days;
            l.monthlyDrawInterval = 30 days;
        }
        if (l.ownerFeePercent == 0) {
            l.ownerFeePercent = 5;
            l.monthlyPoolPercent = 20;
        }
        
        // Initialize draw times
        if (l.drawTime == 0) {
            l.drawTime = block.timestamp + l.drawInterval;
            l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
        }
        
        // Set oracle from OracleFacet
        IOracleFacet oracle = IOracleFacet(address(this));
        (address oracleAddr,,,,) = oracle.getOracleData();
        l.oracleAddress = oracleAddr;
        
        // Set VIP Pass address
        l.vipPassAddress = 0x5DD5fF2562ce2De02955eebB967C6094de438428;
        
        // Set VIP discounts
        l.vipTierFeeDiscount[SILVER_TIER] = 20;   // %20 discount
        l.vipTierFeeDiscount[GOLD_TIER] = 40;     // %40 discount
        l.vipTierFeeDiscount[DIAMOND_TIER] = 60;  // %60 discount
        l.vipTierFeeDiscount[UNIVERSE_TIER] = 80; // %80 discount
        
        // Start draw numbers from 1
        if (l.currentDraw == 0) {
            l.currentDraw = 1;
            l.currentMonthlyDraw = 1;
        }
    }
    
    // Official Draw Functions
    function buyTicket(address contextProfile, uint256 amount) 
        external 
        payable 
        notPaused 
        nonReentrant 
        override 
    {
        require(contextProfile != address(0), "Invalid profile address");
        require(amount > 0, "Amount must be greater than 0");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256 totalPrice = amount * l.ticketPrice;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate fees
        uint256 ownerFee = (totalPrice * l.ownerFeePercent) / 100;
        uint256 monthlyFee = (totalPrice * l.monthlyPoolPercent) / 100;
        uint256 drawFee = totalPrice - ownerFee - monthlyFee;
        
        // Update pools
        l.ownerProfit += ownerFee;
        l.monthlyPrizePool += monthlyFee;
        l.currentDrawPrizePool += drawFee;
        
        // Process ticket purchase
        _processOfficialTicketPurchase(msg.sender, contextProfile, amount);
        
        // Check for VIP bonus
        // Temporarily disabled for testing
        // uint8 userTier = IVIPPass(l.vipPassAddress).getHighestTierOwned(msg.sender);
        // if (userTier > 0) {
        //     uint256 bonusTickets = _calculateBonusTickets(amount, userTier);
        //     if (bonusTickets > 0) {
        //         _processOfficialTicketPurchase(msg.sender, msg.sender, bonusTickets);
        //     }
        // }
        
        // Refund excess
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
        }
        
        emit TicketPurchased(msg.sender, contextProfile, amount, 0);
        
        // Check if draw should happen
        // _checkAndExecuteDraws(); // Commented out for testing
    }
    
    function buyTicketsForSelected(address[] calldata selectedAddresses) 
        external 
        payable 
        notPaused 
        nonReentrant 
        override 
    {
        require(selectedAddresses.length > 0 && selectedAddresses.length <= MAX_BULK_BUY_ADDRESSES, 
                "Invalid address count");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Count valid recipients
        uint256 validCount = 0;
        for (uint256 i = 0; i < selectedAddresses.length; i++) {
            if (selectedAddresses[i] != address(0) && selectedAddresses[i] != msg.sender) {
                validCount++;
            }
        }
        require(validCount > 0, "No valid recipients");
        
        uint256 totalPrice = validCount * l.ticketPrice;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate fees
        uint256 ownerFee = (totalPrice * l.ownerFeePercent) / 100;
        uint256 monthlyFee = (totalPrice * l.monthlyPoolPercent) / 100;
        uint256 drawFee = totalPrice - ownerFee - monthlyFee;
        
        // Update pools
        l.ownerProfit += ownerFee;
        l.monthlyPrizePool += monthlyFee;
        l.currentDrawPrizePool += drawFee;
        
        // Process tickets
        for (uint256 i = 0; i < selectedAddresses.length; i++) {
            if (selectedAddresses[i] != address(0) && selectedAddresses[i] != msg.sender) {
                _processOfficialTicketPurchase(msg.sender, selectedAddresses[i], 1);
            }
        }
        
        // Refund excess
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
        }
        
        // _checkAndExecuteDraws(); // Commented out for testing
    }
    
    function claimPrize() external nonReentrant override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256 prize = l.pendingPrizes[msg.sender];
        require(prize > 0, "No prize available");
        
        l.pendingPrizes[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: prize}("");
        require(success, "Transfer failed");
        
        emit PrizeClaimed(msg.sender, prize);
    }
    
    function getPendingPrize(address user) external view override returns (uint256) {
        return LibGridottoStorage.layout().pendingPrizes[user];
    }
    
    // Internal functions
    function _processOfficialTicketPurchase(address buyer, address profile, uint256 amount) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Add tickets for current draw
        for (uint256 i = 0; i < amount; i++) {
            l.drawTickets[l.currentDraw].push(profile);
            l.monthlyDrawTickets[l.currentMonthlyDraw].push(profile);
        }
    }
    
    function _calculateBonusTickets(uint256 baseAmount, uint8 tier) internal pure returns (uint256) {
        if (tier == SILVER_TIER) return baseAmount >= 5 ? 1 : 0;
        if (tier == GOLD_TIER) return baseAmount >= 3 ? baseAmount / 3 : 0;
        if (tier == DIAMOND_TIER) return baseAmount >= 2 ? baseAmount / 2 : 0;
        if (tier == UNIVERSE_TIER) return baseAmount; // Double tickets
        return 0;
    }
    
    function _checkAndExecuteDraws() internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (block.timestamp >= l.drawTime) {
            _executeOfficialDraw();
        }
        
        if (block.timestamp >= l.monthlyDrawTime) {
            _executeMonthlyDraw();
        }
    }
    
    function _executeOfficialDraw() internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256 drawNumber = l.currentDraw;
        address winner = address(0);
        uint256 prizeAmount = 0;
        
        if (l.drawTickets[drawNumber].length > 0) {
            // Get random number from OracleFacet
            IOracleFacet oracle = IOracleFacet(address(this));
            uint256 randomValue = oracle.getRandomNumber();
            
            // Select winner
            uint256 winnerIndex = randomValue % l.drawTickets[drawNumber].length;
            winner = l.drawTickets[drawNumber][winnerIndex];
            
            // Calculate prize (90% of pool, 10% carries over)
            prizeAmount = (l.currentDrawPrizePool * 90) / 100;
            uint256 carryOver = l.currentDrawPrizePool - prizeAmount;
            
            // Update winner data
            l.winners[drawNumber] = winner;
            l.drawPrizes[drawNumber] = prizeAmount;
            l.pendingPrizes[winner] += prizeAmount;
            
            // Reset pool with carryover
            l.currentDrawPrizePool = carryOver;
            
            emit DrawCompleted(drawNumber, winner, prizeAmount);
        } else {
            emit DrawCompleted(drawNumber, address(0), 0);
        }
        
        // Increment draw number and reset timer
        l.currentDraw++;
        l.drawTime = block.timestamp + l.drawInterval;
    }
    
    function _executeMonthlyDraw() internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        uint256 drawNumber = l.currentMonthlyDraw;
        address winner = address(0);
        uint256 prizeAmount = 0;
        
        if (l.monthlyDrawTickets[drawNumber].length > 0) {
            // Get random number from OracleFacet
            IOracleFacet oracle = IOracleFacet(address(this));
            uint256 randomValue = oracle.getRandomNumber();
            
            // Select winner
            uint256 winnerIndex = randomValue % l.monthlyDrawTickets[drawNumber].length;
            winner = l.monthlyDrawTickets[drawNumber][winnerIndex];
            
            // Calculate prize (90% of pool, 10% carries over)
            prizeAmount = (l.monthlyPrizePool * 90) / 100;
            uint256 carryOver = l.monthlyPrizePool - prizeAmount;
            
            // Update winner data
            l.monthlyWinners[drawNumber] = winner;
            l.monthlyDrawPrizes[drawNumber] = prizeAmount;
            l.pendingPrizes[winner] += prizeAmount;
            
            // Reset pool with carryover
            l.monthlyPrizePool = carryOver;
            
            emit MonthlyDrawCompleted(drawNumber, winner, prizeAmount);
        } else {
            emit MonthlyDrawCompleted(drawNumber, address(0), 0);
        }
        
        // Increment draw number and reset timer
        l.currentMonthlyDraw++;
        l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
    }
    
    // View functions
    function getCurrentDrawInfo() external view override returns (
        uint256 drawNumber,
        uint256 prizePool,
        uint256 ticketsSold,
        uint256 drawTime
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawNumber = l.currentDraw;
        prizePool = l.currentDrawPrizePool;
        ticketsSold = l.drawTickets[drawNumber].length;
        drawTime = l.drawTime;
    }
    
    function getMonthlyDrawInfo() external view override returns (
        uint256 drawNumber,
        uint256 prizePool,
        uint256 ticketsSold,
        uint256 drawTime
    ) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawNumber = l.currentMonthlyDraw;
        prizePool = l.monthlyPrizePool;
        ticketsSold = l.monthlyDrawTickets[drawNumber].length;
        drawTime = l.monthlyDrawTime;
    }
    
    // Admin functions
    function setTicketPrice(uint256 newPrice) external onlyOwner override {
        require(newPrice > 0, "Price must be greater than 0");
        LibGridottoStorage.layout().ticketPrice = newPrice;
    }
    
    function setDrawIntervals(uint256 daily, uint256 monthly) external onlyOwner override {
        require(daily > MIN_TIME_BUFFER && monthly > MIN_TIME_BUFFER, "Intervals too short");
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.drawInterval = daily;
        l.monthlyDrawInterval = monthly;
    }
    
    function setFeePercentages(uint256 ownerFee, uint256 monthlyPoolFee) external onlyOwner override {
        require(ownerFee + monthlyPoolFee <= 30, "Total fees too high");
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.ownerFeePercent = ownerFee;
        l.monthlyPoolPercent = monthlyPoolFee;
    }
    
    function setPaused(bool paused) external onlyOwner override {
        LibGridottoStorage.layout().paused = paused;
    }
    
    function withdrawOwnerProfit() external onlyOwner nonReentrant override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 profit = l.ownerProfit;
        require(profit > 0, "No profit to withdraw");
        
        l.ownerProfit = 0;
        
        (bool success, ) = payable(msg.sender).call{value: profit}("");
        require(success, "Transfer failed");
    }
    
    // User draw functions - to be implemented
    function createUserDraw(
        LibGridottoStorage.DrawType drawType,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    ) external payable override returns (uint256 drawId) {
        // Implementation in next update
        revert("User draws not yet implemented");
    }
    
    function createTokenDraw(
        address tokenAddress,
        uint256 tokenAmount,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPriceLYX,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement
    ) external override returns (uint256 drawId) {
        revert("Token draws not yet implemented");
    }
    
    function createNFTDraw(
        address nftAddress,
        bytes32[] memory tokenIds,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement
    ) external override returns (uint256 drawId) {
        revert("NFT draws not yet implemented");
    }
    
    function buyUserDrawTicket(uint256 drawId, uint256 amount) external payable override {
        revert("User draws not yet implemented");
    }
    
    function buyUserDrawTicketWithToken(uint256 drawId, uint256 amount) external override {
        revert("User draws not yet implemented");
    }
    
    function executeUserDraw(uint256 drawId) external override {
        revert("User draws not yet implemented");
    }
    
    function cancelUserDraw(uint256 drawId) external override {
        revert("User draws not yet implemented");
    }
    
    function getUserDraw(uint256 drawId) external view override returns (
        address creator,
        LibGridottoStorage.DrawType drawType,
        uint256 ticketPrice,
        uint256 ticketsSold,
        uint256 maxTickets,
        uint256 currentPrizePool,
        uint256 endTime,
        bool isCompleted
    ) {
        revert("User draws not yet implemented");
    }
    
    function getUserTickets(uint256 drawId, address user) external view override returns (uint256) {
        revert("User draws not yet implemented");
    }
    
    function getDrawParticipants(uint256 drawId) external view override returns (address[] memory) {
        revert("User draws not yet implemented");
    }
    
    function calculateCurrentPrize(uint256 drawId) external view override returns (uint256) {
        revert("User draws not yet implemented");
    }
    
    function canParticipate(uint256 drawId, address user) external view override returns (bool) {
        revert("User draws not yet implemented");
    }
}