const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['src', 'app'];
const EXTENSIONS = ['.ts', '.tsx'];
const RELATIVE_IMPORT_REGEX = /from\s+['"](\.\.\/[^'"]+)['"]/g;

let errors = 0;

console.log('\x1b[35m=== 🚫 Scanning for Relative Imports ===\x1b[0m\n');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, callback);
    } else if (EXTENSIONS.includes(path.extname(filePath))) {
      callback(filePath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  let hasError = false;

  while ((match = RELATIVE_IMPORT_REGEX.exec(content)) !== null) {
    if (!hasError) {
      console.log(`\x1b[36m${filePath}\x1b[0m`);
      hasError = true;
    }
    console.log(`  \x1b[31mFound relative import:\x1b[0m ${match[1]}`);
    errors++;
  }
}

DIRECTORIES_TO_SCAN.forEach(dir => {
  walkDir(path.join(__dirname, '..', dir), scanFile);
});

console.log('\n\x1b[35m=== Summary ===\x1b[0m');
if (errors === 0) {
  console.log('\x1b[32m✅ Excellent! All cross-module imports are absolute (e.g. @/src/features/...).\x1b[0m');
} else {
  console.log(`\x1b[31m❌ Found ${errors} relative cross-module imports. Use '@/' absolute paths instead to prevent broken imports when moving files.\x1b[0m`);
}
