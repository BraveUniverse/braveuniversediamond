import { ethers } from "hardhat";

/**
 * nextDrawId sorununu düzeltmek için önerilen çözüm
 */
async function main() {
    console.log("🔧 nextDrawId Düzeltme Önerisi");
    console.log("=".repeat(60));

    const DIAMOND_ADDRESS = "0x5Ad808FAE645BA3682170467114e5b80A70bF276";
    
    const adminFacet = await ethers.getContractAt("GridottoAdminFacet", DIAMOND_ADDRESS);
    
    // Mevcut durumu kontrol et
    const nextDrawId = await adminFacet.getNextDrawId();
    const stats = await adminFacet.getPlatformStatistics();
    
    console.log("📊 Mevcut Durum:");
    console.log("- nextDrawId:", nextDrawId.toString());
    console.log("- totalDrawsCreated:", stats.totalDrawsCreated.toString());
    console.log("- Fark:", Number(stats.totalDrawsCreated) - Number(nextDrawId) + 1);
    
    console.log("\n💡 ÖNERİLEN ÇÖZÜM:");
    console.log("GridottoAdminFacet'e şu fonksiyonu ekle:");
    console.log("\n```solidity");
    console.log("// Admin function to fix nextDrawId mismatch");
    console.log("function fixNextDrawId() external onlyOwner {");
    console.log("    LibGridottoStorageV2.Layout storage s = LibGridottoStorageV2.layout();");
    console.log("    ");
    console.log("    // Find the highest existing draw ID");
    console.log("    uint256 highestId = 0;");
    console.log("    for (uint256 i = 1; i <= s.totalDrawsCreated; i++) {");
    console.log("        if (s.draws[i].creator != address(0)) {");
    console.log("            highestId = i;");
    console.log("        }");
    console.log("    }");
    console.log("    ");
    console.log("    // Set nextDrawId to highestId + 1");
    console.log("    s.nextDrawId = highestId + 1;");
    console.log("    ");
    console.log("    emit NextDrawIdFixed(highestId + 1);");
    console.log("}");
    console.log("```");
    
    console.log("\n🎯 ALTERNATIF ÇÖZÜM (UI Tarafında):");
    console.log("1. Her zaman `getPlatformStatistics()` kullan");
    console.log("2. `totalDrawsCreated` değerini al");
    console.log("3. 1'den `totalDrawsCreated`'a kadar döngü yap");
    console.log("4. Her ID için `getDrawDetails()` çağır");
    console.log("5. Boş olanları atla");
    
    console.log("\n📝 React/Next.js Örnek Kod:");
    console.log("```typescript");
    console.log("// hooks/useAllDraws.ts");
    console.log("export const useAllDraws = () => {");
    console.log("  const [draws, setDraws] = useState([]);");
    console.log("  ");
    console.log("  useEffect(() => {");
    console.log("    const fetchDraws = async () => {");
    console.log("      const stats = await adminContract.getPlatformStatistics();");
    console.log("      const totalDraws = Number(stats.totalDrawsCreated);");
    console.log("      ");
    console.log("      const drawPromises = [];");
    console.log("      for (let i = 1; i <= totalDraws; i++) {");
    console.log("        drawPromises.push(");
    console.log("          coreContract.getDrawDetails(i)");
    console.log("            .then(draw => ({ id: i, ...draw }))");
    console.log("            .catch(() => null)");
    console.log("        );");
    console.log("      }");
    console.log("      ");
    console.log("      const results = await Promise.all(drawPromises);");
    console.log("      const validDraws = results.filter(d => d !== null);");
    console.log("      setDraws(validDraws);");
    console.log("    };");
    console.log("    ");
    console.log("    fetchDraws();");
    console.log("  }, []);");
    console.log("  ");
    console.log("  return draws;");
    console.log("};");
    console.log("```");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });