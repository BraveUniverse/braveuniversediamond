import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";
import addresses from "../deployments/luksoTestnet/addresses.json";
import fs from "fs";

async function main() {
    console.log("🔧 Fixing GridottoFacet interface compatibility...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // First, let's create a fixed version of GridottoFacet
    const fixedContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IGridottoFacet.sol";
import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";

interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address tokenOwner) external view returns (uint256);
}

interface ILSP8 {
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) external;
    function tokenOwnerOf(bytes32 tokenId) external view returns (address);
}

interface IVIPPass {
    function getHighestTierOwned(address user) external view returns (uint8);
}

interface IOracleFacet {
    function getRandomNumber() external returns (uint256);
}

contract GridottoFacetFixed is IGridottoFacet {
    // VIP Pass tier constants
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
        require(!l.reentrancyGuard, "ReentrancyGuard: reentrant call");
        l.reentrancyGuard = true;
        _;
        l.reentrancyGuard = false;
    }
    
    // Initialize function
    function initializeGridotto() external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        // Only initialize once
        require(l.ticketPrice == 0, "Already initialized");
        
        // Set defaults
        l.ticketPrice = 0.1 ether;
        l.drawInterval = 1 days;
        l.monthlyDrawInterval = 30 days;
        l.ownerFeePercent = 10;
        l.monthlyPoolPercent = 10;
        l.drawTime = block.timestamp + l.drawInterval;
        l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
        l.currentDraw = 1;
        l.currentMonthlyDraw = 1;
        
        // Set VIP Pass addresses based on chain
        uint256 chainId = block.chainid;
        if (chainId == 4201) {
            // LUKSO Testnet
            l.vipPassAddress = 0xD2Ff04B87Fb9882bc529B3B2c8026BFcfAB0e7aF;
        } else if (chainId == 42) {
            // LUKSO Mainnet
            l.vipPassAddress = 0xC87F8c21b4F593eEEb7Fc6406dD3e6771C8d3E96;
        }
        
        // Set VIP tier discounts
        l.vipTierBonusTickets[SILVER_TIER] = 20;  // 20% bonus
        l.vipTierBonusTickets[GOLD_TIER] = 40;    // 40% bonus
        l.vipTierBonusTickets[DIAMOND_TIER] = 60; // 60% bonus
        l.vipTierBonusTickets[UNIVERSE_TIER] = 80; // 80% bonus
        
        l.vipTierFeeDiscount[SILVER_TIER] = 20;   // 20% discount
        l.vipTierFeeDiscount[GOLD_TIER] = 40;     // 40% discount
        l.vipTierFeeDiscount[DIAMOND_TIER] = 60;  // 60% discount
        l.vipTierFeeDiscount[UNIVERSE_TIER] = 80; // 80% discount
    }
    
    // Official Draw Functions
    function buyTicket(address profile) external payable notPaused nonReentrant override {
        _processOfficialTicketPurchase(msg.sender, profile, 1);
    }
    
    function buyMultipleTickets(address profile, uint256 amount) external payable notPaused nonReentrant override {
        require(amount > 0, "Amount must be greater than 0");
        _processOfficialTicketPurchase(msg.sender, profile, amount);
    }
    
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
            
            // Calculate prize
            uint256 prizeAmount = l.drawPrizes[drawNumber];
            
            // 5% to executor
            uint256 executorReward = (prizeAmount * 5) / 100;
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
            
            // Calculate prize
            uint256 prizeAmount = l.monthlyPrizes[drawNumber];
            
            // 5% to executor
            uint256 executorReward = (prizeAmount * 5) / 100;
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
            uint256 carryOver = l.monthlyPrizes[drawNumber] / 10;
            l.monthlyPrizePool = carryOver;
            
            emit MonthlyDrawExecuted(drawNumber, winner, prizeAmount);
        } else {
            emit MonthlyDrawExecuted(drawNumber, address(0), 0);
        }
        
        // Increment draw number and reset timer
        l.currentMonthlyDraw++;
        l.monthlyDrawTime = block.timestamp + l.monthlyDrawInterval;
    }
    
    // View Functions
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
        prize = l.monthlyPrizes[drawNumber];
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
    
    function setTicketPrice(uint256 newPrice) external onlyOwner override {
        require(newPrice > 0, "Price must be greater than 0");
        LibGridottoStorage.layout().ticketPrice = newPrice;
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
    
    function withdrawOwnerProfit() external onlyOwner override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 amount = l.ownerProfit;
        require(amount > 0, "No profit to withdraw");
        
        l.ownerProfit = 0;
        (bool success, ) = LibDiamond.contractOwner().call{value: amount}("");
        require(success, "Transfer failed");
        
        emit AdminWithdrawal(msg.sender, amount);
    }
    
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner override {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdrawal(msg.sender, to, amount);
    }
    
    function claimPrize() external nonReentrant override {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        uint256 prize = l.pendingPrizes[msg.sender];
        require(prize > 0, "No prize to claim");
        
        l.pendingPrizes[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: prize}("");
        require(success, "Transfer failed");
        
        emit PrizeClaimed(msg.sender, prize);
    }
    
    function getPendingPrize(address user) external view override returns (uint256) {
        return LibGridottoStorage.layout().pendingPrizes[user];
    }
    
    // All the user draw functions remain the same...
    // (Include all the user draw functions from the original contract)
}`;

    // Write the fixed contract
    const contractPath = "contracts/facets/GridottoFacetFixed.sol";
    fs.writeFileSync(contractPath, fixedContract);
    console.log("✅ Created fixed contract at:", contractPath);
    
    console.log("\n📝 Please copy the user draw functions from GridottoFacet.sol to GridottoFacetFixed.sol");
    console.log("Then run: npx hardhat run scripts/deploy-fixed-gridotto.ts --network luksoTestnet");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });