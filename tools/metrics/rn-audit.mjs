import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Senior React Native Anti-Pattern Audit
 * 
 * Scans for common React Native mistakes that degrade performance or UX:
 * 1. `console.log`: Slows down the JS thread in production.
 * 2. `Dimensions.get`: Doesn't auto-update on orientation/split-screen changes. Use `useWindowDimensions`.
 * 3. `TouchableOpacity` from `react-native`: Slower on Android, use `react-native-gesture-handler` instead.
 */

const CONFIG = {
    ignoreDirs: new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'ios', 'android', 'tools']),
    extensions: new Set(['.js', '.jsx', '.ts', '.tsx']),
};

const results = {
    consoleLogs: [],
    dimensionsGet: [],
    touchableNative: []
};

async function analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(process.cwd(), filePath);
    
    lines.forEach((line, index) => {
        const text = line.trim();
        
        // 1. Console Logs (ignore comments and errors/warns)
        if (text.includes('console.log(') && !text.startsWith('//')) {
            results.consoleLogs.push({ file: relPath, line: index + 1 });
        }
        
        // 2. Dimensions.get
        if (text.includes('Dimensions.get(') && !text.startsWith('//')) {
            results.dimensionsGet.push({ file: relPath, line: index + 1 });
        }

        // 3. react-native TouchableOpacity
        // Looking for import { ..., TouchableOpacity, ... } from 'react-native'
        if (text.includes('from "react-native"') || text.includes("from 'react-native'")) {
            if (text.includes('TouchableOpacity')) {
                results.touchableNative.push({ file: relPath, line: index + 1 });
            }
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
    console.log(`\n\x1b[36m>>> React Native Anti-Pattern Audit <<<\x1b[0m\n`);
    await walk(process.cwd());

    const total = results.consoleLogs.length + results.dimensionsGet.length + results.touchableNative.length;

    if (total === 0) {
        console.log(`\x1b[32mPerfect! No React Native anti-patterns found.\x1b[0m\n`);
        return;
    }

    if (results.consoleLogs.length > 0) {
        console.log(`\x1b[31m[1] Console Logs Left Behind (JS Thread Perf Risk)\x1b[0m`);
        results.consoleLogs.forEach(r => console.log(`  - ${r.file}:${r.line}`));
        console.log('');
    }

    if (results.dimensionsGet.length > 0) {
        console.log(`\x1b[33m[2] Dimensions.get Used (Bug Risk - use useWindowDimensions instead)\x1b[0m`);
        results.dimensionsGet.forEach(r => console.log(`  - ${r.file}:${r.line}`));
        console.log('');
    }

    if (results.touchableNative.length > 0) {
        console.log(`\x1b[33m[3] TouchableOpacity from react-native (UX Risk - use react-native-gesture-handler instead)\x1b[0m`);
        results.touchableNative.forEach(r => console.log(`  - ${r.file}:${r.line}`));
        console.log('');
    }

    console.log(`Summary: ${results.consoleLogs.length} console.logs | ${results.dimensionsGet.length} Dimensions.get | ${results.touchableNative.length} Native Touchables\n`);
}

run().catch(console.error);
