const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'llms.txt');
const FULL_OUTPUT_FILE = path.join(ROOT_DIR, 'llms-full.txt');

// Config
const EXCLUDE_DIRS = ['.git', 'node_modules', 'archive', 'scripts'];
const INCLUDE_EXTENSIONS = ['.md', '.proto'];

function getMarkdownTitle(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^#\s+(.*)/m);
    return match ? match[1].trim() : path.basename(path.dirname(filePath));
}

function getMarkdownDescription(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let titleFound = false;
    for (let line of lines) {
        if (line.startsWith('# ')) {
            titleFound = true;
            continue;
        }
        if (titleFound && line.trim() && !line.startsWith('#') && !line.startsWith('[!')) {
            return line.trim();
        }
    }
    return '';
}

function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    files.forEach(function(file) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                filelist = walkSync(filePath, filelist);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (INCLUDE_EXTENSIONS.includes(ext)) {
                filelist.push(filePath);
            }
        }
    });
    return filelist;
}

function generateLLMsTxt() {
    const mainReadme = path.join(ROOT_DIR, 'README.md');
    const title = getMarkdownTitle(mainReadme) || 'Transit Project';
    const description = getMarkdownDescription(mainReadme);

    // Collect ALL relevant files
    const allFilePaths = walkSync(ROOT_DIR);
    const relFilePaths = allFilePaths.map(p => path.relative(ROOT_DIR, p)).sort();

    // 1. Generate llms.txt (Index)
    let content = `# ${title}\n`;
    if (description) {
        content += `> ${description}\n\n`;
    }

    content += `## Core Documentation\n`;
    const core = relFilePaths.filter(p => !p.includes('/') && p.endsWith('.md'));
    core.forEach(p => {
        content += `- [${p}](${p})\n`;
    });
    content += '\n';

    const gtfsFiles = relFilePaths.filter(p => p.startsWith('gtfs/'));
    if (gtfsFiles.length > 0) {
        content += `## GTFS Schedule\n`;
        const readmes = gtfsFiles.filter(p => p.endsWith('README.md'));
        readmes.forEach(p => {
            content += `- [${p}](${p})\n`;
        });
        content += '\n';
    }

    const realtimeFiles = relFilePaths.filter(p => p.startsWith('gtfs-realtime/'));
    if (realtimeFiles.length > 0) {
        content += `## GTFS Realtime\n`;
        const readmes = realtimeFiles.filter(p => p.endsWith('README.md'));
        const protos = realtimeFiles.filter(p => p.endsWith('.proto'));
        
        readmes.forEach(p => {
            content += `- [${p}](${p})\n`;
        });
        if (protos.length > 0) {
            content += `- [Protobuf Definitions](${protos[0]})\n`;
        }
        content += '\n';
    }

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`Generated ${OUTPUT_FILE}`);

    // 2. Generate llms-full.txt (All Content)
    let fullContent = `# ${title} - Full Documentation\n`;
    fullContent += `This file contains the concatenated content of all relevant documentation and specification files (${INCLUDE_EXTENSIONS.join(', ')}).\n\n`;
    
    fullContent += `## Table of Contents\n`;
    relFilePaths.forEach(p => {
        fullContent += `- ${p}\n`;
    });
    fullContent += `\n---\n\n`;

    for (const relPath of relFilePaths) {
        const absPath = path.join(ROOT_DIR, relPath);
        try {
            const fileContent = fs.readFileSync(absPath, 'utf8');
            fullContent += `\n\n--- START OF ${relPath} ---\n\n`;
            fullContent += fileContent;
            fullContent += `\n\n--- END OF ${relPath} ---\n\n`;
        } catch (e) {
            console.error(`Error reading ${relPath}: ${e.message}`);
        }
    }

    fs.writeFileSync(FULL_OUTPUT_FILE, fullContent);
    console.log(`Generated ${FULL_OUTPUT_FILE} (${relFilePaths.length} files included)`);
}

generateLLMsTxt();
