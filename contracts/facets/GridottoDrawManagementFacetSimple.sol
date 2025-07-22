// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libs/LibGridottoStorage.sol";
import "../libs/LibDiamond.sol";

/**
 * @title GridottoDrawManagementFacetSimple
 * @notice Simplified draw creation and cancellation operations
 */
contract GridottoDrawManagementFacetSimple {
    using LibGridottoStorage for LibGridottoStorage.Layout;
    
    // Events
    event DrawCreated(
        uint256 indexed drawId,
        address indexed creator,
        LibGridottoStorage.DrawType drawType,
        uint256 endTime
    );
    
    event UserDrawCancelled(uint256 indexed drawId, address indexed creator);
    
    // Modifiers
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier notPaused() {
        require(!LibGridottoStorage.layout().paused, "Contract is paused");
        _;
    }
    
    /**
     * @notice Create a LYX draw
     * @param ticketPrice Price per ticket in LYX
     * @param maxTickets Maximum tickets that can be sold
     * @param duration Duration of the draw in seconds
     * @param totalWinners Number of winners
     * @param participationFeePercent Fee percentage for participation
     * @return drawId The ID of the created draw
     */
    function createUserDraw(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 totalWinners,
        uint256 participationFeePercent
    ) external payable notPaused returns (uint256 drawId) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(maxTickets > 0, "Max tickets must be greater than 0");
        require(duration >= 3600 && duration <= 30 days, "Invalid duration");
        require(totalWinners > 0 && totalWinners <= 10, "Invalid winner count");
        require(participationFeePercent <= 10000, "Invalid fee percent");
        
        drawId = ++l.nextDrawId;
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LYX;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.minParticipants = totalWinners;
        
        // Set prize config
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.PARTICIPANT_FUNDED,
            creatorContribution: msg.value,
            addParticipationFees: true,
            participationFeePercent: participationFeePercent,
            totalWinners: totalWinners
        });
        
        // Initialize prize pool with creator contribution
        if (msg.value > 0) {
            draw.initialPrize = msg.value;
            draw.currentPrizePool = msg.value;
        }
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorage.DrawType.USER_LYX, draw.endTime);
        
        return drawId;
    }
    
    /**
     * @notice Create a token draw
     * @param prizeToken Address of the prize token
     * @param ticketPrice Price per ticket in the prize token
     * @param maxTickets Maximum tickets that can be sold
     * @param duration Duration of the draw in seconds
     * @param totalWinners Number of winners
     * @param participationFeePercent Fee percentage for participation
     * @param creatorContribution Initial prize contribution from creator
     * @return drawId The ID of the created draw
     */
    function createTokenDraw(
        address prizeToken,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        uint256 totalWinners,
        uint256 participationFeePercent,
        uint256 creatorContribution
    ) external notPaused returns (uint256 drawId) {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        
        require(prizeToken != address(0), "Invalid token address");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(maxTickets > 0, "Max tickets must be greater than 0");
        require(duration >= 3600 && duration <= 30 days, "Invalid duration");
        require(totalWinners > 0 && totalWinners <= 10, "Invalid winner count");
        require(participationFeePercent <= 10000, "Invalid fee percent");
        
        drawId = ++l.nextDrawId;
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        draw.creator = msg.sender;
        draw.drawType = LibGridottoStorage.DrawType.USER_LSP7;
        draw.prizeToken = prizeToken;
        draw.ticketPrice = ticketPrice;
        draw.maxTickets = maxTickets;
        draw.startTime = block.timestamp;
        draw.endTime = block.timestamp + duration;
        draw.minParticipants = totalWinners;
        
        // Set prize config
        draw.prizeConfig = LibGridottoStorage.DrawPrizeConfig({
            model: LibGridottoStorage.PrizeModel.PARTICIPANT_FUNDED,
            creatorContribution: creatorContribution,
            addParticipationFees: true,
            participationFeePercent: participationFeePercent,
            totalWinners: totalWinners
        });
        
        // Handle creator contribution
        if (creatorContribution > 0) {
            ILSP7 token = ILSP7(prizeToken);
            uint256 balanceBefore = token.balanceOf(address(this));
            
            token.transfer(
                msg.sender,
                address(this),
                creatorContribution,
                true,
                ""
            );
            
            uint256 balanceAfter = token.balanceOf(address(this));
            require(
                balanceAfter >= balanceBefore + creatorContribution,
                "Token transfer failed"
            );
            
            draw.initialPrize = creatorContribution;
            draw.currentPrizePool = creatorContribution;
        }
        
        emit DrawCreated(drawId, msg.sender, LibGridottoStorage.DrawType.USER_LSP7, draw.endTime);
        
        return drawId;
    }
    
    /**
     * @notice Cancel a user-created draw
     * @param drawId The ID of the draw to cancel
     */
    function cancelUserDraw(uint256 drawId) external {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator == msg.sender || msg.sender == LibDiamond.contractOwner(), "Not authorized");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw already cancelled");
        
        draw.isCancelled = true;
        
        // Refund all participants
        for (uint256 i = 0; i < draw.participants.length; i++) {
            address participant = draw.participants[i];
            uint256 ticketCount = draw.userTickets[participant];
            
            if (ticketCount > 0) {
                uint256 refundAmount = draw.ticketPrice * ticketCount;
                
                if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                    (bool success, ) = participant.call{value: refundAmount}("");
                    require(success, "Refund failed");
                } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                    ILSP7 token = ILSP7(draw.prizeToken);
                    token.transfer(address(this), participant, refundAmount, true, "");
                }
            }
        }
        
        // Refund creator contribution
        if (draw.initialPrize > 0) {
            if (draw.drawType == LibGridottoStorage.DrawType.USER_LYX) {
                (bool success, ) = draw.creator.call{value: draw.initialPrize}("");
                require(success, "Creator refund failed");
            } else if (draw.drawType == LibGridottoStorage.DrawType.USER_LSP7) {
                ILSP7 token = ILSP7(draw.prizeToken);
                token.transfer(address(this), draw.creator, draw.initialPrize, true, "");
            }
        }
        
        emit UserDrawCancelled(drawId, draw.creator);
    }
    
    /**
     * @notice Cancel a draw as admin
     * @param drawId The ID of the draw to cancel
     * @param reason Reason for cancellation
     */
    function cancelDrawAsAdmin(uint256 drawId, string memory reason) external onlyOwner {
        LibGridottoStorage.Layout storage l = LibGridottoStorage.layout();
        LibGridottoStorage.UserDraw storage draw = l.userDraws[drawId];
        
        require(draw.creator != address(0), "Draw does not exist");
        require(!draw.isCompleted, "Draw already completed");
        require(!draw.isCancelled, "Draw already cancelled");
        
        // Use the same cancellation logic
        this.cancelUserDraw(drawId);
    }
}

// Interface for LSP7 token
interface ILSP7 {
    function transfer(address from, address to, uint256 amount, bool force, bytes memory data) external;
    function balanceOf(address account) external view returns (uint256);
}