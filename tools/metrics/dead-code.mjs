import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Lightweight Dead Code Detector
 * 
 * Scans the project for exported functions and constants, and flags them
 * if they are never imported anywhere else in the codebase.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'tools']),
    extensions: new Set(['.ts', '.tsx', '.js', '.jsx']),
    ignoreFiles: new Set(['_layout.tsx', 'index.tsx']) // Next/Expo routers use default exports heavily
};

async function walk(dir, fileList = []) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (CONFIG.ignoreDirs.has(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await walk(fullPath, fileList);
        } else if (CONFIG.extensions.has(path.extname(file.name))) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

async function run() {
    console.log(`\n\x1b[35m>>> Dead Code Analyzer (Beta) <<<\x1b[0m\n`);
    const allFiles = await walk(process.cwd());
    
    // Pass 1: Gather all exports
    const exportsMap = new Map(); // exportName -> sourceFilePath
    const fileContents = new Map(); // filePath -> string content

    for (const filePath of allFiles) {
        if (CONFIG.ignoreFiles.has(path.basename(filePath))) continue;
        
        const content = await fs.readFile(filePath, 'utf-8');
        fileContents.set(filePath, content);
        
        // Match `export const X` or `export function X`
        const exportRegex = /export\s+(?:const|let|function|async\s+function)\s+([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            const exportName = match[1];
            exportsMap.set(exportName, filePath);
        }
    }

    // Pass 2: Check for usages
    const unusedExports = [];

    for (const [exportName, sourceFile] of exportsMap.entries()) {
        let isUsed = false;
        
        for (const [filePath, content] of fileContents.entries()) {
            // Skip the file where it was defined
            if (filePath === sourceFile) continue;
            
            // Simple string matching. A real AST parser is better, but this catches 95% of issues.
            if (content.includes(exportName)) {
                isUsed = true;
                break;
            }
        }

        if (!isUsed) {
            unusedExports.push({ name: exportName, file: path.relative(process.cwd(), sourceFile) });
        }
    }

    if (unusedExports.length === 0) {
        console.log(`\x1b[32mPerfect! No potentially unused exports found.\x1b[0m\n`);
        return;
    }

    console.log(`\x1b[33mFound ${unusedExports.length} potentially unused exports:\x1b[0m`);
    unusedExports.forEach(exp => {
        console.log(`  - \x1b[1m${exp.name}\x1b[0m in ${exp.file}`);
    });
    
    console.log(`\n\x1b[90mNote: This is a static string analysis. Check before deleting!\x1b[0m\n`);
}

run().catch(console.error);
