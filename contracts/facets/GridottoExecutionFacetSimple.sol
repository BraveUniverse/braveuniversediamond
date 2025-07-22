// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageSimple.sol";
import "../libs/LibDiamond.sol";

contract GridottoExecutionFacetSimple {
    using LibGridottoStorageSimple for LibGridottoStorageSimple.Layout;
    
    // Events
    event DrawExecuted(uint256 indexed drawId, address indexed executor, address[] winners);
    event PrizeClaimed(uint256 indexed drawId, address indexed winner, uint256 amount);
    
    // Modifiers
    modifier notPaused() {
        require(!LibGridottoStorageSimple.layout().paused, "System paused");
        _;
    }
    
    // ============ Execution Functions ============
    
    function executeDraw(uint256 drawId) external notPaused {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Invalid state");
        require(block.timestamp >= draw.endTime, "Not ended");
        require(draw.participants.length >= draw.config.minParticipants, "Not enough participants");
        
        draw.isCompleted = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // Calculate platform fee
        uint256 platformFee = (draw.prizePool * draw.config.platformFeePercent) / 10000;
        uint256 executorFee = platformFee / 10; // 10% of platform fee goes to executor
        uint256 netPlatformFee = platformFee - executorFee;
        uint256 winnerPrize = draw.prizePool - platformFee;
        
        // Update platform fees
        if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
            s.platformFeesLYX += netPlatformFee;
        } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
            s.platformFeesToken[draw.tokenAddress] += netPlatformFee;
        }
        
        // Select winner
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, drawId)));
        uint256 winnerIndex = randomSeed % draw.ticketsSold;
        
        // Find winner based on ticket index
        uint256 ticketCounter = 0;
        address winner;
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 userTickets = draw.ticketCount[participant];
            if (ticketCounter + userTickets > winnerIndex) {
                winner = participant;
                break;
            }
            ticketCounter += userTickets;
        }
        
        // Set winner
        draw.winners.push(winner);
        draw.winnerAmounts.push(winnerPrize);
        
        // Update stats
        s.totalExecutions++;
        s.totalPrizesDistributed += winnerPrize;
        s.userDrawsExecuted[msg.sender]++;
        s.userExecutionFees[msg.sender] += executorFee;
        s.userTotalWins[winner]++;
        s.userTotalWinnings[winner] += winnerPrize;
        
        // Pay executor fee
        if (executorFee > 0) {
            if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
                (bool success, ) = msg.sender.call{value: executorFee}("");
                require(success, "Executor fee failed");
            } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
                ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, executorFee, true, "");
            }
        }
        
        emit DrawExecuted(drawId, msg.sender, draw.winners);
    }
    
    function claimPrize(uint256 drawId) external notPaused {
        LibGridottoStorageSimple.Layout storage s = LibGridottoStorageSimple.layout();
        LibGridottoStorageSimple.Draw storage draw = s.draws[drawId];
        
        require(draw.isCompleted, "Draw not completed");
        require(!draw.hasClaimed[msg.sender], "Already claimed");
        
        // Find winner amount
        uint256 prizeAmount = 0;
        bool isWinner = false;
        for (uint256 i = 0; i < draw.winners.length; i++) {
            if (draw.winners[i] == msg.sender) {
                prizeAmount = draw.winnerAmounts[i];
                isWinner = true;
                break;
            }
        }
        
        require(isWinner, "Not a winner");
        require(prizeAmount > 0, "No prize");
        
        draw.hasClaimed[msg.sender] = true;
        
        // Transfer prize
        if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LYX) {
            (bool success, ) = msg.sender.call{value: prizeAmount}("");
            require(success, "Prize transfer failed");
        } else if (draw.drawType == LibGridottoStorageSimple.DrawType.USER_LSP7) {
            ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, prizeAmount, true, "");
        }
        
        emit PrizeClaimed(drawId, msg.sender, prizeAmount);
    }
    
    // ============ View Functions ============
    
    function canExecuteDraw(uint256 drawId) external view returns (bool) {
        LibGridottoStorageSimple.Draw storage draw = LibGridottoStorageSimple.layout().draws[drawId];
        return draw.creator != address(0) &&
               !draw.isCompleted &&
               !draw.isCancelled &&
               block.timestamp >= draw.endTime &&
               draw.participants.length >= draw.config.minParticipants;
    }
    
    function getDrawWinners(uint256 drawId) external view returns (address[] memory winners, uint256[] memory amounts) {
        LibGridottoStorageSimple.Draw storage draw = LibGridottoStorageSimple.layout().draws[drawId];
        return (draw.winners, draw.winnerAmounts);
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}