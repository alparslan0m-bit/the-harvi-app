const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'app');
const SRC_DIR = path.join(__dirname, '..', 'src', 'features');

let errors = 0;

console.log('\x1b[35m=== 🏗️ Validating Feature Architecture ===\x1b[0m\n');

// Rule 1: Thin Shells in app/
function checkAppDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      checkAppDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (file !== '_layout.tsx' && file !== '+not-found.tsx') {
        // A thin shell should ideally only export default, and not have React components
        if (content.includes('function ') || content.includes('const ') || content.includes('=> {')) {
          console.log(`\x1b[31m[Thin Shell Violation]\x1b[0m ${filePath}`);
          console.log(`  Route files should only re-export from src/features. Found logic/components.\n`);
          errors++;
        }
      }
    }
  }
}

// Rule 2: Strict Feature Folders in src/features/
const ALLOWED_FEATURE_FOLDERS = ['components', 'hooks', 'services', 'utils', 'types', 'constants'];

function checkFeaturesDirectory() {
  if (!fs.existsSync(SRC_DIR)) return;
  const features = fs.readdirSync(SRC_DIR);
  for (const feature of features) {
    const featurePath = path.join(SRC_DIR, feature);
    if (!fs.statSync(featurePath).isDirectory()) continue;

    const subDirs = fs.readdirSync(featurePath);
    for (const sub of subDirs) {
      if (sub === 'index.ts' || sub === 'index.tsx') continue;
      
      const subPath = path.join(featurePath, sub);
      if (fs.statSync(subPath).isDirectory()) {
        if (!ALLOWED_FEATURE_FOLDERS.includes(sub)) {
          console.log(`\x1b[31m[Architecture Violation]\x1b[0m ${subPath}`);
          console.log(`  Feature folder '${feature}' contains unauthorized folder '${sub}'.`);
          console.log(`  Allowed: ${ALLOWED_FEATURE_FOLDERS.join(', ')}\n`);
          errors++;
        }
      } else {
        console.log(`\x1b[31m[Architecture Violation]\x1b[0m ${subPath}`);
        console.log(`  Files are not allowed at the feature root. Move '${sub}' into a subfolder (e.g. components/).\n`);
        errors++;
      }
    }
  }
}

checkAppDirectory(APP_DIR);
checkFeaturesDirectory();

if (errors === 0) {
  console.log('\x1b[32m✅ Architecture is flawless! Thin shells and feature folders are perfectly respected.\x1b[0m');
} else {
  console.log(`\x1b[31m❌ Found ${errors} architectural violations. Please fix them to maintain a clean codebase.\x1b[0m`);
  process.exit(1);
}
