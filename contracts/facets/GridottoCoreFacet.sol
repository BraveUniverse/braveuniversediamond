// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageSimple.sol";
import "../libs/LibDiamond.sol";

contract GridottoCoreFacet {
    using LibGridottoStorageSimple for LibGridottoStorageSimple.Layout;
    
    // Events
    event DrawCreated(uint256 indexed drawId, address indexed creator, LibGridottoStorageSimple.DrawType drawType);
    event TicketsPurchased(uint256 indexed drawId, address indexed buyer, uint256 amount);
    event DrawCancelled(uint256 indexed drawId);
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorageSimple.layout().paused, "System paused");
        _;
    }
    
    // ============ Draw Creation Functions ============
    
    function createLYXDraw(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 platformFeePercent
    ) external payable notPaused returns (uint256 drawId) {
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 60 && duration <= 30 days, "Invalid duration"); // Changed to 60 seconds for testing
        require(platformFeePercent <= 2000, "Fee too high"); // Max 20%
        
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        drawId = ++s.nextDrawId;
        
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageSimple.DrawType.USER_LYX;
        draw.config = LibGridottoStorageSimple.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            duration: duration,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.creatorContribution = msg.value;
        draw.prizePool = msg.value;
        
        s.totalDrawsCreated++;
        s.userDrawsCreated[msg.sender]++;
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageSimple.DrawType.USER_LYX);
    }
    
    function createTokenDraw(
        address tokenAddress,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 minParticipants,
        uint256 platformFeePercent,
        uint256 initialPrize
    ) external notPaused returns (uint256 drawId) {
        require(tokenAddress != address(0), "Invalid token");
        require(ticketPrice > 0, "Invalid ticket price");
        require(maxTickets > 0, "Invalid max tickets");
        require(duration >= 60 && duration <= 30 days, "Invalid duration"); // Changed to 60 seconds for testing
        require(platformFeePercent <= 2000, "Fee too high");
        
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        drawId = ++s.nextDrawId;
        
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorageSimple.DrawType.USER_LSP7;
        draw.tokenAddress = tokenAddress;
        draw.config = LibGridottoStorageSimple.DrawConfig({
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            duration: duration,
            minParticipants: minParticipants,
            platformFeePercent: platformFeePercent
        });
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        
        if (initialPrize > 0) {
            ILSP7(tokenAddress).transfer(msg.sender, address(this), initialPrize, true, "");
            draw.creatorContribution = initialPrize;
            draw.prizePool = initialPrize;
        }
        
        s.totalDrawsCreated++;
        s.userDrawsCreated[msg.sender]++;
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorageSimple.DrawType.USER_LSP7);
    }
    
    // ============ Ticket Purchase Functions ============
    
    function buyTickets(uint256 drawId, uint256 amount) external payable notPaused {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Draw ended");
        require(block.timestamp >= draw.startTime, "Not started");
        require(block.timestamp < draw.endTime, "Draw ended");
        require(amount > 0, "Invalid amount");
        require(draw.ticketsSold + amount <= draw.config.maxTickets, "Exceeds max");
        
        uint256 totalCost = draw.config.ticketPrice * amount;
        
        if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
            require(msg.value >= totalCost, "Insufficient payment");
            draw.prizePool += totalCost;
            
            // Refund excess
            if (msg.value > totalCost) {
                (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
                require(success, "Refund failed");
            }
        } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
            ILSP7(draw.tokenAddress).transfer(msg.sender, address(this), totalCost, true, "");
            draw.prizePool += totalCost;
        }
        
        // Update participant data
        if (!draw.hasParticipated[msg.sender]) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
        }
        draw.ticketCount[msg.sender] += amount;
        draw.ticketsSold += amount;
        
        // Update global stats
        s.totalTicketsSold += amount;
        s.userTotalTickets[msg.sender] += amount;
        s.userTotalSpent[msg.sender] += totalCost;
        
        emit TicketsPurchased(drawId, msg.sender, amount);
    }
    
    function getTicketCost(uint256 drawId, uint256 amount) external view returns (uint256) {
        LibGridottoStorageSimple.Draw storage draw = LibGridottoStorageSimple.layout().draws[drawId];
        require(draw.creator != address(0), "Draw not found");
        return draw.config.ticketPrice * amount;
    }
    
    // ============ View Functions ============
    
    struct DrawDetails {
        address creator;
        LibGridottoStorageSimple.DrawType drawType;
        address tokenAddress;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        uint256 prizePool;
        uint256 startTime;
        uint256 endTime;
        uint256 minParticipants;
        uint256 platformFeePercent;
        bool isCompleted;
        bool isCancelled;
        uint256 participantCount;
    }
    
    function getDrawDetails(uint256 drawId) external view returns (DrawDetails memory) {
        LibGridottoStorageSimple.Draw storage draw = LibGridottoStorageSimple.layout().draws[drawId];
        require(draw.creator != address(0), "Draw not found");
        
        return DrawDetails({
            creator: draw.creator,
            drawType: draw.drawType,
            tokenAddress: draw.tokenAddress,
            ticketPrice: draw.config.ticketPrice,
            maxTickets: draw.config.maxTickets,
            ticketsSold: draw.ticketsSold,
            prizePool: draw.prizePool,
            startTime: draw.startTime,
            endTime: draw.endTime,
            minParticipants: draw.config.minParticipants,
            platformFeePercent: draw.config.platformFeePercent,
            isCompleted: draw.isCompleted,
            isCancelled: draw.isCancelled,
            participantCount: draw.participants.length
        });
    }
    
    function getUserTickets(uint256 drawId, address user) external view returns (uint256) {
        return LibGridottoStorageSimple.layout().draws[drawId].ticketCount[user];
    }
    
    function getActiveDraws() external view returns (uint256[] memory) {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        uint256[] memory activeDraws = new uint256[](s.nextDrawId);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= s.nextDrawId; i++) {
            LibGridottoStorageSimple.Draw storage draw = s.draws[i];
            if (draw.creator != address(0) && 
                !draw.isCompleted && 
                !draw.isCancelled && 
                block.timestamp < draw.endTime) {
                activeDraws[count++] = i;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeDraws[i];
        }
        
        return result;
    }
    
    function getDrawParticipants(uint256 drawId) external view returns (address[] memory) {
        return LibGridottoStorageSimple.layout().draws[drawId].participants;
    }
    
    // ============ Cancel Function ============
    
    function cancelDraw(uint256 drawId) external {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        
        require(draw.creator == msg.sender || msg.sender == LibDiamond.contractOwner(), "Not authorized");
        require(!draw.isCompleted && !draw.isCancelled, "Invalid state");
        
        draw.isCancelled = true;
        
        // Refund all participants
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 tickets = draw.ticketCount[participant];
            if (tickets > 0) {
                uint256 refund = draw.config.ticketPrice * tickets;
                
                if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
                    (bool success, ) = participant.call{value: refund}("");
                    require(success, "Refund failed");
                } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
                    ILSP7(draw.tokenAddress).transfer(address(this), participant, refund, true, "");
                }
            }
        }
        
        // Refund creator contribution
        if (draw.creatorContribution > 0) {
            if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
                (bool success, ) = draw.creator.call{value: draw.creatorContribution}("");
                require(success, "Creator refund failed");
            } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
                ILSP7(draw.tokenAddress).transfer(address(this), draw.creator, draw.creatorContribution, true, "");
            }
        }
        
        emit DrawCancelled(drawId);
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address account) external view returns (uint256);
}