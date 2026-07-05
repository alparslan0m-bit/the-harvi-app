const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['src', 'app'];
const EXTENSIONS = ['.ts', '.tsx'];

// Regex to capture explicit uses of 'any'
// Matches: ': any', 'as any', '<any>', 'any[]', 'Promise<any>', etc.
const ANY_REGEX = /(:\s*any\b|as\s+any\b|<any>|any\[\]|any\s*>|<\s*any\s*,|,\s*any\s*>)/;
const COMMENT_REGEX = /^\s*\/\//;

let totalAnyCount = 0;
let filesWithAny = 0;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (EXTENSIONS.includes(path.extname(filePath))) {
      callback(filePath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let hasAnyInFile = false;

  lines.forEach((line, index) => {
    // Skip single-line comments
    if (COMMENT_REGEX.test(line)) return;

    if (ANY_REGEX.test(line)) {
      if (!hasAnyInFile) {
        console.log(`\n\x1b[36m${filePath}\x1b[0m`);
        hasAnyInFile = true;
        filesWithAny++;
      }
      totalAnyCount++;
      console.log(`  Line ${index + 1}: \x1b[33m${line.trim()}\x1b[0m`);
    }
  });
}

console.log('\x1b[35m=== Scanning for explicit "any" types ===\x1b[0m');

DIRECTORIES_TO_SCAN.forEach(dir => {
  walkDir(path.join(__dirname, '..', dir), scanFile);
});

console.log('\n\x1b[35m=== Summary ===\x1b[0m');
if (totalAnyCount === 0) {
  console.log('\x1b[32m🎉 Congratulations! 0 explicit "any" types found. Your codebase is incredibly strictly typed!\x1b[0m');
} else {
  console.log(`\x1b[31mFound ${totalAnyCount} explicit "any" types across ${filesWithAny} files.\x1b[0m`);
  console.log('Consider refactoring these to use precise types, generics, or "unknown".');
}
