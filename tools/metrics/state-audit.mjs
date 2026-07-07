import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior Zustand State Management Audit
 * 
 * This metric scans for common anti-patterns when using Zustand stores in React Native:
 * 1. Missing Selectors: `useStore()` without a selector re-renders the component ANY time ANY state changes.
 * 2. Un-memoized actions: Extracting actions without memoization can cause children to re-render.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'coverage']),
    extensions: new Set(['.tsx', '.jsx']),
};

const results = [];

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Look for hook calls that look like Zustand stores, e.g., const state = useAuthStore()
    // specifically targeting calls with NO arguments (no selector).
    const noSelectorRegex = /use[a-zA-Z0-9]+Store\(\)/g;
    const missingSelectors = (content.match(noSelectorRegex) || []).length;

    // Look for destructuring of store actions without selecting them specifically.
    // e.g. const { user, login } = useAuthStore(); <- This causes full re-renders if anything else in the store changes.
    const destructuringRegex = /const\s+\{.*\}\s*=\s*use[a-zA-Z0-9]+Store\(/g;
    const unsafeDestructuring = (content.match(destructuringRegex) || []).length;

    if (missingSelectors > 0 || unsafeDestructuring > 0) {
        results.push({
            file: path.relative(process.cwd(), filePath),
            missingSelectors,
            unsafeDestructuring,
            totalOffenses: missingSelectors + unsafeDestructuring
        });
    }
}

async function walk(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await walk(fullPath);
        } else if (CONFIG.extensions.has(path.extname(file.name))) {
            await analyzeFile(fullPath);
        }
    }
}

async function run() {
    console.log(`\n\x1b[35m>>> Zustand State Management Audit <<<\x1b[0m\n`);
    await walk(process.cwd());

    if (results.length === 0) {
        console.log(`\x1b[32mPerfect! No Zustand selector anti-patterns found.\x1b[0m\n`);
        return;
    }

    console.log(`\x1b[1mTop Components with Missing Selectors (Re-render Risk):\x1b[0m`);
    
    const sorted = results.sort((a, b) => b.totalOffenses - a.totalOffenses);
    
    sorted.forEach(r => {
        let msg = `- ${r.file.padEnd(55)}`;
        if (r.missingSelectors > 0) msg += ` (\x1b[31m${r.missingSelectors} naked useStore calls\x1b[0m)`;
        if (r.unsafeDestructuring > 0) msg += ` (\x1b[33m${r.unsafeDestructuring} unsafe destructures\x1b[0m)`;
        console.log(msg);
    });

    console.log(`\n\x1b[33mTip: Always use selectors to prevent unnecessary re-renders.\x1b[0m`);
    console.log(`Bad:  const { user } = useAuthStore()`);
    console.log(`Good: const user = useAuthStore(state => state.user)\n`);
}

run().catch(console.error);
