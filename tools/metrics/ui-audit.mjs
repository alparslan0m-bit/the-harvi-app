import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior UI & Styling Audit
 * 
 * This metric scans for two major React Native anti-patterns:
 * 1. Inline Styles (`style={{...}}`): Creates a new object every render, causing performance drops.
 * 2. Hardcoded Colors (`#FFF`, `rgba(...)`): Breaks Dark Mode and theme consistency.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'coverage']),
    extensions: new Set(['.tsx', '.jsx']),
};

const results = [];

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const stats = {
        file: path.relative(process.cwd(), filePath),
        inlineStyles: (content.match(/style=\{\{/g) || []).length,
        hardcodedColors: (content.match(/['"]#[0-9a-fA-F]{3,8}['"]/g) || []).length + (content.match(/rgba?\(/g) || []).length,
    };

    stats.totalOffenses = stats.inlineStyles + stats.hardcodedColors;

    if (stats.totalOffenses > 0) {
        results.push(stats);
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
    console.log(`\n\x1b[36m>>> UI & Styling Anti-Pattern Audit <<<\x1b[0m\n`);
    await walk(process.cwd());

    if (results.length === 0) {
        console.log(`\x1b[32mPerfect! No inline styles or hardcoded colors found.\x1b[0m\n`);
        return;
    }

    // 1. Inline Style Offenders
    console.log(`\x1b[1m[1] Inline Style Offenders (Performance Risk)\x1b[0m`);
    const inlineOffenders = results.filter(r => r.inlineStyles > 0).sort((a, b) => b.inlineStyles - a.inlineStyles).slice(0, 5);
    if (inlineOffenders.length === 0) {
        console.log(`  None found.`);
    } else {
        inlineOffenders.forEach(r => {
            console.log(`- ${r.file.padEnd(55)} (\x1b[31m${r.inlineStyles} inline styles\x1b[0m)`);
        });
    }
    console.log('');

    // 2. Hardcoded Color Offenders
    console.log(`\x1b[1m[2] Hardcoded Color Offenders (Theming Risk)\x1b[0m`);
    const colorOffenders = results.filter(r => r.hardcodedColors > 0).sort((a, b) => b.hardcodedColors - a.hardcodedColors).slice(0, 5);
    if (colorOffenders.length === 0) {
        console.log(`  None found.`);
    } else {
        colorOffenders.forEach(r => {
            console.log(`- ${r.file.padEnd(55)} (\x1b[33m${r.hardcodedColors} hardcoded colors\x1b[0m)`);
        });
    }

    console.log(`\nTip: Use StyleSheet.create() for styles and the useColors() hook for colors.\n`);
}

run().catch(console.error);
