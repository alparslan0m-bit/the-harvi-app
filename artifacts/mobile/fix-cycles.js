const fs = require('fs');
const path = require('path');

const featuresDir = path.join(__dirname, 'src', 'features');
const sharedDir = path.join(__dirname, 'src', 'shared');

function fixRequireCyclesInDir(dir, importPrefix) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixRequireCyclesInDir(fullPath, importPrefix);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Match imports like: import { ... } from "@/src/features/learn";
      const regex = new RegExp(`from "${importPrefix}([^/]+)"`, 'g');
      
      let changed = false;
      let newContent = content.replace(regex, (match, featureName) => {
        // If we are INSIDE src/features/<featureName>/components
        // and we import from "@/src/features/<featureName>", it's a cycle.
        const currentFeatureDir = fullPath.split(path.sep).find((part, i, arr) => arr[i-1] === 'features');
        if (currentFeatureDir === featureName) {
          // Replace with local imports
          return `from "."`; // We'll replace this better manually if it breaks, but "." usually means index which might still cycle.
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

// Actually, replacing with "." still imports from index! That IS the cycle!
// To fix the cycle, we must import from the specific files, e.g. "./ModuleCard"
