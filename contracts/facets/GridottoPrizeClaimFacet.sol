// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorageV2.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoPrizeClaimFacet
 * @notice Handles prize claims for winners with gas optimization
 * @dev Complements existing RefundFacet for complete claim functionality
 */
contract GridottoPrizeClaimFacet {
    using LibGridottoStorageV2 for LibGridottoStorageV2.Layout;
    
    event PrizeClaimed(uint256 indexed drawId, address indexed winner, uint256 amount);
    event ExecutorFeeClaimed(address indexed executor, uint256 amount);
    event BatchPrizesClaimed(address indexed user, uint256 totalAmount, uint256 drawCount);
    
    modifier notPaused() {
        require(!LibGridottoStorageV2.layout().paused, "System paused");
        _;
    }
    
    /**
     * @notice Claim prize for a completed draw
     * @param drawId The draw ID to claim prize from
     */
    function claimPrize(uint256 drawId) external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        LibGridottoStorageV2.Draw storage draw = s.draws[drawId];
        
        require(draw.isCompleted, "Draw not completed");
        require(!draw.hasClaimed[msg.sender], "Already claimed");
        
        // Find winner index
        uint256 winnerIndex = type(uint256).max;
        for (uint256 i = 0; i < draw.winners.length; i++) {
            if (draw.winners[i] == msg.sender) {
                winnerIndex = i;
                break;
            }
        }
        
        require(winnerIndex != type(uint256).max, "Not a winner");
        
        uint256 prizeAmount = draw.winnerAmounts[winnerIndex];
        require(prizeAmount > 0, "No prize");
        
        // Mark as claimed
        draw.hasClaimed[msg.sender] = true;
        
        // Transfer prize based on draw type
        if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LYX || 
            draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8 ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_WEEKLY ||
            draw.drawType == LibGridottoStorageV2.DrawType.PLATFORM_MONTHLY) {
            
            // Transfer LYX prize
            (bool success, ) = msg.sender.call{value: prizeAmount}("");
            require(success, "Prize transfer failed");
            
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP7) {
            // Transfer token prize
            ILSP7(draw.tokenAddress).transfer(address(this), msg.sender, prizeAmount, true, "");
        } else if (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8) {
            // Transfer NFT
            require(draw.nftTokenIds.length > 0, "No NFT to transfer");
            ILSP8(draw.tokenAddress).transfer(address(this), msg.sender, draw.nftTokenIds[0], true, "");
        }
        
        // Update stats
        s.totalPrizesDistributed += prizeAmount;
        s.userTotalWinnings[msg.sender] += prizeAmount;
        
        emit PrizeClaimed(drawId, msg.sender, prizeAmount);
    }
    
    /**
     * @notice Claim accumulated executor fees
     */
    function claimExecutorFees() external notPaused {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        uint256 claimableAmount = s.claimableExecutorFees[msg.sender];
        require(claimableAmount > 0, "No fees to claim");
        
        // Reset claimable amount
        s.claimableExecutorFees[msg.sender] = 0;
        
        // Transfer fees
        (bool success, ) = msg.sender.call{value: claimableAmount}("");
        require(success, "Fee transfer failed");
        
        emit ExecutorFeeClaimed(msg.sender, claimableAmount);
    }
    
    /**
     * @notice Get claimable executor fees for an address
     */
    function getClaimableExecutorFees(address executor) external view returns (uint256) {
        return LibGridottoStorageV2.layout().claimableExecutorFees[executor];
    }
    
    /**
     * @notice Get all unclaimed prizes for a user
     */
    function getUnclaimedPrizes(address user) external view returns (
        uint256[] memory drawIds,
        uint256[] memory amounts,
        bool[] memory isNFT
    ) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        // Count unclaimed prizes
        uint256 count = 0;
        for (uint256 i = 1; i < s.nextDrawId; i++) {
            LibGridottoStorageV2.Draw storage draw = s.draws[i];
            if (draw.isCompleted && !draw.hasClaimed[user]) {
                // Check if user is winner
                for (uint256 j = 0; j < draw.winners.length; j++) {
                    if (draw.winners[j] == user) {
                        count++;
                        break;
                    }
                }
            }
        }
        
        // Collect unclaimed prizes
        drawIds = new uint256[](count);
        amounts = new uint256[](count);
        isNFT = new bool[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < s.nextDrawId; i++) {
            LibGridottoStorageV2.Draw storage draw = s.draws[i];
            if (draw.isCompleted && !draw.hasClaimed[user]) {
                for (uint256 j = 0; j < draw.winners.length; j++) {
                    if (draw.winners[j] == user) {
                        drawIds[index] = i;
                        amounts[index] = draw.winnerAmounts[j];
                        isNFT[index] = (draw.drawType == LibGridottoStorageV2.DrawType.USER_LSP8);
                        index++;
                        break;
                    }
                }
            }
        }
        
        return (drawIds, amounts, isNFT);
    }
    
    /**
     * @notice Batch claim multiple prizes
     * @param drawIds Array of draw IDs to claim prizes from
     */
    function batchClaimPrizes(uint256[] calldata drawIds) external notPaused {
        uint256 totalClaimed = 0;
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < drawIds.length; i++) {
            // Get prize amount before claiming
            LibGridottoStorageV2.Draw storage draw = LibGridottoStorageV2.layout().draws[drawIds[i]];
            
            if (draw.isCompleted && !draw.hasClaimed[msg.sender]) {
                // Find winner amount
                uint256 prizeAmount = 0;
                for (uint256 j = 0; j < draw.winners.length; j++) {
                    if (draw.winners[j] == msg.sender) {
                        prizeAmount = draw.winnerAmounts[j];
                        break;
                    }
                }
                
                if (prizeAmount > 0) {
                    // Try to claim
                    try this.claimPrize(drawIds[i]) {
                        totalClaimed += prizeAmount;
                        successCount++;
                    } catch {
                        // Skip failed claims
                    }
                }
            }
        }
        
        if (successCount > 0) {
            emit BatchPrizesClaimed(msg.sender, totalClaimed, successCount);
        }
    }
    
    /**
     * @notice Get total claimable amount for a user across all draws
     */
    function getTotalClaimableAmount(address user) external view returns (uint256 total) {
        LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();
        
        for (uint256 i = 1; i < s.nextDrawId; i++) {
            LibGridottoStorageV2.Draw storage draw = s.draws[i];
            if (draw.isCompleted && !draw.hasClaimed[user]) {
                for (uint256 j = 0; j < draw.winners.length; j++) {
                    if (draw.winners[j] == user) {
                        total += draw.winnerAmounts[j];
                        break;
                    }
                }
            }
        }
        
        return total;
    }
}

// Minimal interfaces for LUKSO standards
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
}

interface ILSP8 {
    function transfer(address from, address to, bytes32 tokenId, bool force, bytes memory data) external;
}