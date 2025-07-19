// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";

contract GridottoPhase3Facet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    using LibAdminStorage for LibAdminStorage.AdminLayout;
    
    // Events
    event TokenDrawCreated(uint256 indexed drawId, address indexed creator, address tokenAddress);
    event NFTDrawCreated(uint256 indexed drawId, address indexed creator, address nftContract, bytes32[] tokenIds);
    event TokenPrizeClaimed(uint256 indexed drawId, address indexed winner, uint256 amount);
    event NFTPrizeClaimed(uint256 indexed drawId, address indexed winner, bytes32 tokenId);
    
    // Modifiers
    modifier notBanned() {
        require(!LibAdminStorage.isBanned(msg.sender), "User is banned");
        _;
    }
    
    modifier notBlacklisted() {
        require(!LibAdminStorage.isBlacklisted(msg.sender), "User is blacklisted");
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        require(!LibGridottoStorage.layout().locked, "ReentrancyGuard: reentrant call");
        LibGridottoStorage.layout().locked = true;
        _;
        LibGridottoStorage.layout().locked = false;
    }
    
    // Phase 3: LSP7 Token Draw Functions
    function createTokenDraw(
        address tokenAddress,
        uint256 prizeAmount,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    ) external notBanned notBlacklisted returns (uint256 drawId) {
        require(tokenAddress != address(0), "Invalid token address");
        require(prizeAmount > 0, "Prize amount must be greater than 0");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= LibAdminStorage.getMaxTicketsPerDraw(), "Invalid max tickets");
        
        // Transfer tokens from creator
        ILSP7DigitalAsset(tokenAddress).transfer(msg.sender, address(this), prizeAmount, true, "");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP7;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.requiredToken = requiredToken;
        draw.minTokenAmount = minTokenAmount;
        draw.tokenAddress = tokenAddress;
        draw.initialPrize = prizeAmount;
        draw.currentPrize = prizeAmount;
        
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.WINNER_TAKES_ALL,
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 10,
            totalWinners: 1
        });
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        // Update stats
        LibAdminStorage.updateUserStats(msg.sender, true, false, false, 0, 0);
        
        emit TokenDrawCreated(drawId, msg.sender, tokenAddress);
        return drawId;
    }
    
    function createNFTDraw(
        address nftContract,
        bytes32[] calldata tokenIds,
        uint256 ticketPrice,
        uint256 duration,
        uint256 maxTickets,
        LibGridottoStorage.ParticipationRequirement requirement,
        address requiredToken,
        uint256 minTokenAmount
    ) external payable notBanned notBlacklisted returns (uint256 drawId) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(tokenIds.length > 0, "No NFTs provided");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(maxTickets > 0 && maxTickets <= LibAdminStorage.getMaxTicketsPerDraw(), "Invalid max tickets");
        
        // Transfer NFTs from creator
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(nftContract);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            nft.transfer(msg.sender, address(this), tokenIds[i], true, "");
        }
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP8;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.requirement = requirement;
        draw.requiredToken = requiredToken;
        draw.minTokenAmount = minTokenAmount;
        draw.nftContract = nftContract;
        draw.nftTokenIds = tokenIds;
        draw.initialPrize = msg.value;
        draw.currentPrize = msg.value;
        
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.WINNER_TAKES_ALL,
            creatorContribution: 0,
            addParticipationFees: true,
            participationFeePercent: 10,
            totalWinners: 1
        });
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        // Update stats
        LibAdminStorage.updateUserStats(msg.sender, true, false, false, 0, 0);
        
        emit NFTDrawCreated(drawId, msg.sender, nftContract, tokenIds);
        return drawId;
    }
    
    function buyTokenDrawTicket(uint256 drawId, uint256 amount) external notPaused nonReentrant notBanned notBlacklisted {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP7, "Not a token draw");
        require(block.timestamp >= draw.startTime && block.timestamp < draw.endTime, "Draw not active");
        require(draw.totalTickets + amount <= draw.maxTickets, "Exceeds max tickets");
        require(amount > 0, "Invalid amount");
        
        // Check participation requirements
        _checkParticipationRequirement(draw);
        
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
        
        // Update draw state
        draw.currentPrize += toPrizePool;
        draw.totalTickets += amount;
        
        // Track fees
        l.ownerTokenProfit[draw.tokenAddress] += platformFee;
        if (creatorFee > 0) {
            l.creatorTokenProfit[draw.creator][draw.tokenAddress] += creatorFee;
        }
        
        // Record tickets
        if (draw.userTickets[msg.sender] == 0) {
            draw.participants.push(msg.sender);
        }
        draw.userTickets[msg.sender] += amount;
        
        // Update stats
        LibAdminStorage.updateUserStats(msg.sender, false, true, false, totalCost, 0);
        LibAdminStorage.addTokenVolume(draw.tokenAddress, totalCost);
    }
    
    function buyNFTDrawTicket(uint256 drawId, uint256 amount) external payable notPaused nonReentrant notBanned notBlacklisted {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP8, "Not an NFT draw");
        require(block.timestamp >= draw.startTime && block.timestamp < draw.endTime, "Draw not active");
        require(draw.totalTickets + amount <= draw.maxTickets, "Exceeds max tickets");
        require(amount > 0, "Invalid amount");
        
        // Check participation requirements
        _checkParticipationRequirement(draw);
        
        uint256 totalCost = draw.ticketPrice * amount;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate fees
        uint256 platformFeePercent = LibAdminStorage.getPlatformFee();
        uint256 platformFee = (totalCost * platformFeePercent) / 100;
        uint256 toPrizePool = totalCost - platformFee;
        
        // Update draw state
        draw.currentPrize += toPrizePool;
        draw.totalTickets += amount;
        
        // Track fees
        l.ownerProfit += platformFee;
        
        // Record tickets
        if (draw.userTickets[msg.sender] == 0) {
            draw.participants.push(msg.sender);
        }
        draw.userTickets[msg.sender] += amount;
        
        // Update stats
        LibAdminStorage.updateUserStats(msg.sender, false, true, false, totalCost, 0);
        LibAdminStorage.addPlatformVolume(totalCost);
        
        // Refund excess
        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
    }
    
    function executeTokenDraw(uint256 drawId) external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP7, "Not a token draw");
        require(!draw.isCompleted, "Already completed");
        require(block.timestamp >= draw.endTime, "Draw not ended");
        require(draw.participants.length > 0, "No participants");
        
        // Select winner
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, drawId)));
        uint256 winningTicket = randomSeed % draw.totalTickets;
        
        address winner = _findWinnerByTicket(draw, winningTicket);
        draw.winners.push(winner);
        draw.isCompleted = true;
        
        // Calculate executor reward (5% of prize pool)
        (uint256 executorPercent, ) = LibAdminStorage.getExecutorRewardConfig();
        uint256 executorReward = (draw.currentPrize * executorPercent) / 100;
        uint256 winnerPrize = draw.currentPrize - executorReward;
        
        // Transfer executor reward
        if (executorReward > 0) {
            ILSP7DigitalAsset(draw.tokenAddress).transfer(
                address(this),
                msg.sender,
                executorReward,
                true,
                ""
            );
        }
        
        // Record winner's prize
        l.pendingTokenPrizes[winner][draw.tokenAddress] += winnerPrize;
        
        // Remove from active draws
        _removeFromActiveDraws(drawId);
        
        // Update stats
        LibAdminStorage.incrementCompletedDraws();
        LibAdminStorage.updateUserStats(winner, false, false, true, 0, winnerPrize);
    }
    
    function executeNFTDraw(uint256 drawId) external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP8, "Not an NFT draw");
        require(!draw.isCompleted, "Already completed");
        require(block.timestamp >= draw.endTime, "Draw not ended");
        require(draw.participants.length > 0, "No participants");
        
        // Select winner
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, drawId)));
        uint256 winningTicket = randomSeed % draw.totalTickets;
        
        address winner = _findWinnerByTicket(draw, winningTicket);
        draw.winners.push(winner);
        draw.isCompleted = true;
        
        // No executor reward for NFT draws
        // Record winner's prizes
        l.pendingPrizes[winner] += draw.currentPrize; // LYX prize
        
        // Store NFT prizes for claiming
        for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
            l.pendingNFTPrizes[winner][draw.nftContract].push(draw.nftTokenIds[i]);
        }
        
        // Remove from active draws
        _removeFromActiveDraws(drawId);
        
        // Update stats
        LibAdminStorage.incrementCompletedDraws();
        LibAdminStorage.updateUserStats(winner, false, false, true, 0, draw.currentPrize);
    }
    
    function claimTokenPrize(address token) external nonReentrant {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 amount = l.pendingTokenPrizes[msg.sender][token];
        
        require(amount > 0, "No pending token prizes");
        
        l.pendingTokenPrizes[msg.sender][token] = 0;
        
        ILSP7DigitalAsset(token).transfer(address(this), msg.sender, amount, true, "");
        
        emit TokenPrizeClaimed(0, msg.sender, amount);
    }
    
    function claimNFTPrize(address nftContract) external nonReentrant {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        bytes32[] memory tokenIds = l.pendingNFTPrizes[msg.sender][nftContract];
        
        require(tokenIds.length > 0, "No pending NFT prizes");
        
        delete l.pendingNFTPrizes[msg.sender][nftContract];
        
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(nftContract);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            nft.transfer(address(this), msg.sender, tokenIds[i], true, "");
            emit NFTPrizeClaimed(0, msg.sender, tokenIds[i]);
        }
    }
    
    // Internal functions
    function _checkParticipationRequirement(LibGridottoStorage.UserDraw storage draw) internal view {
        if (draw.requirement == LibGridottoStorage.ParticipationRequirement.NONE) {
            return;
        }
        
        if (draw.requirement == LibGridottoStorage.ParticipationRequirement.HOLD_TOKEN) {
            require(draw.requiredToken != address(0), "Required token not set");
            uint256 balance = ILSP7DigitalAsset(draw.requiredToken).balanceOf(msg.sender);
            require(balance >= draw.minTokenAmount, "Insufficient token balance");
        }
    }
    
    function _findWinnerByTicket(
        LibGridottoStorage.UserDraw storage draw,
        uint256 winningTicket
    ) internal view returns (address) {
        uint256 currentTicket = 0;
        
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.userTickets[participant];
            
            if (winningTicket >= currentTicket && winningTicket < currentTicket + userTickets) {
                return participant;
            }
            
            currentTicket += userTickets;
        }
        
        revert("Winner not found");
    }
    
    function _removeFromActiveDraws(uint256 drawId) internal {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        for (uint256 i = 0; i < l.activeUserDraws.length; i++) {
            if (l.activeUserDraws[i] == drawId) {
                l.activeUserDraws[i] = l.activeUserDraws[l.activeUserDraws.length - 1];
                l.activeUserDraws.pop();
                break;
            }
        }
    }
}