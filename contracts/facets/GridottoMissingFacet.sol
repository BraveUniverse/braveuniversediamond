// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IGridottoFacet.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title GridottoMissingFacet
 * @notice Contains the missing functions that couldn't fit in the main GridottoFacet
 */
contract GridottoMissingFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event UserDrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorage.DrawType drawType, LibGridottoStorage.PrizeModel prizeModel);
    event TokenDrawCreated(uint256 indexed drawId, address indexed creator, address tokenAddress, uint256 initialPrize);
    event CreatorTokenProfitWithdrawn(address indexed creator, address indexed token, uint256 amount);
    event OwnerTokenProfitWithdrawn(address indexed owner, address indexed token, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    modifier notBanned() {
        require(!LibAdminStorage.isBanned(msg.sender), "User is banned");
        _;
    }
    
    modifier notBlacklisted() {
        require(!LibAdminStorage.isBlacklisted(msg.sender), "User is blacklisted");
        _;
    }
    
    /**
     * @notice Create a new user draw (simplified version)
     */
    function createUserDraw(
        LibGridottoStorage.DrawType drawType,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        LibGridottoStorage.DrawPrizeConfig memory prizeConfig,
        LibGridottoStorage.ParticipationRequirement requirement,
        address assetAddress,
        uint256 assetAmount,
        bytes32[] memory nftIds
    ) external payable notPaused notBanned notBlacklisted returns (uint256 drawId) {
        require(ticketPrice > 0 || prizeConfig.model == LibGridottoStorage.PrizeModel.CREATOR_FUNDED, "Invalid ticket price");
        require(maxTickets > 0 && maxTickets <= 100000, "Invalid max tickets");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = drawType;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.prizeConfig = prizeConfig;
        draw.requirement = requirement;
        
        // Handle prize based on type
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
            }
        } else if (drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            require(assetAddress != address(0), "Invalid NFT address");
            require(nftIds.length > 0, "No NFTs provided");
            draw.nftAddress = assetAddress;
            
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
    
    /**
     * @notice Create a token draw (simplified version)
     */
    function createTokenDraw(
        address tokenAddress,
        uint256 initialPrize,
        uint256 ticketPriceLYX,
        uint256 duration,
        uint256 minParticipants,
        uint256 maxParticipants
    ) external notBanned notBlacklisted returns (uint256 drawId) {
        require(tokenAddress != address(0), "Invalid token address");
        require(ticketPriceLYX > 0, "Ticket price must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP7;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.ticketPrice = ticketPriceLYX;
        draw.maxTickets = maxParticipants > 0 ? maxParticipants : 10000;
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
            participationFeePercent: 0,
            totalWinners: 1
        });
        
        // Add to active draws
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        emit TokenDrawCreated(drawId, msg.sender, tokenAddress, initialPrize);
        return drawId;
    }
    
    /**
     * @notice Get creator's accumulated token profit
     */
    function getCreatorTokenProfit(address creator, address token) external view returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        return l.creatorTokenProfit[creator][token];
    }
    
    /**
     * @notice Get owner's accumulated token profit
     */
    function getOwnerTokenProfit(address token) external view returns (uint256) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        return l.ownerTokenProfit[token];
    }
    
    /**
     * @notice Withdraw accumulated creator token profit
     */
    function withdrawCreatorTokenProfit(address token) external notPaused {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 profit = l.creatorTokenProfit[msg.sender][token];
        require(profit > 0, "No profit to withdraw");
        
        l.creatorTokenProfit[msg.sender][token] = 0;
        
        ILSP7DigitalAsset(token).transfer(address(this), msg.sender, profit, true, "");
        
        emit CreatorTokenProfitWithdrawn(msg.sender, token, profit);
    }
    
    /**
     * @notice Withdraw accumulated owner token profit
     */
    function withdrawOwnerTokenProfit(address token) external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 profit = l.ownerTokenProfit[token];
        require(profit > 0, "No profit to withdraw");
        
        l.ownerTokenProfit[token] = 0;
        
        ILSP7DigitalAsset(token).transfer(address(this), msg.sender, profit, true, "");
        
        emit OwnerTokenProfitWithdrawn(msg.sender, token, profit);
    }
}