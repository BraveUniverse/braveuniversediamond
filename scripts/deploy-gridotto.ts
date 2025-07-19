import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "./libraries/diamond";

async function main() {
    console.log("Deploying GridottoFacet to LUKSO Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Diamond address on testnet (from previous deployment)
    const DIAMOND_ADDRESS = "0x8fC7328F8b6F4bE6B17aD3d4e7e1bB2Cd1b5E8A3";
    
    // Deploy GridottoFacet
    console.log("Deploying GridottoFacet...");
    const GridottoFacet = await ethers.getContractFactory("GridottoFacet");
    const gridottoFacet = await GridottoFacet.deploy();
    await gridottoFacet.waitForDeployment();
    const gridottoAddress = await gridottoFacet.getAddress();
    console.log("GridottoFacet deployed to:", gridottoAddress);
    
    // Get Diamond contract
    const diamond = await ethers.getContractAt("IDiamondCut", DIAMOND_ADDRESS);
    
    // Prepare diamond cut
    const cut = [{
        facetAddress: gridottoAddress,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(gridottoFacet).selectors
    }];
    
    // Execute diamond cut
    console.log("Adding GridottoFacet to Diamond...");
    const tx = await diamond.diamondCut(cut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("GridottoFacet added to Diamond!");
    
    // Initialize GridottoFacet
    console.log("Initializing GridottoFacet...");
    const gridotto = await ethers.getContractAt("GridottoFacet", DIAMOND_ADDRESS);
    const initTx = await gridotto.initializeGridotto();
    await initTx.wait();
    console.log("GridottoFacet initialized!");
    
    // Get current state
    const ticketPrice = await gridotto.getTicketPrice();
    const drawInfo = await gridotto.getCurrentDrawInfo();
    
    console.log("\n=== GridottoFacet Deployment Complete ===");
    console.log("Diamond Address:", DIAMOND_ADDRESS);
    console.log("GridottoFacet Address:", gridottoAddress);
    console.log("Ticket Price:", ethers.formatEther(ticketPrice), "LYX");
    console.log("Current Draw Number:", drawInfo.drawNumber.toString());
    console.log("Current Prize Pool:", ethers.formatEther(drawInfo.prizePool), "LYX");
    console.log("Next Draw Time:", new Date(Number(drawInfo.drawTime) * 1000).toLocaleString());
    
    // Test accounts info
    console.log("\n=== Test Accounts for Testing ===");
    console.log("Account 1:", process.env.PRIVATE_KEY_1 ? "Configured ✓" : "Not configured ✗");
    console.log("Account 2:", process.env.PRIVATE_KEY_2 ? "Configured ✓" : "Not configured ✗");
    console.log("Account 3:", process.env.PRIVATE_KEY_3 ? "Configured ✓" : "Not configured ✗");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });