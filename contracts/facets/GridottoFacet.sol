// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* GridottoFacet - Lottery/Draw game functionality for BraveUniverse
* Implements draw-based lottery system with monthly prizes
/******************************************************************************/

import {LibDiamond} from "../libs/LibDiamond.sol";

/// @title GridottoFacet
/// @author BraveUniverse Team
/// @notice Facet implementing lottery/draw game functionality
/// @dev This facet handles lottery draws, prizes, and ticket management
contract GridottoFacet {
    
    /// @notice Draw information structure
    struct DrawInfo {
        uint256 drawId;
        uint256 endTime;
        uint256 totalPrize;
        uint256 participantCount;
        bool isActive;
        address winner;
    }

    /// @notice User draw participation structure
    struct UserDraw {
        uint256 drawId;
        uint256 ticketCount;
        uint256 purchaseTime;
        bool isActive;
    }

    /// @notice Storage structure for Gridotto facet
    struct GridottoStorage {
        uint256 currentDrawId;
        uint256 ticketPrice;
        uint256 monthlyPrize;
        mapping(uint256 => DrawInfo) draws;
        mapping(address => UserDraw[]) userDraws;
        mapping(uint256 => address[]) drawParticipants;
        uint256 totalRevenue;
    }

    /// @notice Storage slot for Gridotto facet
    bytes32 internal constant GRIDOTTO_STORAGE_SLOT = keccak256("gridotto.storage");

    /// @notice Events
    event DrawCreated(uint256 indexed drawId, uint256 endTime, uint256 prize);
    event TicketPurchased(address indexed user, uint256 indexed drawId, uint256 ticketCount);
    event DrawFinalized(uint256 indexed drawId, address indexed winner, uint256 prize);
    event PrizeUpdated(uint256 newMonthlyPrize);

    /// @notice Custom errors
    error NotAuthorized();
    error DrawNotActive();
    error InvalidTicketCount();
    error InsufficientPayment();
    error DrawNotFound();

    /// @notice Modifier to check ownership
    modifier onlyOwner() {
        if (msg.sender != LibDiamond.contractOwner()) revert NotAuthorized();
        _;
    }

    /// @notice Get gridotto storage
    function gridottoStorage() internal pure returns (GridottoStorage storage gs) {
        bytes32 slot = GRIDOTTO_STORAGE_SLOT;
        assembly {
            gs.slot := slot
        }
    }

    /// @notice Initialize gridotto system
    /// @param _ticketPrice Initial ticket price in wei
    /// @param _monthlyPrize Initial monthly prize in wei
    function initializeGridotto(uint256 _ticketPrice, uint256 _monthlyPrize) external onlyOwner {
        GridottoStorage storage gs = gridottoStorage();
        gs.ticketPrice = _ticketPrice;
        gs.monthlyPrize = _monthlyPrize;
        
        // Create first draw
        _createNewDraw();
    }

    /// @notice Get current draw information
    /// @return Current draw details
    function getDrawInfo() external view returns (DrawInfo memory) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.draws[gs.currentDrawId];
    }

    /// @notice Get current draw prize
    /// @return Current prize amount in wei
    function getCurrentDrawPrize() external view returns (uint256) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.draws[gs.currentDrawId].totalPrize;
    }

    /// @notice Get monthly prize amount
    /// @return Monthly prize in wei
    function getMonthlyPrize() external view returns (uint256) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.monthlyPrize;
    }

    /// @notice Get ticket price
    /// @return Ticket price in wei
    function getTicketPrice() external view returns (uint256) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.ticketPrice;
    }

    /// @notice Get active user draws
    /// @param user User address to query
    /// @return Array of active user draws
    function getActiveUserDraws(address user) external view returns (UserDraw[] memory) {
        GridottoStorage storage gs = gridottoStorage();
        UserDraw[] memory allDraws = gs.userDraws[user];
        
        // Count active draws
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allDraws.length; i++) {
            if (allDraws[i].isActive) {
                activeCount++;
            }
        }
        
        // Create active draws array
        UserDraw[] memory activeDraws = new UserDraw[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allDraws.length; i++) {
            if (allDraws[i].isActive) {
                activeDraws[index] = allDraws[i];
                index++;
            }
        }
        
        return activeDraws;
    }

    /// @notice Get official draw information by ID
    /// @param drawId Draw ID to query
    /// @return Draw information
    function getOfficialDrawInfo(uint256 drawId) external view returns (DrawInfo memory) {
        GridottoStorage storage gs = gridottoStorage();
        if (drawId > gs.currentDrawId) revert DrawNotFound();
        return gs.draws[drawId];
    }

    /// @notice Purchase tickets for current draw
    /// @param ticketCount Number of tickets to purchase
    function purchaseTickets(uint256 ticketCount) external payable {
        if (ticketCount == 0) revert InvalidTicketCount();
        
        GridottoStorage storage gs = gridottoStorage();
        DrawInfo storage currentDraw = gs.draws[gs.currentDrawId];
        
        if (!currentDraw.isActive || block.timestamp >= currentDraw.endTime) {
            revert DrawNotActive();
        }
        
        uint256 totalCost = ticketCount * gs.ticketPrice;
        if (msg.value < totalCost) revert InsufficientPayment();
        
        // Add to user draws
        gs.userDraws[msg.sender].push(UserDraw({
            drawId: gs.currentDrawId,
            ticketCount: ticketCount,
            purchaseTime: block.timestamp,
            isActive: true
        }));
        
        // Add to draw participants
        gs.drawParticipants[gs.currentDrawId].push(msg.sender);
        
        // Update draw info
        currentDraw.participantCount += 1;
        currentDraw.totalPrize += totalCost;
        
        // Update total revenue
        gs.totalRevenue += totalCost;
        
        emit TicketPurchased(msg.sender, gs.currentDrawId, ticketCount);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }

    /// @notice Finalize current draw and select winner
    function finalizeDraw() external onlyOwner {
        GridottoStorage storage gs = gridottoStorage();
        DrawInfo storage currentDraw = gs.draws[gs.currentDrawId];
        
        require(block.timestamp >= currentDraw.endTime, "Draw not ended yet");
        require(currentDraw.isActive, "Draw already finalized");
        
        currentDraw.isActive = false;
        
        // Select winner if there are participants
        if (currentDraw.participantCount > 0) {
            address[] memory participants = gs.drawParticipants[gs.currentDrawId];
            uint256 winnerIndex = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                participants.length
            ))) % participants.length;
            
            currentDraw.winner = participants[winnerIndex];
            
            // Transfer prize to winner
            if (currentDraw.totalPrize > 0) {
                payable(currentDraw.winner).transfer(currentDraw.totalPrize);
            }
            
            emit DrawFinalized(gs.currentDrawId, currentDraw.winner, currentDraw.totalPrize);
        }
        
        // Create new draw
        _createNewDraw();
    }

    /// @notice Update monthly prize (owner only)
    /// @param newMonthlyPrize New monthly prize amount
    function updateMonthlyPrize(uint256 newMonthlyPrize) external onlyOwner {
        GridottoStorage storage gs = gridottoStorage();
        gs.monthlyPrize = newMonthlyPrize;
        emit PrizeUpdated(newMonthlyPrize);
    }

    /// @notice Update ticket price (owner only)
    /// @param newTicketPrice New ticket price
    function updateTicketPrice(uint256 newTicketPrice) external onlyOwner {
        GridottoStorage storage gs = gridottoStorage();
        gs.ticketPrice = newTicketPrice;
    }

    /// @notice Internal function to create new draw
    function _createNewDraw() internal {
        GridottoStorage storage gs = gridottoStorage();
        gs.currentDrawId++;
        
        gs.draws[gs.currentDrawId] = DrawInfo({
            drawId: gs.currentDrawId,
            endTime: block.timestamp + 7 days, // 1 week duration
            totalPrize: gs.monthlyPrize, // Start with monthly prize
            participantCount: 0,
            isActive: true,
            winner: address(0)
        });
        
        emit DrawCreated(gs.currentDrawId, gs.draws[gs.currentDrawId].endTime, gs.monthlyPrize);
    }

    /// @notice Get total revenue generated
    /// @return Total revenue in wei
    function getTotalRevenue() external view returns (uint256) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.totalRevenue;
    }

    /// @notice Get current draw ID
    /// @return Current draw ID
    function getCurrentDrawId() external view returns (uint256) {
        GridottoStorage storage gs = gridottoStorage();
        return gs.currentDrawId;
    }

    /// @notice Withdraw contract balance (owner only)
    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(LibDiamond.contractOwner()).transfer(balance);
        }
    }
}