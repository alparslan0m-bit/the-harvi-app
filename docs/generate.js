/**
 * ============================================================================
 *  DOCS GENERATOR ORCHESTRATOR
 * ============================================================================
 *
 *  Runs all 9 doc extractors in sequence, generating the final markdown files
 *  in the project root.
 *  Run:  node docs/generate.js or pnpm run docs:generate
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const extractorsDir = path.join(__dirname, "extractors");
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(__dirname, "generated");

console.log("\x1b[35m=== 📚 Generating Harvi Documentation ===\x1b[0m\n");

// Verify extractors directory exists
if (!fs.existsSync(extractorsDir)) {
  console.error(`\x1b[31m❌ Error: Extractors directory not found at ${extractorsDir}\x1b[0m`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Get all extractor scripts
const extractors = fs
  .readdirSync(extractorsDir)
  .filter((f) => f.endsWith(".js"));

if (extractors.length === 0) {
  console.log("⚠️ No extractor scripts found in docs/extractors/");
  process.exit(0);
}

let successCount = 0;
let failCount = 0;

for (const script of extractors) {
  const extractorPath = path.join(extractorsDir, script);
  
  try {
    const extractor = require(extractorPath);
    
    if (typeof extractor.generate !== "function" || !extractor.name) {
      console.log(`\x1b[33m⚠️ Skipping ${script}: Missing exported generate() or name\x1b[0m`);
      continue;
    }
    
    console.log(`⏳ Running ${script}...`);
    
    // Generate the markdown content
    const mdContent = extractor.generate();
    
    // Write to docs/generated
    const outPath = path.join(outDir, extractor.name);
    fs.writeFileSync(outPath, mdContent);
    
    console.log(`\x1b[32m✅ Generated docs/generated/${extractor.name}\x1b[0m`);
    successCount++;
  } catch (err) {
    console.error(`\x1b[31m❌ Failed ${script}:\x1b[0m`, err.message);
    failCount++;
  }
}

console.log("\n\x1b[35m========================================================\x1b[0m");
if (failCount === 0) {
  console.log(`\x1b[32m🎉 Success! All ${successCount} documentation files generated.\x1b[0m`);
} else {
  console.log(`\x1b[33m⚠️ Completed with ${failCount} errors. (${successCount} generated)\x1b[0m`);
  process.exit(1);
}
