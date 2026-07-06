import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior TypeScript Safety & Tech Debt Analyzer
 * 
 * This metric identifies files that bypass TypeScript's type system.
 * Overuse of `any` or `@ts-ignore` defeats the purpose of TypeScript and hides potential runtime crashes.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'coverage']),
    extensions: new Set(['.ts', '.tsx']),
};

const results = [];

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const stats = {
        file: path.relative(process.cwd(), filePath),
        anys: (content.match(/: any\b/g) || []).length + (content.match(/<any>/g) || []).length,
        tsIgnores: (content.match(/@ts-ignore/g) || []).length,
        tsExpectErrors: (content.match(/@ts-expect-error/g) || []).length,
    };

    stats.totalOffenses = stats.anys + stats.tsIgnores + stats.tsExpectErrors;

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
    console.log(`\n\x1b[35m>>> TypeScript Strictness & Type Safety Audit <<<\x1b[0m\n`);
    await walk(process.cwd());

    if (results.length === 0) {
        console.log(`\x1b[32mPerfect! No usages of 'any' or ts-ignores found.\x1b[0m\n`);
        return;
    }

    const sorted = results.sort((a, b) => b.totalOffenses - a.totalOffenses).slice(0, 10);

    console.log(`\x1b[1mTop 10 Files Needing Type Definitions:\x1b[0m`);
    sorted.forEach(r => {
        let msg = `- ${r.file.padEnd(55)}`;
        if (r.anys > 0) msg += ` (\x1b[33m${r.anys} 'any'\x1b[0m)`;
        if (r.tsIgnores > 0) msg += ` (\x1b[31m${r.tsIgnores} @ts-ignore\x1b[0m)`;
        if (r.tsExpectErrors > 0) msg += ` (\x1b[34m${r.tsExpectErrors} @ts-expect-error\x1b[0m)`;
        console.log(msg);
    });

    const totalAnys = results.reduce((sum, r) => sum + r.anys, 0);
    const totalIgnores = results.reduce((sum, r) => sum + r.tsIgnores, 0);
    
    console.log(`\n\x1b[1mSummary:\x1b[0m`);
    console.log(`Total 'any' usages: ${totalAnys}`);
    console.log(`Total '@ts-ignore' usages: ${totalIgnores}`);
    console.log(`\nTip: Replace 'any' with 'unknown' or proper interfaces to restore type safety.\n`);
}

run().catch(console.error);
