/**
 * ============================================================================
 *  DOCS CI VERIFIER
 * ============================================================================
 *
 *  Runs the doc generators and compares their output to the checked-in files.
 *  Exits with code 1 if there is a mismatch.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const extractorsDir = path.join(projectRoot, "docs", "extractors");
const outDir = path.join(projectRoot, "docs", "generated");

console.log("🔍 Verifying generated documentation...");

if (!fs.existsSync(outDir)) {
  console.error("❌ docs/generated does not exist. Run docs/generate.js first.");
  process.exit(1);
}

const extractors = fs.readdirSync(extractorsDir).filter((f) => f.endsWith(".js"));

let hasDrift = false;

for (const script of extractors) {
  const extractorPath = path.join(extractorsDir, script);
  try {
    const extractor = require(extractorPath);
    if (typeof extractor.generate !== "function" || !extractor.name) continue;

    const freshMd = extractor.generate();
    const outPath = path.join(outDir, extractor.name);

    if (!fs.existsSync(outPath)) {
      console.error(`❌ Missing file: ${extractor.name}`);
      hasDrift = true;
      continue;
    }

    const existingMd = fs.readFileSync(outPath, "utf8");

    // Ignore the 'Generated at' line for comparison
    const sanitize = (md) => md.replace(/> Generated at .+\n/g, "");

    if (sanitize(freshMd) !== sanitize(existingMd)) {
      console.error(`❌ Drift detected in: ${extractor.name}`);
      hasDrift = true;
    }
  } catch (err) {
    console.error(`❌ Error verifying ${script}:`, err.message);
    hasDrift = true;
  }
}

if (hasDrift) {
  console.error("\n❌ Documentation drift detected! Please run `node docs/generate.js` and commit the changes.");
  process.exit(1);
} else {
  console.log("✅ Documentation is up-to-date!");
  process.exit(0);
}
