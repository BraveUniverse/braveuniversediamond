// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IGridottoFacet.sol";
import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IOracleFacet.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";
import "../interfaces/ILSP26FollowerSystem.sol";

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
    using LibAdminStorage for LibAdminStorage.AdminLayout;
    
    // Constants
    uint256 constant MIN_TIME_BUFFER = 2 seconds;
    uint256 constant DRAW_LOCK_PERIOD = 10 minutes;
    uint256 constant MAX_BULK_BUY_ADDRESSES = 50;
    uint256 constant MAX_TICKETS_PER_DRAW = 100000;
    
    // Modifiers
    modifier notBanned() {
        require(!LibAdminStorage.isBanned(msg.sender), "User is banned");
        _;
    }
    
    modifier notBlacklisted() {
        require(!LibAdminStorage.isBlacklisted(msg.sender), "User is blacklisted");
        _;
    }
    
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
            l.drawInterval = 7 days; // Weekly draw
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
        
        // Set VIP Pass address based on network
        // Mainnet (chainid 42): 0x5DD5fF2562ce2De02955eebB967C6094de438428
        // Testnet (chainid 4201): 0x65EDE8652bEA3e139cAc3683F87230036A30404a
        // Hardhat (chainid 31337): Use mainnet address for testing
        if (block.chainid == 4201) {
            l.vipPassAddress = 0x65EDE8652bEA3e139cAc3683F87230036A30404a; // Testnet
        } else {
            l.vipPassAddress = 0x5DD5fF2562ce2De02955eebB967C6094de438428; // Mainnet & Hardhat
        }
        
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
    function buyTicket(address profile) external payable notPaused nonReentrant notBanned notBlacklisted override {
        _processOfficialTicketPurchase(msg.sender, profile, 1);
    }
    
    function buyMultipleTickets(address profile, uint256 amount) external payable notPaused nonReentrant override {
        require(amount > 0, "Amount must be greater than 0");
        _processOfficialTicketPurchase(msg.sender, profile, amount);
    }
    
    function buyTicketInternal(address contextProfile, uint256 amount) 
        internal 
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
        try IVIPPass(l.vipPassAddress).getHighestTierOwned(msg.sender) returns (uint8 userTier) {
            if (userTier > 0) {
                uint256 bonusTickets = _calculateBonusTickets(amount, userTier);
                if (bonusTickets > 0) {
                    _processOfficialTicketPurchase(msg.sender, msg.sender, bonusTickets);
                }
            }
        } catch {
            // VIP Pass not available or call failed, continue without bonus
        }
        
        // Refund excess
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
        }
        
        emit TicketPurchased(msg.sender, contextProfile, amount, 0);
        
        // Check if draw should happen
        _checkAndExecuteDraws();
    }
    
    function buyTicketsForSelected(address[] calldata selectedAddresses) 
        external 
        payable 
        notPaused 
        nonReentrant 
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
        
        _checkAndExecuteDraws();
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
    
    // Internal helper functions
    function _checkParticipationRequirements(
        LibGridottoStorage.UserDraw storage draw,
        address participant
    ) internal view {
        if (draw.requirement == LibGridottoStorage.ParticipationRequirement.LSP7_HOLDER) {
            require(draw.requiredToken != address(0), "Required token not set");
            uint256 balance = ILSP7(draw.requiredToken).balanceOf(participant);
            require(balance >= draw.minTokenAmount, "Insufficient token balance");
        } else if (draw.requirement == LibGridottoStorage.ParticipationRequirement.LSP8_HOLDER) {
            require(draw.requiredToken != address(0), "Required NFT not set");
            // For LSP8, we need to check if user owns any of the specified token IDs
            // This is a simplified check - in production, we'd need to iterate through user's tokens
            // For now, we'll assume the requirement is met if draw.prizeTokenIds is set
            require(draw.prizeTokenIds.length > 0 || draw.minTokenAmount > 0, "NFT requirement not properly configured");
        } else if (draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_ONLY ||
                   draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_AND_LSP7 ||
                   draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_AND_LSP8) {
            // Check follower requirement if set
            if (draw.minFollowerCount > 0) {
                // Note: LSP26 is only on mainnet, so we check if contract exists
                address lsp26Address = LibGridottoStorage.layout().lsp26Address;
                if (lsp26Address != address(0)) {
                    ILSP26FollowerSystem followerSystem = ILSP26FollowerSystem(lsp26Address);
                    require(
                        followerSystem.isFollowing(participant, draw.creator),
                        "Must follow creator"
                    );
                    require(
                        followerSystem.followerCount(participant) >= draw.minFollowerCount,
                        "Insufficient followers"
                    );
                }
            }
            
            // Check additional requirements
            if (draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_AND_LSP7) {
                require(draw.requiredToken != address(0), "Required token not set");
                uint256 balance = ILSP7(draw.requiredToken).balanceOf(participant);
                require(balance >= draw.minTokenAmount, "Insufficient token balance");
            } else if (draw.requirement == LibGridottoStorage.ParticipationRequirement.FOLLOWERS_AND_LSP8) {
                require(draw.requiredToken != address(0), "Required NFT not set");
                // Simplified LSP8 check
                require(draw.prizeTokenIds.length > 0 || draw.minTokenAmount > 0, "NFT requirement not properly configured");
            }
        }
    }
    
    function _calculateVIPDiscount(address user, uint256 platformFee) internal view returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        try IVIPPass(l.vipPassAddress).getHighestTierOwned(user) returns (uint8 tier) {
            if (tier == 0) return 0;
            
            // Apply VIP discount on platform fee
            uint256 discountPercent = l.vipTierFeeDiscount[tier];
            return (platformFee * discountPercent) / 100;
        } catch {
            return 0;
        }
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
    
    function _selectWinner(
        LibGridottoStorage.UserDraw storage draw,
        uint256 randomValue
    ) internal view returns (address) {
        // Build weighted array based on tickets
        uint256 totalTickets = draw.ticketsSold;
        uint256 counter = 0;
        uint256 winningTicket = randomValue % totalTickets;
        
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.userTickets[participant];
            
            if (winningTicket >= counter && winningTicket < counter + userTickets) {
                return participant;
            }
            counter += userTickets;
        }
        
        // Fallback (should never reach here)
        return draw.participants[0];
    }
    
    function _selectMultipleWinners(LibGridottoStorage.UserDraw storage draw, uint256 randomValue) internal {
        uint256 participantCount = draw.participants.length;
        require(participantCount >= draw.winnerConfig.totalWinners, "Not enough participants");
        
        // Create array to track selected indices
        bool[] memory selected = new bool[](participantCount);
        uint256 winnersSelected = 0;
        uint256 currentSeed = randomValue;
        
        // Select winners for each tier
        for (uint256 tierIndex = 0; tierIndex < draw.winnerConfig.tiers.length; tierIndex++) {
            LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[tierIndex];
            
            for (uint256 i = 0; i < tier.winnersCount; i++) {
                // Generate new random index
                uint256 attempts = 0;
                uint256 winnerIndex;
                
                do {
                    currentSeed = uint256(keccak256(abi.encodePacked(currentSeed, tierIndex, i, attempts)));
                    winnerIndex = currentSeed % participantCount;
                    attempts++;
                    
                    // Safety check to prevent infinite loop
                    require(attempts < participantCount * 2, "Failed to select unique winners");
                } while (selected[winnerIndex]);
                
                selected[winnerIndex] = true;
                draw.winners.push(draw.participants[winnerIndex]);
                winnersSelected++;
            }
        }
        
        require(winnersSelected == draw.winnerConfig.totalWinners, "Winner selection mismatch");
    }
    
    function _calculateBonusTickets(uint256 baseAmount, uint8 tier) internal pure returns (uint256) {
        if (tier == SILVER_TIER) return baseAmount >= 5 ? 1 : 0;
        if (tier == GOLD_TIER) return baseAmount >= 3 ? baseAmount / 3 : 0;
        if (tier == DIAMOND_TIER) return baseAmount >= 2 ? baseAmount / 2 : 0;
        if (tier == UNIVERSE_TIER) return baseAmount; // Double tickets
        return 0;
    }
    
    function _distributeLYXPrizesToMultipleWinners(
        LibGridottoStorage.UserDraw storage draw,
        uint256 executorReward
    ) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 totalPrize = draw.currentPrizePool - executorReward;
        uint256 winnerIndex = 0;
        
        for (uint256 tierIndex = 0; tierIndex < draw.winnerConfig.tiers.length; tierIndex++) {
            LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[tierIndex];
            uint256 tierPrize = (totalPrize * tier.prizePercent) / 100;
            uint256 prizePerWinner = tierPrize / tier.winnersCount;
            
            for (uint256 i = 0; i < tier.winnersCount; i++) {
                if (winnerIndex < draw.winners.length) {
                    l.pendingPrizes[draw.winners[winnerIndex]] += prizePerWinner;
                    winnerIndex++;
                }
            }
        }
    }
    
    function _distributeTokenPrizesToMultipleWinners(
        LibGridottoStorage.UserDraw storage draw,
        uint256 executorReward
    ) internal {
        ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
        uint256 totalPrize = draw.currentPrizePool - executorReward;
        uint256 winnerIndex = 0;
        
        for (uint256 tierIndex = 0; tierIndex < draw.winnerConfig.tiers.length; tierIndex++) {
            LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[tierIndex];
            uint256 tierPrize = (totalPrize * tier.prizePercent) / 100;
            uint256 prizePerWinner = tierPrize / tier.winnersCount;
            
            for (uint256 i = 0; i < tier.winnersCount; i++) {
                if (winnerIndex < draw.winners.length) {
                    token.transfer(address(this), draw.winners[winnerIndex], prizePerWinner, true, "");
                    winnerIndex++;
                }
            }
        }
    }
    
    function _distributeNFTPrizesToMultipleWinners(
        LibGridottoStorage.UserDraw storage draw
    ) internal {
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
        uint256 nftIndex = 0;
        uint256 winnerIndex = 0;
        
        for (uint256 tierIndex = 0; tierIndex < draw.winnerConfig.tiers.length; tierIndex++) {
            LibGridottoStorage.PrizeTier memory tier = draw.winnerConfig.tiers[tierIndex];
            
            // If specific NFTs are assigned to this tier
            if (tier.specificNFTIds.length > 0) {
                for (uint256 i = 0; i < tier.specificNFTIds.length && winnerIndex < draw.winners.length; i++) {
                    nft.transfer(address(this), draw.winners[winnerIndex], tier.specificNFTIds[i], true, "");
                    winnerIndex++;
                }
            } else {
                // Distribute NFTs in order
                for (uint256 i = 0; i < tier.winnersCount && nftIndex < draw.nftTokenIds.length && winnerIndex < draw.winners.length; i++) {
                    nft.transfer(address(this), draw.winners[winnerIndex], draw.nftTokenIds[nftIndex], true, "");
                    nftIndex++;
                    winnerIndex++;
                }
            }
        }
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
            uint256 randomValue;
            try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
                randomValue = value;
            } catch {
                // Fallback to simple pseudo-random if oracle fails
                randomValue = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    drawNumber,
                    l.drawTickets[drawNumber].length
                )));
            }
            
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
            
            // Track winner for leaderboard
            LibGridottoStorage.trackWinner(
                winner,
                drawNumber,
                LibGridottoStorage.DrawType.OFFICIAL_DAILY,
                prizeAmount,
                address(0), // LYX
                bytes32(0),
                address(0) // No creator for official draws
            );
            
            // Reset pool with carryover
            l.currentDrawPrizePool = carryOver;
            
            emit DrawExecuted(drawNumber, winner, prizeAmount, 0);
        } else {
            emit DrawExecuted(drawNumber, address(0), 0, 0);
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
            uint256 randomValue;
            try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
                randomValue = value;
            } catch {
                // Fallback to simple pseudo-random if oracle fails
                randomValue = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    drawNumber,
                    l.monthlyDrawTickets[drawNumber].length,
                    "monthly"
                )));
            }
            
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
            
            // Track winner for leaderboard
            LibGridottoStorage.trackWinner(
                winner,
                drawNumber,
                LibGridottoStorage.DrawType.OFFICIAL_MONTHLY,
                prizeAmount,
                address(0), // LYX
                bytes32(0),
                address(0) // No creator for official draws
            );
            
            // Reset pool with carryover
            l.monthlyPrizePool = carryOver;
            
            emit MonthlyDrawExecuted(drawNumber, winner, prizeAmount);
        } else {
            emit MonthlyDrawExecuted(drawNumber, address(0), 0);
        }
        
        // Increment draw number and reset timer
        l.currentMonthlyDraw++;
        l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
    }
    
    // Official Draw Execution Functions
    function executeDraw() external notPaused override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        require(block.timestamp >= l.drawTime, "Draw time not reached");
        
        uint256 drawNumber = l.currentDraw;
        address[] storage tickets = l.drawTickets[drawNumber];
        
        if (tickets.length > 0) {
            // Get random number
            uint256 randomValue;
            try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
                randomValue = value;
            } catch {
                // Fallback to pseudo-random
                randomValue = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    drawNumber,
                    tickets.length
                )));
            }
            
            uint256 winnerIndex = randomValue % tickets.length;
            address winner = tickets[winnerIndex];
            
            l.winners[drawNumber] = winner;
            
            // Calculate prize and executor reward
            uint256 prizeAmount = l.drawPrizes[drawNumber];
            (uint256 executorPercent, uint256 maxReward) = LibAdminStorage.getExecutorRewardConfig();
            uint256 executorReward = (prizeAmount * executorPercent) / 100;
            if (executorReward > maxReward) executorReward = maxReward;
            prizeAmount -= executorReward;
            
            // Add to pending prizes
            l.pendingPrizes[winner] += prizeAmount;
            
            // Reward executor
            if (executorReward > 0) {
                (bool success, ) = msg.sender.call{value: executorReward}("");
                require(success, "Executor reward failed");
                emit DrawExecutorRewarded(msg.sender, executorReward, drawNumber);
            }
            
            // Keep 10% for next draw
            uint256 carryOver = l.drawPrizes[drawNumber] / 10;
            l.currentDrawPrizePool = carryOver;
            
            emit DrawExecuted(drawNumber, winner, prizeAmount, 0);
        } else {
            emit DrawExecuted(drawNumber, address(0), 0, 0);
        }
        
        // Increment draw number and reset timer
        l.currentDraw++;
        l.drawTime = block.timestamp + l.drawInterval;
    }
    
    function executeMonthlyDraw() external notPaused override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        require(block.timestamp >= l.monthlyDrawTime, "Monthly draw time not reached");
        
        uint256 drawNumber = l.currentMonthlyDraw;
        address[] storage tickets = l.monthlyDrawTickets[drawNumber];
        
        if (tickets.length > 0) {
            // Get random number
            uint256 randomValue;
            try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
                randomValue = value;
            } catch {
                // Fallback to pseudo-random
                randomValue = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    drawNumber + 1000000, // Different seed than daily
                    tickets.length
                )));
            }
            
            uint256 winnerIndex = randomValue % tickets.length;
            address winner = tickets[winnerIndex];
            
            l.monthlyWinners[drawNumber] = winner;
            
            // Calculate prize and executor reward
            uint256 prizeAmount = l.monthlyDrawPrizes[drawNumber];
            uint256 fivePercent = (prizeAmount * 5) / 100;
            uint256 maxReward = 5 ether; // 5 LYX max
            uint256 executorReward = fivePercent > maxReward ? maxReward : fivePercent;
            prizeAmount -= executorReward;
            
            // Add to pending prizes
            l.pendingPrizes[winner] += prizeAmount;
            
            // Reward executor
            if (executorReward > 0) {
                (bool success, ) = msg.sender.call{value: executorReward}("");
                require(success, "Executor reward failed");
                emit DrawExecutorRewarded(msg.sender, executorReward, drawNumber + 1000000);
            }
            
            // Keep 10% for next draw
            uint256 carryOver = l.monthlyDrawPrizes[drawNumber] / 10;
            l.monthlyPrizePool = carryOver;
            
            emit MonthlyDrawExecuted(drawNumber, winner, prizeAmount);
        } else {
            emit MonthlyDrawExecuted(drawNumber, address(0), 0);
        }
        
        // Increment draw number and reset timer
        l.currentMonthlyDraw++;
        l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
    }
    
    // View functions
    function getCurrentDrawInfo() external view returns (
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
    

    
    // Manual draw functions
    function manualDraw() external onlyOwner {
        _executeOfficialDraw();
    }
    
    function manualMonthlyDraw() external onlyOwner {
        _executeMonthlyDraw();
    }
    
    // Admin functions
    function setTicketPrice(uint256 newPrice) external onlyOwner override {
        require(newPrice > 0, "Price must be greater than 0");
        LibGridottoStorage.layout().ticketPrice = newPrice;
    }
    
    function setDrawIntervals(uint256 daily, uint256 monthly) external onlyOwner {
        require(daily > MIN_TIME_BUFFER && monthly > MIN_TIME_BUFFER, "Intervals too short");
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.drawInterval = daily;
        l.monthlyDrawInterval = monthly;
    }
    
    function setFeePercentages(uint256 ownerFee, uint256 monthlyPoolFee) external onlyOwner {
        require(ownerFee + monthlyPoolFee <= 30, "Total fees too high");
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        l.ownerFeePercent = ownerFee;
        l.monthlyPoolPercent = monthlyPoolFee;
    }
    
    function setPaused(bool paused) external onlyOwner {
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
    
    // User draw functions
    function createUserDraw(
        LibGridottoStorage.DrawType drawType,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    ) external payable override notBanned notBlacklisted returns (uint256 drawId) {
        require(drawType == LibGridottoStorage.DrawType.USER_LYX, "Invalid draw type");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= 10000, "Invalid max tickets");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = drawType;
        draw.prizeConfig = prizeConfig;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.requiredToken = requiredToken;
        draw.minTokenAmount = minTokenAmount;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        
        // Handle initial prize funding
        if (prizeConfig.model == LibGridottoStorage.PrizeModel.CREATOR_FUNDED) {
            require(msg.value > 0, "Creator must fund the prize");
            require(prizeConfig.creatorContribution == 0 || msg.value >= prizeConfig.creatorContribution, 
                "Insufficient funding for specified contribution");
            draw.initialPrize = msg.value;
            draw.currentPrizePool = msg.value;
        } else if (prizeConfig.model == LibGridottoStorage.PrizeModel.HYBRID_FUNDED) {
            // Creator provides partial funding
            require(msg.value > 0, "Creator must provide initial funding");
            require(prizeConfig.creatorContribution == 0 || msg.value >= prizeConfig.creatorContribution,
                "Must meet minimum creator contribution");
            draw.initialPrize = msg.value;
            draw.currentPrizePool = msg.value;
        }
        // PARTICIPANT_FUNDED doesn't require initial funding
        
        // Add to creator's draws
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit UserDrawCreated(drawId, msg.sender, drawType, prizeConfig.model);
        
        return drawId;
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
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(ticketPriceLYX > 0, "Ticket price must be > 0");
        require(duration >= MIN_TIME_BUFFER, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= MAX_TICKETS_PER_DRAW, "Invalid max tickets");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP7;
        draw.prizeConfig = prizeConfig;
        draw.ticketPrice = ticketPriceLYX;
        draw.endTime = block.timestamp + duration;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.tokenAddress = tokenAddress;
        draw.startTime = block.timestamp;
        
        // Handle token transfer based on prize model
        if (prizeConfig.model == LibGridottoStorage.PrizeModel.CREATOR_FUNDED) {
            require(prizeConfig.creatorContribution == tokenAmount, "Creator contribution mismatch");
            
            // Transfer tokens from creator to contract
            ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
            token.transfer(msg.sender, address(this), tokenAmount, true, "");
            
            draw.currentPrizePool = tokenAmount;
        } else if (prizeConfig.model == LibGridottoStorage.PrizeModel.PARTICIPANT_FUNDED) {
            require(prizeConfig.creatorContribution == 0, "No creator contribution for participant funded");
            draw.currentPrizePool = 0;
        } else {
            // HYBRID_FUNDED
            require(prizeConfig.creatorContribution > 0 && prizeConfig.creatorContribution <= tokenAmount, "Invalid creator contribution");
            
            // Transfer creator's contribution
            ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
            token.transfer(msg.sender, address(this), prizeConfig.creatorContribution, true, "");
            
            draw.currentPrizePool = prizeConfig.creatorContribution;
        }
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit UserDrawCreated(drawId, msg.sender, LibGridottoStorage.DrawType.USER_LSP7, prizeConfig.model);
    }
    
    function createNFTDraw(
        address nftAddress,
        bytes32[] memory tokenIds,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement
    ) external override returns (uint256 drawId) {
        require(nftAddress != address(0), "Invalid NFT address");
        require(tokenIds.length > 0, "No NFTs provided");
        require(ticketPrice > 0, "Ticket price must be > 0");
        require(duration >= MIN_TIME_BUFFER, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= MAX_TICKETS_PER_DRAW, "Invalid max tickets");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP8;
        draw.ticketPrice = ticketPrice;
        draw.endTime = block.timestamp + duration;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.nftAddress = nftAddress;
        draw.startTime = block.timestamp;
        
        // Transfer NFTs from creator to contract
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(nftAddress);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            // Check ownership
            require(nft.tokenOwnerOf(tokenIds[i]) == msg.sender, "Not NFT owner");
            
            // Transfer NFT to contract
            nft.transfer(msg.sender, address(this), tokenIds[i], true, "");
            
            // Store NFT ID
            draw.nftTokenIds.push(tokenIds[i]);
        }
        
        // For NFT draws, prize config is simple - winner gets all NFTs
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.CREATOR_FUNDED,
            creatorContribution: 0, // Not used for NFTs
            addParticipationFees: true,
            participationFeePercent: 5, // 5% to creator
            totalWinners: 1
        });
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit UserDrawCreated(drawId, msg.sender, LibGridottoStorage.DrawType.USER_LSP8, LibGridottoStorage.PrizeModel.CREATOR_FUNDED);
    }
    
    // Phase 4: Advanced draw creation with multi-winner support
    function createAdvancedDraw(
        LibGridottoStorage.DrawType drawType,
        address assetAddress,
        uint256 assetAmount,
        bytes32[] memory nftIds,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        uint256 minFollowerCount,
        LibGridottoStorage.MultiWinnerConfig memory winnerConfig
    ) external payable override returns (uint256 drawId) {
        require(ticketPrice > 0, "Ticket price must be > 0");
        require(duration >= MIN_TIME_BUFFER, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= MAX_TICKETS_PER_DRAW, "Invalid max tickets");
        
        // Validate winner config
        if (winnerConfig.enabled) {
            require(winnerConfig.tiers.length > 0, "No tiers defined");
            uint256 totalPercent = 0;
            uint256 totalWinners = 0;
            
            for (uint256 i = 0; i < winnerConfig.tiers.length; i++) {
                totalPercent += winnerConfig.tiers[i].prizePercent;
                totalWinners += winnerConfig.tiers[i].winnersCount;
                
                // For NFT draws, validate specific NFT assignments
                if (drawType == LibGridottoStorage.DrawType.USER_LSP8) {
                    require(
                        winnerConfig.tiers[i].specificNFTIds.length == 0 || 
                        winnerConfig.tiers[i].specificNFTIds.length == winnerConfig.tiers[i].winnersCount,
                        "NFT count mismatch in tier"
                    );
                }
            }
            
            require(totalPercent <= 100, "Total percentage exceeds 100");
            require(totalWinners <= maxTickets, "Total winners exceeds max tickets");
            winnerConfig.totalWinners = totalWinners;
        }
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = drawType;
        draw.prizeConfig = prizeConfig;
        draw.ticketPrice = ticketPrice;
        draw.endTime = block.timestamp + duration;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.minFollowerCount = minFollowerCount;
        draw.startTime = block.timestamp;
        draw.winnerConfig = winnerConfig;
        
        // Handle different draw types
        if (drawType == LibGridottoStorage.DrawType.USER_LYX) {
            require(msg.value >= prizeConfig.creatorContribution, "Insufficient LYX");
            draw.currentPrizePool = prizeConfig.creatorContribution;
            draw.initialPrize = prizeConfig.creatorContribution;
            
            // Refund excess
            if (msg.value > prizeConfig.creatorContribution) {
                (bool success, ) = msg.sender.call{value: msg.value - prizeConfig.creatorContribution}("");
                require(success, "Refund failed");
            }
        } else if (drawType == LibGridottoStorage.DrawType.USER_LSP7) {
            require(assetAddress != address(0), "Invalid token address");
            require(assetAmount > 0, "Invalid token amount");
            draw.tokenAddress = assetAddress;
            
            // Transfer tokens based on funding model
            if (prizeConfig.model == LibGridottoStorage.PrizeModel.CREATOR_FUNDED) {
                ILSP7DigitalAsset token = ILSP7DigitalAsset(assetAddress);
                token.transfer(msg.sender, address(this), assetAmount, true, "");
                draw.currentPrizePool = assetAmount;
            } else if (prizeConfig.model == LibGridottoStorage.PrizeModel.HYBRID_FUNDED) {
                ILSP7DigitalAsset token = ILSP7DigitalAsset(assetAddress);
                token.transfer(msg.sender, address(this), prizeConfig.creatorContribution, true, "");
                draw.currentPrizePool = prizeConfig.creatorContribution;
            }
        } else if (drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            require(assetAddress != address(0), "Invalid NFT address");
            require(nftIds.length > 0, "No NFTs provided");
            draw.nftAddress = assetAddress;
            
            // Validate NFT count matches tier configuration
            if (winnerConfig.enabled) {
                uint256 totalNFTsNeeded = 0;
                for (uint256 i = 0; i < winnerConfig.tiers.length; i++) {
                    if (winnerConfig.tiers[i].specificNFTIds.length > 0) {
                        totalNFTsNeeded += winnerConfig.tiers[i].specificNFTIds.length;
                    } else {
                        totalNFTsNeeded += winnerConfig.tiers[i].winnersCount;
                    }
                }
                require(nftIds.length >= totalNFTsNeeded, "Insufficient NFTs for winners");
            }
            
            // Transfer NFTs
            ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(assetAddress);
            for (uint256 i = 0; i < nftIds.length; i++) {
                require(nft.tokenOwnerOf(nftIds[i]) == msg.sender, "Not NFT owner");
                nft.transfer(msg.sender, address(this), nftIds[i], true, "");
                draw.nftTokenIds.push(nftIds[i]);
            }
        }
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        // Update user stats
        LibAdminStorage.updateUserStats(msg.sender, true, false, false, 0, 0);
        
        emit UserDrawCreated(drawId, msg.sender, drawType, prizeConfig.model);
        return drawId;
    }
    
    function buyUserDrawTicket(uint256 drawId, uint256 amount) external payable override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(block.timestamp >= draw.startTime, "Draw not started");
        require(block.timestamp < draw.endTime, "Draw ended");
        require(amount > 0, "Amount must be greater than 0");
        require(draw.ticketsSold + amount <= draw.maxTickets, "Exceeds max tickets");
        
        // Check participation requirements
        _checkParticipationRequirements(draw, msg.sender);
        
        // Calculate cost
        uint256 totalCost = draw.ticketPrice * amount;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate fees
        uint256 platformFeePercent = LibAdminStorage.getPlatformFee();
        uint256 platformFee = (totalCost * platformFeePercent) / 100;
        uint256 toPrizePool = totalCost - platformFee;
        
        // Update draw state
        draw.ticketsSold += amount;
        draw.currentPrizePool += toPrizePool;
        draw.platformFeeCollected += platformFee;
        draw.collectedFees += totalCost;
        
        // Update user tickets
        if (draw.userTickets[msg.sender] == 0) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
            l.userParticipatedDraws[msg.sender].push(drawId);
        }
        draw.userTickets[msg.sender] += amount;
        
        // Add to platform fees
        l.ownerProfit += platformFee;
        
        // Apply VIP discount if applicable
        uint256 discount = _calculateVIPDiscount(msg.sender, platformFee);
        if (discount > 0) {
            draw.currentPrizePool += discount;
            l.ownerProfit -= discount;
        }
        
        // Refund excess
        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
        
        emit TicketPurchased(msg.sender, draw.creator, amount, drawId);
    }
    
    function buyUserDrawTicketWithToken(uint256 drawId, uint256 amount) external override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP7, "Not a token draw");
        require(!draw.isCompleted, "Draw already completed");
        require(block.timestamp >= draw.startTime, "Draw not started");
        require(block.timestamp < draw.endTime, "Draw ended");
        require(amount > 0, "Amount must be greater than 0");
        require(draw.ticketsSold + amount <= draw.maxTickets, "Exceeds max tickets");
        
        // Check participation requirements
        _checkParticipationRequirements(draw, msg.sender);
        
        // Calculate cost in tokens
        uint256 totalCost = draw.ticketPrice * amount;
        
        // Transfer tokens from buyer to contract
        ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
        token.transfer(msg.sender, address(this), totalCost, true, "");
        
        // Calculate fees
        uint256 platformFeePercent = LibAdminStorage.getPlatformFee();
        uint256 platformFee = (totalCost * platformFeePercent) / 100;
        uint256 creatorFee = 0;
        
        if (draw.prizeConfig.addParticipationFees && draw.prizeConfig.participationFeePercent > 0) {
            creatorFee = (totalCost * draw.prizeConfig.participationFeePercent) / 100;
        }
        
        uint256 toPrizePool = totalCost - platformFee - creatorFee;
        
        // Update prize pool
        if (draw.prizeConfig.model != LibGridottoStorage.PrizeModel.CREATOR_FUNDED) {
            draw.currentPrizePool += toPrizePool;
        }
        
        // Update platform profit (in tokens)
        l.ownerTokenProfit[draw.tokenAddress] += platformFee;
        
        // Update creator profit (in tokens)
        if (creatorFee > 0) {
            l.creatorTokenProfit[draw.creator][draw.tokenAddress] += creatorFee;
        }
        
        // Add tickets
        for (uint256 i = 0; i < amount; i++) {
            draw.participants.push(msg.sender);
        }
        
        draw.ticketsSold += amount;
        
        // Track user participation
        if (!l.hasParticipated[drawId][msg.sender]) {
            l.hasParticipated[drawId][msg.sender] = true;
            l.userParticipatedDraws[msg.sender].push(drawId);
        }
        
        emit UserDrawTicketPurchased(drawId, msg.sender, amount, totalCost);
    }
    
    function executeUserDraw(uint256 drawId) external override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(
            block.timestamp >= draw.endTime || draw.ticketsSold == draw.maxTickets,
            "Draw not ready for execution"
        );
        require(draw.participants.length > 0, "No participants");
        
        // Get random number for winner selection
        uint256 randomValue;
        try IOracleFacet(address(this)).getRandomNumber() returns (uint256 value) {
            randomValue = value;
        } catch {
            // Fallback to pseudo-random
            randomValue = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                drawId,
                draw.participants.length
            )));
        }
        
        // Select winner(s) based on configuration
        if (draw.participants.length > 0) {
            
            // Check if multi-winner is enabled
            if (draw.winnerConfig.enabled && draw.winnerConfig.tiers.length > 0) {
                // Multi-winner selection
                _selectMultipleWinners(draw, randomValue);
            } else {
                // Single winner takes all
                address winner = _selectWinner(draw, randomValue);
                draw.winners.push(winner);
            }
            
            // Calculate prize and executor reward
            uint256 prizeAmount = draw.currentPrizePool;
            uint256 fivePercent = (prizeAmount * 5) / 100;
            uint256 maxReward = 5 ether; // 5 LYX max
            uint256 executorReward = fivePercent > maxReward ? maxReward : fivePercent;
            prizeAmount -= executorReward;
            
            // Platform already took 5% fee during ticket sales
            // Creator gets remaining amount based on model
            if (draw.prizeConfig.model == LibGridottoStorage.PrizeModel.CREATOR_FUNDED) {
                // Creator funded it all, winner gets prize minus executor reward
                // No additional creator share
            } else if (draw.prizeConfig.participationFeePercent > 0) {
                // If creator wants additional percentage from participation fees
                uint256 creatorAmount = (draw.collectedFees * draw.prizeConfig.participationFeePercent) / 100;
                if (creatorAmount > 0 && creatorAmount < prizeAmount) {
                    prizeAmount -= creatorAmount;
                    (bool success, ) = draw.creator.call{value: creatorAmount}("");
                    require(success, "Creator transfer failed");
                }
            }
            
            // Handle prize distribution based on draw type
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                if (draw.winnerConfig.enabled) {
                    // Multi-winner distribution for LYX
                    _distributeLYXPrizesToMultipleWinners(draw, executorReward);
                } else {
                    // Single winner
                    l.pendingPrizes[draw.winners[0]] += prizeAmount;
                    
                    // Track winner for leaderboard
                    LibGridottoStorage.trackWinner(
                        draw.winners[0],
                        drawId,
                        draw.drawType,
                        prizeAmount,
                        address(0), // LYX
                        bytes32(0),
                        draw.creator
                    );
                }
                
                // Reward the executor (person who called this function)
                if (executorReward > 0) {
                    (bool success, ) = msg.sender.call{value: executorReward}("");
                    require(success, "Executor reward transfer failed");
                    emit DrawExecutorRewarded(msg.sender, executorReward, drawId);
                }
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                // For token draws
                ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
                
                // Calculate executor reward in tokens (5% no max limit)
                uint256 tokenExecutorReward = (draw.currentPrizePool * 5) / 100;
                
                if (draw.winnerConfig.enabled) {
                    // Multi-winner distribution for tokens
                    _distributeTokenPrizesToMultipleWinners(draw, tokenExecutorReward);
                } else {
                    // Single winner
                    uint256 winnerPrize = draw.currentPrizePool - tokenExecutorReward;
                    token.transfer(address(this), draw.winners[0], winnerPrize, true, "");
                    
                    // Track winner for leaderboard
                    LibGridottoStorage.trackWinner(
                        draw.winners[0],
                        drawId,
                        draw.drawType,
                        winnerPrize,
                        draw.tokenAddress,
                        bytes32(0),
                        draw.creator
                    );
                }
                
                // Transfer executor reward
                if (tokenExecutorReward > 0) {
                    token.transfer(address(this), msg.sender, tokenExecutorReward, true, "");
                    emit DrawExecutorRewarded(msg.sender, tokenExecutorReward, drawId);
                }
                
                prizeAmount = draw.currentPrizePool - tokenExecutorReward; // For event
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
                // For NFT draws
                if (draw.winnerConfig.enabled) {
                    // Multi-winner distribution for NFTs
                    _distributeNFTPrizesToMultipleWinners(draw);
                } else {
                    // Single winner gets all NFTs
                    ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
                    for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                        nft.transfer(address(this), draw.winners[0], draw.nftTokenIds[i], true, "");
                        
                        // Track each NFT winner for leaderboard
                        LibGridottoStorage.trackWinner(
                            draw.winners[0],
                            drawId,
                            draw.drawType,
                            1, // 1 NFT
                            draw.nftAddress,
                            draw.nftTokenIds[i],
                            draw.creator
                        );
                    }
                }
                
                // NFT draws don't have executor rewards
                // NFTs are indivisible, no reward for executor
                
                prizeAmount = draw.nftTokenIds.length; // Number of NFTs for event
            }
            
            emit UserDrawCompleted(drawId, draw.winners, prizeAmount);
        }
        
        // Mark as completed
        draw.isCompleted = true;
    }
    
    function cancelUserDraw(uint256 drawId) external override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator == msg.sender, "Only creator can cancel");
        require(!draw.isCompleted, "Draw already completed");
        require(draw.participants.length == 0, "Cannot cancel - draw has participants");
        
        // Can only cancel if no tickets sold
        // This prevents any financial loss
        
        // Refund creator based on draw type
        if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
            if (draw.initialPrize > 0) {
                (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
                require(success, "Refund failed");
            }
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
            if (draw.currentPrizePool > 0) {
                // Refund tokens to creator
                ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
                token.transfer(address(this), draw.creator, draw.currentPrizePool, true, "");
            }
        } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            // Return NFTs to creator
            ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftAddress);
            for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                nft.transfer(address(this), draw.creator, draw.nftTokenIds[i], true, "");
            }
        }
        
        // Mark as completed/cancelled
        draw.isCompleted = true;
        
        emit DrawCancelled(drawId, "Cancelled - no participants");
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
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        return (
            draw.creator,
            draw.drawType,
            draw.ticketPrice,
            draw.ticketsSold,
            draw.maxTickets,
            draw.currentPrizePool,
            draw.endTime,
            draw.isCompleted
        );
    }
    
    function getUserTickets(uint256 drawId, address user) external view override returns (uint256) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        return draw.userTickets[user];
    }
    
    function getDrawParticipants(uint256 drawId) external view override returns (address[] memory) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        return draw.participants;
    }
    
    function calculateCurrentPrize(uint256 drawId) external view override returns (uint256) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        return draw.currentPrizePool;
    }
    
    function canParticipate(uint256 drawId, address user) external view override returns (bool) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        // Check if draw exists and is active
        if (draw.creator == address(0) || draw.isCompleted) return false;
        if (block.timestamp < draw.startTime || block.timestamp >= draw.endTime) return false;
        if (draw.ticketsSold >= draw.maxTickets) return false;
        
        // For now, simplified check - in production would check requirements
        return true;
    }

    // New UI Functions
    function getActiveDraws() external view override returns (uint256[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 activeCount = 0;
        
        // First count active draws
        for (uint256 i = 0; i < l.nextDrawId; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            if (draw.creator != address(0) && !draw.isCompleted && block.timestamp < draw.endTime) {
                activeCount++;
            }
        }
        
        // Create array and fill with active draw IDs
        uint256[] memory activeDraws = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < l.nextDrawId; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            if (draw.creator != address(0) && !draw.isCompleted && block.timestamp < draw.endTime) {
                activeDraws[index++] = i;
            }
        }
        
        return activeDraws;
    }
    
    function getTotalActiveDraws() external view override returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < l.nextDrawId; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[i];
            if (draw.creator != address(0) && !draw.isCompleted && block.timestamp < draw.endTime) {
                activeCount++;
            }
        }
        
        return activeCount;
    }
    
    function getDrawDetails(uint256 drawId) external view override returns (
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
    ) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        return (
            draw.creator,
            draw.drawType,
            draw.prizeConfig,
            draw.ticketPrice,
            draw.ticketsSold,
            draw.maxTickets,
            draw.currentPrizePool,
            draw.startTime,
            draw.endTime,
            draw.isCompleted,
            draw.requirement,
            draw.requiredToken,
            draw.minTokenAmount
        );
    }
    
    function getUserCreatedDraws(address user) external view override returns (uint256[] memory) {
        return LibGridottoStorage.layout().userCreatedDraws[user];
    }
    
    function getUserParticipatedDraws(address user) external view override returns (uint256[] memory) {
        return LibGridottoStorage.layout().userParticipatedDraws[user];
    }
    
    function getDrawWinners(uint256 drawId) external view override returns (address[] memory) {
        return LibGridottoStorage.layout().userDraws[drawId].winners;
    }
    
    function canExecuteDraw(uint256 drawId) external view override returns (bool) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        if (draw.creator == address(0) || draw.isCompleted) return false;
        if (draw.participants.length == 0) return false;
        
        // Can execute if time passed OR max tickets sold
        return (block.timestamp >= draw.endTime || draw.ticketsSold == draw.maxTickets);
    }

    // Calculate executor reward (5% of prize pool, max 5 LYX)
    function getExecutorReward(uint256 drawId) external view override returns (uint256) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        
        if (draw.creator == address(0) || draw.isCompleted) return 0;
        if (draw.participants.length == 0) return 0;
        if (block.timestamp < draw.endTime && draw.ticketsSold < draw.maxTickets) return 0;
        
        uint256 fivePercent = (draw.currentPrizePool * 5) / 100;
        uint256 maxReward = 5 ether; // 5 LYX max
        
        return fivePercent > maxReward ? maxReward : fivePercent;
    }
    
    // Get executor reward for official draws
    function getOfficialDrawExecutorReward() external view override returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (block.timestamp < l.drawTime) return 0;
        
        uint256 prizeAmount = l.drawPrizes[l.currentDraw];
        if (prizeAmount == 0) return 0;
        
        uint256 fivePercent = (prizeAmount * 5) / 100;
        uint256 maxReward = 5 ether; // 5 LYX max
        
        return fivePercent > maxReward ? maxReward : fivePercent;
    }
    
    // Get executor reward for monthly draws
    function getMonthlyDrawExecutorReward() external view override returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        if (block.timestamp < l.monthlyDrawTime) return 0;
        
        uint256 prizeAmount = l.monthlyDrawPrizes[l.currentMonthlyDraw];
        if (prizeAmount == 0) return 0;
        
        uint256 fivePercent = (prizeAmount * 5) / 100;
        uint256 maxReward = 5 ether; // 5 LYX max
        
        return fivePercent > maxReward ? maxReward : fivePercent;
    }

    // Legacy View Functions
    function getDrawInfo() external view override returns (uint256 drawNumber, uint256 endTime, uint256 prize, uint256 ticketsSold) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawNumber = l.currentDraw;
        endTime = l.drawTime;
        prize = l.drawPrizes[drawNumber];
        ticketsSold = l.drawTickets[drawNumber].length;
    }
    
    function getMonthlyDrawInfo() external view override returns (uint256 drawNumber, uint256 endTime, uint256 prize, uint256 ticketsSold) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawNumber = l.currentMonthlyDraw;
        endTime = l.monthlyDrawTime;
        prize = l.monthlyDrawPrizes[drawNumber];
        ticketsSold = l.monthlyDrawTickets[drawNumber].length;
    }
    
    function getUserTicketCount(address user, uint256 drawNumber) external view override returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 count = 0;
        address[] storage tickets = l.drawTickets[drawNumber];
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i] == user) count++;
        }
        return count;
    }
    
    function getWinner(uint256 drawNumber) external view override returns (address) {
        return LibGridottoStorage.layout().winners[drawNumber];
    }
    
    function getMonthlyWinner(uint256 drawNumber) external view override returns (address) {
        return LibGridottoStorage.layout().monthlyWinners[drawNumber];
    }
    
    // Admin Functions
    function pause() external onlyOwner override {
        LibGridottoStorage.layout().paused = true;
    }
    
    function unpause() external onlyOwner override {
        LibGridottoStorage.layout().paused = false;
    }
    
    function setDrawInterval(uint256 newInterval) external onlyOwner override {
        require(newInterval >= 1 hours, "Interval too short");
        LibGridottoStorage.layout().drawInterval = newInterval;
    }
    
    function setMonthlyDrawInterval(uint256 newInterval) external onlyOwner override {
        require(newInterval >= 1 days, "Interval too short");
        LibGridottoStorage.layout().monthlyDrawInterval = newInterval;
    }
    
    function setOwnerFeePercent(uint256 newPercent) external onlyOwner override {
        require(newPercent <= 20, "Fee too high");
        LibGridottoStorage.layout().ownerFeePercent = newPercent;
    }
    
    function setMonthlyPoolPercent(uint256 newPercent) external onlyOwner override {
        require(newPercent <= 30, "Percent too high");
        LibGridottoStorage.layout().monthlyPoolPercent = newPercent;
    }
    
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner override {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdrawal(msg.sender, to, amount);
    }

    // Token withdrawal functions
    function withdrawOwnerTokenProfit(address tokenAddress) external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 amount = l.ownerTokenProfit[tokenAddress];
        require(amount > 0, "No token profit to withdraw");
        
        l.ownerTokenProfit[tokenAddress] = 0;
        
        // Transfer tokens to owner
        ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
        token.transfer(address(this), msg.sender, amount, true, "");
        
        emit AdminWithdrawal(msg.sender, amount);
    }
    
    function withdrawCreatorTokenProfit(address tokenAddress) external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 amount = l.creatorTokenProfit[msg.sender][tokenAddress];
        require(amount > 0, "No token profit to withdraw");
        
        l.creatorTokenProfit[msg.sender][tokenAddress] = 0;
        
        // Transfer tokens to creator
        ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
        token.transfer(address(this), msg.sender, amount, true, "");
        
        emit CreatorWithdrawal(msg.sender, amount);
    }
    
    // View functions for token profits
    function getOwnerTokenProfit(address tokenAddress) external view returns (uint256) {
        return LibGridottoStorage.layout().ownerTokenProfit[tokenAddress];
    }
    
    function getCreatorTokenProfit(address creator, address tokenAddress) external view returns (uint256) {
        return LibGridottoStorage.layout().creatorTokenProfit[creator][tokenAddress];
    }


}