import fs from 'fs';
import path from 'path';

async function main() {
    console.log("📋 Extracting ABIs for UI...\n");

    const contracts = [
        'GridottoCoreFacet',
        'GridottoExecutionFacet',
        'GridottoAdminFacet',
        'GridottoLeaderboardFacet'
    ];

    const outputDir = './ui-abis';
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (const contractName of contracts) {
        try {
            const artifactPath = path.join(
                './artifacts/contracts/facets',
                `${contractName}.sol`,
                `${contractName}.json`
            );
            
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            const abi = artifact.abi;
            
            // Save ABI
            const outputPath = path.join(outputDir, `${contractName}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
            
            console.log(`✅ ${contractName} ABI saved to ${outputPath}`);
            console.log(`   Functions: ${abi.filter((item: any) => item.type === 'function').length}`);
            
            // List function names
            const functions = abi
                .filter((item: any) => item.type === 'function')
                .map((item: any) => item.name);
            console.log(`   Names: ${functions.join(', ')}\n`);
            
        } catch (error: any) {
            console.error(`❌ Error processing ${contractName}:`, error.message);
        }
    }

    console.log("\n📝 UI Integration Example:");
    console.log("```javascript");
    console.log("import CoreABI from './ui-abis/GridottoCoreFacet.json';");
    console.log("import ExecutionABI from './ui-abis/GridottoExecutionFacet.json';");
    console.log("import AdminABI from './ui-abis/GridottoAdminFacet.json';");
    console.log("import LeaderboardABI from './ui-abis/GridottoLeaderboardFacet.json';");
    console.log("");
    console.log("const DIAMOND_ADDRESS = '0x5Ad808FAE645BA3682170467114e5b80A70bF276';");
    console.log("");
    console.log("// Initialize contracts");
    console.log("const core = new ethers.Contract(DIAMOND_ADDRESS, CoreABI, signer);");
    console.log("const execution = new ethers.Contract(DIAMOND_ADDRESS, ExecutionABI, signer);");
    console.log("const admin = new ethers.Contract(DIAMOND_ADDRESS, AdminABI, signer);");
    console.log("const leaderboard = new ethers.Contract(DIAMOND_ADDRESS, LeaderboardABI, signer);");
    console.log("```");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });