import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECTORIES_TO_SCAN = ['src', 'app'];
const EXTENSIONS = ['.ts', '.tsx'];

// Regex to capture uses of @ts-ignore or @ts-expect-error
const SUPPRESSION_REGEX = /@ts-(ignore|expect-error)\b/;

let totalSuppressionCount = 0;
let filesWithSuppressions = 0;

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
  let hasSuppressionInFile = false;

  lines.forEach((line, index) => {
    if (SUPPRESSION_REGEX.test(line)) {
      if (!hasSuppressionInFile) {
        console.log(`\n\x1b[36m${filePath}\x1b[0m`);
        hasSuppressionInFile = true;
        filesWithSuppressions++;
      }
      totalSuppressionCount++;
      console.log(`  Line ${index + 1}: \x1b[33m${line.trim()}\x1b[0m`);
    }
  });
}

console.log('\x1b[35m=== Scanning for "@ts-ignore" and "@ts-expect-error" suppressions ===\x1b[0m');

DIRECTORIES_TO_SCAN.forEach(dir => {
  walkDir(path.join(__dirname, dir), scanFile);
});

console.log('\n\x1b[35m=== Summary ===\x1b[0m');
if (totalSuppressionCount === 0) {
  console.log('\x1b[32m🎉 Congratulations! 0 TypeScript suppressions found. Your codebase is clean!\x1b[0m');
} else {
  console.log(`\x1b[31mFound ${totalSuppressionCount} suppression(s) across ${filesWithSuppressions} file(s).\x1b[0m`);
}
