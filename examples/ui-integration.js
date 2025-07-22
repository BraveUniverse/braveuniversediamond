// Gridotto V2 UI Integration Example
// This example shows how to properly integrate with Gridotto V2 contracts

import { ethers } from 'ethers';

// Import ABIs
import GridottoDiamondABI from '../abis/GridottoDiamond.json';
// Or individual facet ABIs
import AdminABI from '../abis/GridottoAdminFacet.json';
import CoreABI from '../abis/GridottoCoreV2Facet.json';
import LeaderboardABI from '../abis/GridottoLeaderboardFacet.json';

// Contract address
const DIAMOND_ADDRESS = '0x5Ad808FAE645BA3682170467114e5b80A70bF276';

// Initialize provider (example with MetaMask)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Option 1: Use combined Diamond ABI (recommended)
const diamond = new ethers.Contract(DIAMOND_ADDRESS, GridottoDiamondABI, signer);

// Option 2: Use individual facet ABIs
const admin = new ethers.Contract(DIAMOND_ADDRESS, AdminABI, signer);
const core = new ethers.Contract(DIAMOND_ADDRESS, CoreABI, signer);
const leaderboard = new ethers.Contract(DIAMOND_ADDRESS, LeaderboardABI, signer);

// Example function calls
async function getNextDrawId() {
    try {
        // CORRECT - Direct function call
        const nextDrawId = await diamond.getNextDrawId();
        console.log('Next Draw ID:', nextDrawId.toString());
        return nextDrawId;
    } catch (error) {
        console.error('Error fetching next draw ID:', error);
    }
}

async function getPlatformStatistics() {
    try {
        // CORRECT - Direct function call
        const stats = await diamond.getPlatformStatistics();
        console.log('Platform Statistics:', {
            totalDrawsCreated: stats.totalDrawsCreated.toString(),
            totalTicketsSold: stats.totalTicketsSold.toString(),
            totalPrizesDistributed: ethers.formatEther(stats.totalPrizesDistributed),
            totalExecutions: stats.totalExecutions.toString(),
            platformFeesLYX: ethers.formatEther(stats.platformFeesLYX),
            monthlyPoolBalance: ethers.formatEther(stats.monthlyPoolBalance),
            currentWeeklyDrawId: stats.currentWeeklyDrawId.toString(),
            currentMonthlyDrawId: stats.currentMonthlyDrawId.toString()
        });
        return stats;
    } catch (error) {
        console.error('Error fetching platform statistics:', error);
    }
}

// Create a draw
async function createLYXDraw(ticketPrice, maxTickets, duration, minParticipants, platformFee, initialPrize) {
    try {
        const tx = await core.createLYXDraw(
            ethers.parseEther(ticketPrice.toString()),
            maxTickets,
            duration,
            minParticipants,
            platformFee,
            { value: ethers.parseEther(initialPrize.toString()) }
        );
        
        const receipt = await tx.wait();
        
        // Extract draw ID from events
        const event = receipt.logs.find(log => {
            try {
                const parsed = core.interface.parseLog(log);
                return parsed?.name === 'DrawCreated';
            } catch { return false; }
        });
        
        if (event) {
            const parsed = core.interface.parseLog(event);
            console.log('Draw created with ID:', parsed.args.drawId.toString());
            return parsed.args.drawId;
        }
    } catch (error) {
        console.error('Error creating draw:', error);
    }
}

// Buy tickets
async function buyTickets(drawId, amount) {
    try {
        // First get draw details to calculate cost
        const details = await core.getDrawDetails(drawId);
        const totalCost = details.ticketPrice * BigInt(amount);
        
        const tx = await core.buyTickets(drawId, amount, {
            value: totalCost
        });
        
        await tx.wait();
        console.log(`Successfully bought ${amount} tickets for draw ${drawId}`);
    } catch (error) {
        console.error('Error buying tickets:', error);
    }
}

// Get leaderboard
async function getTopWinners(count = 10) {
    try {
        const winners = await leaderboard.getTopWinners(count);
        console.log('Top Winners:', winners.map(w => ({
            player: w.player,
            totalWins: w.totalWins.toString(),
            totalWinnings: ethers.formatEther(w.totalWinnings),
            lastWinTime: new Date(Number(w.lastWinTime) * 1000).toLocaleString()
        })));
        return winners;
    } catch (error) {
        console.error('Error fetching top winners:', error);
    }
}

// Listen to events
function listenToEvents() {
    // Draw created
    diamond.on('DrawCreated', (drawId, creator, drawType) => {
        console.log('New draw created:', {
            drawId: drawId.toString(),
            creator,
            drawType
        });
    });
    
    // Tickets purchased
    diamond.on('TicketsPurchased', (drawId, buyer, amount) => {
        console.log('Tickets purchased:', {
            drawId: drawId.toString(),
            buyer,
            amount: amount.toString()
        });
    });
    
    // Draw executed
    diamond.on('DrawExecuted', (drawId, executor, winners) => {
        console.log('Draw executed:', {
            drawId: drawId.toString(),
            executor,
            winners
        });
    });
}

// Export functions for use in UI
export {
    getNextDrawId,
    getPlatformStatistics,
    createLYXDraw,
    buyTickets,
    getTopWinners,
    listenToEvents
};