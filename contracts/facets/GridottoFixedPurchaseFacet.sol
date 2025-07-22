// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";

/**
 * @title GridottoFixedPurchaseFacet
 * @notice Fixed ticket purchase functions that properly handle storage
 */
contract GridottoFixedPurchaseFacet {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    event TicketsPurchased(
        uint256 indexed drawId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );
    
    /**
     * @notice Buy tickets for a user draw with fixed storage handling
     * @param drawId The ID of the draw
     * @param amount Number of tickets to buy
     */
    function buyTicketsFixed(uint256 drawId, uint256 amount) external payable {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        // Validation
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw cancelled");
        require(amount > 0, "Amount must be greater than 0");
        
        // Time validation - using proper storage fields
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
     * @notice Buy tickets for multiple draws in one transaction
     * @param drawIds Array of draw IDs
     * @param amounts Array of ticket amounts for each draw
     */
    function buyMultipleDrawsFixed(
        uint256[] calldata drawIds,
        uint256[] calldata amounts
    ) external payable {
        require(drawIds.length == amounts.length, "Array length mismatch");
        require(drawIds.length > 0, "Empty arrays");
        
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 totalCost = 0;
        uint256 currentTime = block.timestamp;
        
        // Validate all draws first
        for (uint256 i = 0; i < drawIds.length; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[drawIds[i]];
            
            require(draw.creator != address(0), "Draw does not exist");
            require(!draw.isCompleted, "Draw already completed");
            require(!draw.isCancelled, "Draw cancelled");
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(currentTime >= draw.startTime, "Draw not started");
            require(currentTime < draw.endTime, "Draw ended");
            require(draw.ticketsSold + amounts[i] <= draw.maxTickets, "Exceeds max tickets");
            
            totalCost += draw.ticketPrice * amounts[i];
        }
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Process purchases
        for (uint256 i = 0; i < drawIds.length; i++) {
            LibGridottoStorage.UserDraw storage draw = l.userDraws[drawIds[i]];
            uint256 amount = amounts[i];
            uint256 drawCost = draw.ticketPrice * amount;
            
            // Update draw state
            draw.ticketsSold += amount;
            draw.currentPrizePool += drawCost;
            
            // Track user participation
            if (draw.userTickets[msg.sender] == 0) {
                draw.participants.push(msg.sender);
                draw.hasParticipated[msg.sender] = true;
            }
            draw.userTickets[msg.sender] += amount;
            
            emit TicketsPurchased(drawIds[i], msg.sender, amount, drawCost);
        }
        
        // Refund excess payment
        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @notice Get ticket purchase cost for multiple tickets
     * @param drawId The ID of the draw
     * @param amount Number of tickets
     * @return totalCost Total cost in wei
     */
    function getTicketCost(uint256 drawId, uint256 amount) external view returns (uint256 totalCost) {
        LibGridottoStorage.UserDraw storage draw = LibGridottoStorage.layout().userDraws[drawId];
        require(draw.creator != address(0), "Draw does not exist");
        
        totalCost = draw.ticketPrice * amount;
    }
}