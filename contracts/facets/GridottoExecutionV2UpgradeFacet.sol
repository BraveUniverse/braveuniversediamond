// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "../libs/LibOracleStorage.sol";

/**
 * @title GridottoExecutionV2UpgradeFacet
 * @notice Upgraded execution to handle creator fees for NFT draws
 * @dev Works with upfront fee collection
 */
contract GridottoExecutionV2UpgradeFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    using LibOracleStorage for LibOracleStorage.Layout;
    
    event DrawExecuted(uint256 indexed drawId, address[] winners);
    event DrawCancelled(uint256 indexed drawId, string reason);
    
    modifier notPaused() {
        require(!LibGridottoStorageV2.layout().paused, "System paused");
        _;
    }
    
    /**
     * @notice Execute a draw and select winner
     * @dev For NFT draws, creator receives collected fees
     */
    function executeDraw(uint256 drawId) external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Already ended");
        require(block.timestamp >= draw.endTime, "Not ended yet");
        
        // Check minimum participants
        if (draw.participants.length < draw.config.minParticipants) {
            _cancelDraw(drawId, "Min participants not met");
            return;
        }
        
        // No tickets sold
        if (draw.ticketsSold == 0) {
            _cancelDraw(drawId, "No tickets sold");
            return;
        }
        
        // Select winner
        uint256 randomNumber = _getRandomNumber(drawId);
        address winner = _selectWinner(draw, randomNumber);
        
        // Mark as completed
        draw.isCompleted = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // The entire prize pool goes to winner (fees already deducted)
        uint256 winnerPrize = draw.prizePool;
        
        draw.winners.push(winner);
        draw.winnerAmounts.push(winnerPrize);
        
        // Add executor fee to claimable (already collected during ticket sales)
        if (draw.executorFeeCollected > 0) {
            s.claimableExecutorFees[msg.sender] += draw.executorFeeCollected;
        }
        
        // For NFT draws (USER_LSP8), transfer creator fee to creator
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 && draw.creatorFeeCollected > 0) {
            (bool success, ) = draw.creator.call{value: draw.creatorFeeCollected}("");
            require(success, "Creator fee transfer failed");
        }
        
        // Update stats
        s.totalExecutions++;
        if (winnerPrize > 0) {
            s.totalPrizesDistributed += winnerPrize;
            s.userTotalWins[winner]++;
            s.userTotalWinnings[winner] += winnerPrize;
        }
        s.userDrawsExecuted[msg.sender]++;
        s.userExecutionFees[msg.sender] += draw.executorFeeCollected;
        
        emit DrawExecuted(drawId, draw.winners);
    }
    
    // Cancel a draw
    function _cancelDraw(uint256 drawId, string memory reason) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        draw.isCancelled = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // Return collected fees to their pools (they were already separated)
        // Platform fees stay with platform
        // Monthly contributions stay in monthly pool
        // Only executor fee needs to be returned
        if (draw.executorFeeCollected > 0) {
            // Add to claimable for the cancelling executor
            s.claimableExecutorFees[msg.sender] += draw.executorFeeCollected;
        }
        
        // Creator fee stays with creator (non-refundable)
        
        emit DrawCancelled(drawId, reason);
    }
    
    // Select winner based on tickets
    function _selectWinner(LibGridottoStorageV2.Draw storage draw, uint256 randomNumber) private view returns (address) {
        uint256 winningTicket = randomNumber % draw.ticketsSold;
        uint256 currentTicket = 0;
        
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 tickets = draw.ticketCount[participant];
            
            if (currentTicket + tickets > winningTicket) {
                return participant;
            }
            currentTicket += tickets;
        }
        
        // Fallback (should never reach here)
        return draw.participants[0];
    }
    
    // Get random number
    function _getRandomNumber(uint256 drawId) private view returns (uint256) {
        LibOracleStorage.Layout storage oracle = LibOracleStorage.layout();
        
        if (oracle.useBackupRandomness || oracle.oracleAddress == address(0)) {
            // Use block.prevrandao as backup
            return uint256(keccak256(abi.encodePacked(block.prevrandao, drawId, block.timestamp)));
        } else {
            // Use oracle (would need to implement oracle call)
            return uint256(keccak256(abi.encodePacked(block.prevrandao, drawId, msg.sender)));
        }
    }
    
    // Check if draw can be executed
    function canExecuteDraw(uint256 drawId) external view returns (bool) {
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        
        return draw.creator != address(0) &&
               !draw.isCompleted &&
               !draw.isCancelled &&
               block.timestamp >= draw.endTime &&
               draw.participants.length >= draw.config.minParticipants &&
               draw.ticketsSold > 0;
    }
    
    // Force execute (admin only)
    function forceExecuteDraw(uint256 drawId) external {
        LibDiamond.enforceIsContractOwner();
        
        LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawId];
        require(draw.creator != address(0), "Draw not found");
        require(!draw.isCompleted && !draw.isCancelled, "Already ended");
        
        // Force end time
        draw.endTime = block.timestamp - 1;
        
        // Execute
        this.executeDraw(drawId);
    }
}