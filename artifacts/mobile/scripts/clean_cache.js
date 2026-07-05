const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\x1b[35m=== 🧹 Expo & React Native Deep Clean ===\x1b[0m\n');

try {
  console.log('1. Clearing Watchman watches...');
  execSync('watchman watch-del-all', { stdio: 'ignore' });
} catch (e) {
  // Watchman might not be installed, ignore
}

const dirsToNuke = [
  '.expo',
  'node_modules/.cache'
];

console.log('2. Removing Expo & bundler caches...');
dirsToNuke.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`   Deleted ${dir}`);
  }
});

console.log('3. Instructions for restarting:');
console.log('\n\x1b[32m✅ Cache successfully nuked. To restart the app without cache, run:\x1b[0m');
console.log('\x1b[36m   npx expo start -c\x1b[0m\n');
