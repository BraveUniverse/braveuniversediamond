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
    event TokenDrawCreated(uint256 indexed drawId, address indexed creator, address tokenAddress, uint256 initialPrize);
    event NFTDrawCreated(uint256 indexed drawId, address indexed creator, address nftContract, bytes32[] tokenIds);
    event TokenPrizeClaimed(uint256 indexed drawId, address indexed winner, uint256 amount);
    event NFTPrizeClaimed(uint256 indexed drawId, address indexed winner, bytes32 tokenId);
    event DrawRefunded(uint256 indexed drawId, address indexed participant, uint256 amount);
    event UserDrawRefunded(uint256 indexed drawId, uint256 participantsCount, uint256 currentPrizePool);
    event RefundClaimed(uint256 indexed drawId, address indexed participant, uint256 amount);
    
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
        uint256 initialPrize,
        uint256 ticketPriceLYX,
        uint256 duration,
        uint256 minParticipants,
        uint256 maxParticipants,
        uint256 creatorFeePercent
    ) external notBanned notBlacklisted returns (uint256 drawId) {
        require(tokenAddress != address(0), "Invalid token address");
        require(ticketPriceLYX > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(creatorFeePercent <= 10, "Creator fee too high"); // Max 10%
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP7;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPriceLYX;
        draw.maxTickets = maxParticipants > 0 ? maxParticipants : 10000; // Default max
        draw.minParticipants = minParticipants;
        draw.requirement = LibGridottoStorage.ParticipationRequirement.NONE;
        
        // Handle token transfer
        if (initialPrize > 0) {
            ILSP7DigitalAsset token = ILSP7DigitalAsset(tokenAddress);
            token.transfer(msg.sender, address(this), initialPrize, true, "");
        }
        
        draw.tokenAddress = tokenAddress;
        draw.initialPrize = initialPrize;
        draw.currentPrize = initialPrize;
        draw.currentPrizePool = initialPrize;
        
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.CREATOR_FUNDED,
            creatorContribution: 0,
            addParticipationFees: false,
            participationFeePercent: creatorFeePercent,
            totalWinners: 1
        });
        
        // Add to active draws
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit TokenDrawCreated(drawId, msg.sender, tokenAddress, initialPrize);
        return drawId;
    }
    
    function createNFTDraw(
        address nftContract,
        bytes32 tokenId,
        uint256 ticketPrice,
        uint256 duration,
        uint256 minParticipants,
        uint256 maxParticipants
    ) external notBanned notBlacklisted returns (uint256 drawId) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP8;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxParticipants > 0 ? maxParticipants : 10000;
        draw.minParticipants = minParticipants;
        draw.requirement = LibGridottoStorage.ParticipationRequirement.NONE;

        // Transfer NFTs from creator
        ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(nftContract);
        nft.transfer(msg.sender, address(this), tokenId, true, "");
        
        draw.nftContract = nftContract;
        draw.nftTokenIds = new bytes32[](1);
        draw.nftTokenIds[0] = tokenId;
        draw.initialPrize = 0; // NFT draws don't have LYX prize
        draw.currentPrizePool = 0;
        
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.CREATOR_FUNDED,
            creatorContribution: 0,
            addParticipationFees: false,
            participationFeePercent: 0,
            totalWinners: 1
        });
        
        // Add to active draws
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit NFTDrawCreated(drawId, msg.sender, nftContract, draw.nftTokenIds);
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
    
    /**
     * @notice Refund tickets for a draw that didn't meet minimum participants
     * @param drawId The draw ID to refund
     */
    function refundDraw(uint256 drawId) external nonReentrant {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        
        // Check if refund conditions are met
        if (draw.minParticipants > 0 && draw.participants.length < draw.minParticipants) {
            // Allow refund after grace period
            uint256 gracePeriod = 7 days;
            require(
                block.timestamp >= draw.endTime + gracePeriod,
                "Grace period not ended yet"
            );
        } else {
            revert("Draw met minimum participants");
        }
        
        // Mark as completed to prevent further actions
        draw.isCompleted = true;
        
        // Refund all participants
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 ticketsBought = draw.userTickets[participant];
            uint256 refundAmount = ticketsBought * draw.ticketPrice;
            
            if (refundAmount > 0) {
                (bool success, ) = payable(participant).call{value: refundAmount}("");
                require(success, "Refund transfer failed");
                
                emit DrawRefunded(drawId, participant, refundAmount);
            }
        }
        
        // Return initial prize to creator
        if (draw.initialPrize > 0) {
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                (bool success, ) = payable(draw.creator).call{value: draw.initialPrize}("");
                require(success, "Creator refund failed");
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                ILSP7DigitalAsset token = ILSP7DigitalAsset(draw.tokenAddress);
                token.transfer(address(this), draw.creator, draw.initialPrize, true, "");
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP8) {
                ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(draw.nftContract);
                for (uint256 i = 0; i < draw.nftTokenIds.length; i++) {
                    nft.transfer(address(this), draw.creator, draw.nftTokenIds[i], true, "");
                }
            }
        }
        
        emit UserDrawRefunded(drawId, draw.participants.length, draw.currentPrizePool);
    }
    
    /**
     * @notice Allow participants to claim refund individually
     * @param drawId The draw ID to claim refund from
     */
    function claimRefund(uint256 drawId) external nonReentrant {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.userTickets[msg.sender] > 0, "No tickets purchased");
        
        // Check if refund conditions are met
        require(draw.minParticipants > 0, "Draw has no min participants");
        require(draw.participants.length < draw.minParticipants, "Draw met min participants");
        
        uint256 gracePeriod = 7 days;
        require(
            block.timestamp >= draw.endTime + gracePeriod,
            "Grace period not ended yet"
        );
        
        // Calculate refund
        uint256 ticketsBought = draw.userTickets[msg.sender];
        uint256 refundAmount = ticketsBought * draw.ticketPrice;
        
        // Clear user's tickets
        draw.userTickets[msg.sender] = 0;
        
        // Transfer refund
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit RefundClaimed(drawId, msg.sender, refundAmount);
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