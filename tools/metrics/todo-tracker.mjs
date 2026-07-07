import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior Tech Debt Tracker (TODO/FIXME/HACK)
 * 
 * This metric scans the entire codebase for scattered TODOs, FIXMEs, and HACKs,
 * categorizing them so they don't get lost in the code over time.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'coverage']),
    extensions: new Set(['.js', '.jsx', '.ts', '.tsx', '.md']),
};

const results = {
    TODO: [],
    FIXME: [],
    HACK: [],
};

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(process.cwd(), filePath);
    
    lines.forEach((line, index) => {
        const text = line.trim();
        if (!text) return;
        
        if (text.includes('TODO')) {
            results.TODO.push({ file: relPath, line: index + 1, text });
        } else if (text.includes('FIXME')) {
            results.FIXME.push({ file: relPath, line: index + 1, text });
        } else if (text.includes('HACK')) {
            results.HACK.push({ file: relPath, line: index + 1, text });
        }
    });
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
    console.log(`\n\x1b[36m>>> Codebase Tech Debt Tracker <<<\x1b[0m\n`);
    await walk(process.cwd());

    const total = results.TODO.length + results.FIXME.length + results.HACK.length;

    if (total === 0) {
        console.log(`\x1b[32mPerfect! No scattered TODOs or FIXMEs found.\x1b[0m\n`);
        return;
    }

    if (results.FIXME.length > 0) {
        console.log(`\x1b[31m[1] FIXMEs (High Priority)\x1b[0m`);
        results.FIXME.forEach(r => console.log(`  - ${r.file}:${r.line} -> ${r.text.replace(/.*FIXME\s*:?/, '').trim()}`));
        console.log('');
    }

    if (results.HACK.length > 0) {
        console.log(`\x1b[33m[2] HACKs (Medium Priority)\x1b[0m`);
        results.HACK.forEach(r => console.log(`  - ${r.file}:${r.line} -> ${r.text.replace(/.*HACK\s*:?/, '').trim()}`));
        console.log('');
    }

    if (results.TODO.length > 0) {
        console.log(`\x1b[34m[3] TODOs (Low Priority)\x1b[0m`);
        results.TODO.slice(0, 10).forEach(r => console.log(`  - ${r.file}:${r.line} -> ${r.text.replace(/.*TODO\s*:?/, '').trim()}`));
        if (results.TODO.length > 10) {
            console.log(`  ...and ${results.TODO.length - 10} more TODOs.`);
        }
        console.log('');
    }

    console.log(`Summary: ${results.FIXME.length} FIXMEs | ${results.HACK.length} HACKs | ${results.TODO.length} TODOs\n`);
}

run().catch(console.error);
