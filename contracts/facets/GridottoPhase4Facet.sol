// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibAdminStorage.sol";
import "../libs/LibDiamond.sol";
import "../interfaces/IGridottoFacet.sol";
import "../interfaces/ILSP7DigitalAsset.sol";
import "../interfaces/ILSP8IdentifiableDigitalAsset.sol";
import "../interfaces/ILSP26FollowerSystem.sol";

contract GridottoPhase4Facet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    using LibAdminStorage for LibAdminStorage.AdminLayout;
    
    // Events
    event AdvancedDrawCreated(
        uint256 indexed drawId,
        address indexed creator,
        LibGridottoStorage.DrawType drawType,
        LibGridottoStorage.PrizeModel prizeModel,
        uint256 totalWinners
    );
    
    // Modifiers
    modifier notBanned() {
        require(!LibAdminStorage.isBanned(msg.sender), "User is banned");
        _;
    }
    
    modifier notBlacklisted() {
        require(!LibAdminStorage.isBlacklisted(msg.sender), "User is blacklisted");
        _;
    }
    
    // Phase 4: Advanced Multi-Winner Draw
    function createAdvancedDraw(
        LibGridottoStorage.DrawType drawType,
        IGridottoFacet.AdvancedDrawConfig calldata config
    ) external payable notBanned notBlacklisted returns (uint256 drawId) {
        require(config.ticketPrice > 0, "Ticket price must be greater than 0");
        require(config.duration >= 1 hours && config.duration <= 30 days, "Invalid duration");
        require(config.maxTickets > 0 && config.maxTickets <= 100000, "Invalid max tickets");
        require(config.prizeConfig.totalWinners > 0 && config.prizeConfig.totalWinners <= 100, "Invalid winner count");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        drawId = l.nextDrawId++;
        
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        draw.creator = msg.sender;
        draw.drawType = drawType;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + config.duration;
        draw.ticketPrice = config.ticketPrice;
        draw.maxTickets = config.maxTickets;
        draw.minParticipants = config.minParticipants;
        draw.requirement = config.requirement;
        draw.requiredToken = config.requiredToken;
        draw.minTokenAmount = config.minTokenAmount;
        draw.prizeConfig = config.prizeConfig;
        
        // LSP26 requirements (mainnet only)
        if (config.lsp26Config.requireFollowing) {
            draw.lsp26Config = config.lsp26Config;
        }
        
        // Handle prize based on draw type
        if (drawType == LibGridottoStorage.DrawType.USER_LYX) {
            require(msg.value >= config.initialPrize, "Insufficient initial prize");
            draw.initialPrize = config.initialPrize;
            draw.currentPrize = config.initialPrize;
            
            // Refund excess
            if (msg.value > config.initialPrize) {
                (bool success, ) = msg.sender.call{value: msg.value - config.initialPrize}("");
                require(success, "Refund failed");
            }
        } else if (drawType == LibGridottoStorage.DrawType.USER_LSP7) {
            require(config.tokenAddress != address(0), "Invalid token address");
            require(config.initialPrize > 0, "Initial prize required");
            
            draw.tokenAddress = config.tokenAddress;
            draw.initialPrize = config.initialPrize;
            draw.currentPrize = config.initialPrize;
            
            // Transfer initial tokens
            ILSP7DigitalAsset(config.tokenAddress).transfer(
                msg.sender,
                address(this),
                config.initialPrize,
                true,
                ""
            );
        } else if (drawType == LibGridottoStorage.DrawType.USER_LSP8) {
            require(config.nftContract != address(0), "Invalid NFT contract");
            require(config.nftTokenIds.length > 0, "No NFTs provided");
            
            draw.nftContract = config.nftContract;
            draw.nftTokenIds = config.nftTokenIds;
            draw.initialPrize = msg.value; // LYX prize for NFT draws
            draw.currentPrize = msg.value;
            
            // Transfer NFTs
            ILSP8IdentifiableDigitalAsset nft = ILSP8IdentifiableDigitalAsset(config.nftContract);
            for (uint256 i = 0; i < config.nftTokenIds.length; i++) {
                nft.transfer(msg.sender, address(this), config.nftTokenIds[i], true, "");
            }
        }
        
        // Handle tier configuration
        if (config.prizeConfig.model == LibGridottoStorage.PrizeModel.TIERED_PERCENTAGE || 
            config.prizeConfig.model == LibGridottoStorage.PrizeModel.TIERED_FIXED) {
            require(config.tiers.length == config.prizeConfig.totalWinners, "Tier count mismatch");
            
            uint256 totalPercent = 0;
            for (uint256 i = 0; i < config.tiers.length; i++) {
                l.drawTiers[drawId].push(config.tiers[i]);
                
                if (config.prizeConfig.model == LibGridottoStorage.PrizeModel.TIERED_PERCENTAGE) {
                    totalPercent += config.tiers[i].prizePercentage;
                }
                
                // Handle NFT tier assignments
                if (drawType == LibGridottoStorage.DrawType.USER_LSP8 && config.tiers[i].nftTokenId != bytes32(0)) {
                    l.tierNFTAssignments[drawId][i + 1] = config.tiers[i].nftTokenId;
                }
            }
            
            if (config.prizeConfig.model == LibGridottoStorage.PrizeModel.TIERED_PERCENTAGE) {
                require(totalPercent == 100, "Percentages must sum to 100");
            }
        }
        
        l.activeUserDraws.push(drawId);
        l.userCreatedDraws[msg.sender].push(drawId);
        
        // Update stats
        LibAdminStorage.updateUserStats(msg.sender, true, false, false, 0, 0);
        
        emit AdvancedDrawCreated(drawId, msg.sender, drawType, config.prizeConfig.model, config.prizeConfig.totalWinners);
        return drawId;
    }
    
    // Get tier information
    function getDrawTiers(uint256 drawId) external view returns (LibGridottoStorage.TierConfig[] memory) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        return l.drawTiers[drawId];
    }
    
    // Get NFT tier assignments
    function getTierNFTAssignment(uint256 drawId, uint256 tier) external view returns (bytes32) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        return l.tierNFTAssignments[drawId][tier];
    }
}