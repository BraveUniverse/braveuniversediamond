import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("📋 Extracting ABIs...\n");

    const contracts = [
        "DiamondCutFacet",
        "DiamondLoupeFacet", 
        "OwnershipFacet",
        "GridottoCoreV2Facet",
        "GridottoExecutionV2Facet",
        "GridottoPlatformDrawsFacet",
        "GridottoRefundFacet",
        "GridottoAdminFacet",
        "GridottoLeaderboardFacet",
        "GridottoDebugFacet",
        "OracleFacet",
        "MockLSP7",
        "MockLSP8"
    ];

    const abisDir = path.join(__dirname, "..", "abis");
    
    // Ensure abis directory exists
    if (!fs.existsSync(abisDir)) {
        fs.mkdirSync(abisDir);
    }

    for (const contractName of contracts) {
        try {
            const artifact = await ethers.getContractFactory(contractName);
            const abi = artifact.interface.formatJson();
            
            const filename = `${contractName}.json`;
            const filepath = path.join(abisDir, filename);
            
            fs.writeFileSync(filepath, abi);
            console.log(`✅ ${filename} extracted`);
        } catch (error) {
            console.log(`❌ Failed to extract ${contractName}: ${error}`);
        }
    }

    // Create a combined ABI for the Diamond
    console.log("\n📋 Creating combined Diamond ABI...");
    
    const diamondABI: any[] = [];
    const facets = [
        "DiamondCutFacet",
        "DiamondLoupeFacet",
        "OwnershipFacet",
        "GridottoCoreV2Facet",
        "GridottoExecutionV2Facet",
        "GridottoPlatformDrawsFacet",
        "GridottoRefundFacet",
        "GridottoAdminFacet",
        "GridottoLeaderboardFacet",
        "GridottoDebugFacet",
        "OracleFacet"
    ];

    for (const facetName of facets) {
        try {
            const artifact = await ethers.getContractFactory(facetName);
            const abi = JSON.parse(artifact.interface.formatJson());
            diamondABI.push(...abi);
        } catch (error) {
            console.log(`⚠️  Skipping ${facetName} for Diamond ABI`);
        }
    }

    // Remove duplicates (like receive function)
    const uniqueABI = diamondABI.filter((item, index, self) => 
        index === self.findIndex((t) => JSON.stringify(t) === JSON.stringify(item))
    );

    fs.writeFileSync(
        path.join(abisDir, "GridottoDiamond.json"),
        JSON.stringify(uniqueABI, null, 2)
    );
    console.log("✅ GridottoDiamond.json created");

    // Create a README for the ABIs
    const readme = `# Gridotto V2 ABIs

This directory contains the Application Binary Interfaces (ABIs) for all Gridotto V2 contracts.

## Diamond Contract
- **GridottoDiamond.json** - Combined ABI for the entire Diamond proxy contract

## Facets
- **DiamondCutFacet.json** - Diamond upgrade functionality
- **DiamondLoupeFacet.json** - Diamond introspection
- **OwnershipFacet.json** - Ownership management
- **GridottoCoreV2Facet.json** - Core draw creation and ticket purchase
- **GridottoExecutionV2Facet.json** - Draw execution and prize claiming
- **GridottoPlatformDrawsFacet.json** - Platform weekly/monthly draws
- **GridottoRefundFacet.json** - Refund functionality
- **GridottoAdminFacet.json** - Admin controls
- **GridottoLeaderboardFacet.json** - Leaderboard queries
- **GridottoDebugFacet.json** - Debug utilities
- **OracleFacet.json** - Random number generation

## Mock Contracts (for testing)
- **MockLSP7.json** - Mock LSP7 token
- **MockLSP8.json** - Mock LSP8 NFT

## Usage

### JavaScript/TypeScript
\`\`\`javascript
const diamondABI = require('./GridottoDiamond.json');
const diamondContract = new ethers.Contract(DIAMOND_ADDRESS, diamondABI, signer);
\`\`\`

### Individual Facets
\`\`\`javascript
const coreABI = require('./GridottoCoreV2Facet.json');
// Use with the same Diamond address
const coreContract = new ethers.Contract(DIAMOND_ADDRESS, coreABI, signer);
\`\`\`

## Contract Addresses (LUKSO Testnet)
- Diamond: \`0x5Ad808FAE645BA3682170467114e5b80A70bF276\`
`;

    fs.writeFileSync(path.join(abisDir, "README.md"), readme);
    console.log("✅ README.md created");

    console.log("\n✨ All ABIs extracted successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });