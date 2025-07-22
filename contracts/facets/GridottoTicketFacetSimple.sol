// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoTicketFacetSimple
 * @notice Simplified ticket purchase operations
 */
contract GridottoTicketFacetSimple {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event TicketsPurchased(
        uint256 indexed drawId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );
    
    // Modifiers
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    /**
     * @notice Buy tickets for a LYX draw
     * @param drawId The ID of the draw
     * @param amount Number of tickets to buy
     */
    function buyUserDrawTicket(uint256 drawId, uint256 amount) external payable notPaused {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        // Validation
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw cancelled");
        require(amount > 0, "Amount must be greater than 0");
        
        // Time validation
        uint256 currentTime = block.timestamp;
        require(currentTime >= draw.startTime, "Draw not started");
        require(currentTime < draw.endTime, "Draw ended");
        
        // Ticket availability
        require(draw.ticketsSold + amount <= draw.maxTickets, "Exceeds max tickets");
        
        // Payment validation
        uint256 totalCost = draw.ticketPrice * amount;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Update draw state
        draw.ticketsSold += amount;
        draw.currentPrizePool += totalCost;
        
        // Track user participation
        if (draw.userTickets[msg.sender] == 0) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
        }
        draw.userTickets[msg.sender] += amount;
        
        // Refund excess payment
        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
        
        emit TicketsPurchased(drawId, msg.sender, amount, totalCost);
    }
    
    /**
     * @notice Buy tickets for a token draw
     * @param drawId The ID of the draw
     * @param amount Number of tickets to buy
     */
    function buyTokenDrawTicket(uint256 drawId, uint256 amount) external notPaused {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        // Validation
        require(draw.creator != address(0), "Draw does not exist");
        require(draw.drawType == LibGridottoStorage.DrawType.USER_LSP7, "Not a token draw");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw cancelled");
        require(amount > 0, "Amount must be greater than 0");
        
        // Time validation
        uint256 currentTime = block.timestamp;
        require(currentTime >= draw.startTime, "Draw not started");
        require(currentTime < draw.endTime, "Draw ended");
        
        // Ticket availability
        require(draw.ticketsSold + amount <= draw.maxTickets, "Exceeds max tickets");
        
        // Payment handling
        uint256 totalCost = draw.ticketPrice * amount;
        ILSP7 token = ILSP7(draw.prizeToken);
        
        uint256 balanceBefore = token.balanceOf(address(this));
        token.transfer(msg.sender, address(this), totalCost, true, "");
        uint256 balanceAfter = token.balanceOf(address(this));
        
        require(balanceAfter >= balanceBefore + totalCost, "Token transfer failed");
        
        // Update draw state
        draw.ticketsSold += amount;
        draw.currentPrizePool += totalCost;
        
        // Track user participation
        if (draw.userTickets[msg.sender] == 0) {
            draw.participants.push(msg.sender);
            draw.hasParticipated[msg.sender] = true;
        }
        draw.userTickets[msg.sender] += amount;
        
        emit TicketsPurchased(drawId, msg.sender, amount, totalCost);
    }
    
    /**
     * @notice Get ticket purchase cost for multiple tickets
     * @param drawId The ID of the draw
     * @param amount Number of tickets
     * @return totalCost Total cost in draw's currency
     */
    function getTicketCost(uint256 drawId, uint256 amount) external view returns (uint256 totalCost) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        require(draw.creator != address(0), "Draw does not exist");
        
        totalCost = draw.ticketPrice * amount;
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address account) external view returns (uint256);
}