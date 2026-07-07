import fs from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.name === 'node_modules' || file.name === '.git') continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await walk(fullPath);
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            await fixFile(fullPath);
        }
    }
}

async function fixFile(filePath) {
    let content = await fs.readFile(filePath, 'utf-8');
    let changed = false;
    
    const lines = content.split(/\r?\n/);
    let rnImportLineIndex = -1;
    let rnImportLine = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('from "react-native"') || line.includes("from 'react-native'")) {
            if (line.includes('TouchableOpacity')) {
                rnImportLineIndex = i;
                rnImportLine = line;
                break;
            }
        }
    }

    if (rnImportLineIndex !== -1) {
        let newRnImport = rnImportLine
            .replace('TouchableOpacity, ', '')
            .replace(', TouchableOpacity', '')
            .replace(' TouchableOpacity ', ' ')
            .replace('{ TouchableOpacity }', '{}');
            
        lines[rnImportLineIndex] = newRnImport;
        
        const ghImport = `import { TouchableOpacity } from "react-native-gesture-handler";`;
        lines.splice(rnImportLineIndex + 1, 0, ghImport);
        
        changed = true;
    }
    
    if (changed) {
        await fs.writeFile(filePath, lines.join('\n'));
        console.log(`Fixed: ${filePath}`);
    }
}

walk(path.join(process.cwd(), 'artifacts/mobile/src')).catch(console.error);
