# Facet: GridottoFacet

## Purpose
GridottoFacet implements a lottery/draw game system for the BraveUniverse ecosystem. It provides functionality for ticket-based draws with prize pools, participant management, and automated winner selection. Users can purchase tickets for weekly draws, with prizes accumulating from ticket sales and monthly prize pools.

## Functions

### View Functions
- `getDrawInfo()` — Returns current draw information including ID, end time, total prize, participant count, and status
- `getCurrentDrawPrize()` — Returns the current draw's total prize amount in wei
- `getMonthlyPrize()` — Returns the monthly base prize amount in wei  
- `getTicketPrice()` — Returns the price per ticket in wei
- `getActiveUserDraws(address user)` — Returns array of active draws for a specific user
- `getOfficialDrawInfo(uint256 drawId)` — Returns official information for a specific draw by ID
- `getTotalRevenue()` — Returns total revenue generated from ticket sales
- `getCurrentDrawId()` — Returns the current active draw ID

### User Functions
- `purchaseTickets(uint256 ticketCount)` — Purchase tickets for the current draw (payable)

### Owner Functions
- `initializeGridotto(uint256 _ticketPrice, uint256 _monthlyPrize)` — Initialize the lottery system with ticket price and monthly prize
- `finalizeDraw()` — Finalize current draw, select winner, and create new draw
- `updateMonthlyPrize(uint256 newMonthlyPrize)` — Update the monthly base prize amount
- `updateTicketPrice(uint256 newTicketPrice)` — Update the ticket price
- `withdrawBalance()` — Withdraw contract balance (emergency function)

## Access Control
- **Public Access**: All view functions and `purchaseTickets()` can be called by anyone
- **Owner Only**: `initializeGridotto()`, `finalizeDraw()`, `updateMonthlyPrize()`, `updateTicketPrice()`, and `withdrawBalance()` are restricted to the contract owner
- **Access Control Pattern**: Uses LibDiamond.contractOwner() for ownership verification

## Storage
GridottoFacet uses a dedicated storage library pattern with slot `keccak256("gridotto.storage")`. The storage includes:
- Current draw ID and configuration
- Ticket price and monthly prize settings
- Draw information mapping (ID → DrawInfo)
- User draws mapping (address → UserDraw[])
- Draw participants mapping (ID → address[])
- Total revenue tracking

## Events
- `DrawCreated(uint256 indexed drawId, uint256 endTime, uint256 prize)` — Emitted when a new draw is created
- `TicketPurchased(address indexed user, uint256 indexed drawId, uint256 ticketCount)` — Emitted when tickets are purchased
- `DrawFinalized(uint256 indexed drawId, address indexed winner, uint256 prize)` — Emitted when a draw is finalized with winner
- `PrizeUpdated(uint256 newMonthlyPrize)` — Emitted when monthly prize is updated

## Examples

### Purchase Tickets
```solidity
// Purchase 3 tickets for current draw
uint256 ticketCount = 3;
uint256 ticketPrice = gridottoFacet.getTicketPrice();
uint256 totalCost = ticketPrice * ticketCount;

gridottoFacet.purchaseTickets{value: totalCost}(ticketCount);
```

### Check Draw Information
```solidity
// Get current draw details
GridottoFacet.DrawInfo memory drawInfo = gridottoFacet.getDrawInfo();
console.log("Draw ID:", drawInfo.drawId);
console.log("Prize Pool:", drawInfo.totalPrize);
console.log("Participants:", drawInfo.participantCount);
```

### Check User Participation
```solidity
// Check user's active draws
GridottoFacet.UserDraw[] memory userDraws = gridottoFacet.getActiveUserDraws(userAddress);
for (uint i = 0; i < userDraws.length; i++) {
    console.log("Draw:", userDraws[i].drawId, "Tickets:", userDraws[i].ticketCount);
}
```

## Deployment Information
- **Network**: LUKSO Testnet
- **Facet Address**: `0x280B1EF2F7729B18f7b46711bA5ED28be6e6163f`
- **Diamond Address**: `0xda142c5978D707E83618390F4f8796bD7eb3a790`
- **Initial Ticket Price**: 0.01 LYX
- **Initial Monthly Prize**: 10.0 LYX
- **Draw Duration**: 7 days per draw
- **Status**: BUILD_READY ✅