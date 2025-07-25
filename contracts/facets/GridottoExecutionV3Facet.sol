// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";
import "../libs/LibOracleStorage.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/ILSP7DigitalAsset.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title GridottoExecutionV3Facet
 * @notice Execution facet for draws with upfront fee collection
 * @dev Works with GridottoCoreV3Facet where fees are collected during ticket sales
 */
contract GridottoExecutionV3Facet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    using LibOracleStorage for LibOracleStorage.Layout;
    
    event DrawExecuted(uint256 indexed drawId, address indexed winner, uint256 prize);
    event DrawCancelled(uint256 indexed drawId, string reason);
    event ExecutorFeePaid(uint256 indexed drawId, address indexed executor, uint256 amount);
    
    modifier notPaused() {
        require(!LibGridottoStorageV2.layout().paused, "System paused");
        _;
    }
    
    /**
     * @notice Execute a draw and select winner
     * @dev Fees have already been deducted during ticket sales
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
        draw.winner = winner;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // Transfer prize to winner
        uint256 prizeAmount = draw.prizePool;
        
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            
            // Transfer LYX prize
            (bool success, ) = winner.call{value: prizeAmount}("");
            require(success, "Prize transfer failed");
            
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            // Transfer token prize
            ILSP7(draw.tokenAddress).transfer(address(this), winner, prizeAmount, true, "");
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8) {
            // Transfer NFT
            ILSP8(draw.tokenAddress).transfer(address(this), winner, draw.nftTokenId, true, "");
        }
        
        // Pay executor fee (already collected during ticket sales)
        if (draw.executorFeeCollected > 0) {
            if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
                // Token executor fee
                ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, draw.executorFeeCollected, true, "");
            } else {
                // LYX executor fee
                (bool success, ) = msg.sender.call{value: draw.executorFeeCollected}("");
                require(success, "Executor fee transfer failed");
            }
            
            // Track executor earnings
            s.userExecutionFees[msg.sender] += draw.executorFeeCollected;
            emit ExecutorFeePaid(drawId, msg.sender, draw.executorFeeCollected);
        }
        
        // Update stats
        s.totalPrizesDistributed += prizeAmount;
        s.totalExecutions++;
        s.userWins[winner]++;
        s.userTotalWon[winner] += prizeAmount;
        
        emit DrawExecuted(drawId, winner, prizeAmount);
    }
    
    /**
     * @notice Cancel a draw and refund participants
     * @dev Platform fees are NOT refunded
     */
    function _cancelDraw(uint256 drawId, string memory reason) private {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        draw.isCancelled = true;
        draw.executor = msg.sender;
        draw.executedAt = block.timestamp;
        
        // Refund logic handled by RefundFacet
        emit DrawCancelled(drawId, reason);
    }
    
    /**
     * @notice Select winner based on tickets
     */
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
    
    /**
     * @notice Get random number for draw
     */
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
    
    /**
     * @notice Force execute a draw (admin only)
     */
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