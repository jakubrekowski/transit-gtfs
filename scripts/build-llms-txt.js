const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'llms.txt');

function getMarkdownTitle(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^#\s+(.*)/m);
    return match ? match[1].trim() : path.basename(path.dirname(filePath));
}

function getMarkdownDescription(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    // Try to find the first paragraph after the title
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

function generateLLMsTxt() {
    const mainReadme = path.join(ROOT_DIR, 'README.md');
    const title = getMarkdownTitle(mainReadme) || 'Transit Project';
    const description = getMarkdownDescription(mainReadme);

    let content = `# ${title}\n`;
    if (description) {
        content += `> ${description}\n\n`;
    }

    content += `## Core Documentation\n`;
    content += `- [Main README](README.md): Overview of the GTFS specification.\n`;
    content += `- [Contributing](CONTRIBUTING.md): Guidelines for contributing to the project.\n\n`;

    const sections = [
        { name: 'GTFS Schedule', dir: 'gtfs' },
        { name: 'GTFS Realtime', dir: 'gtfs-realtime' }
    ];

    for (const section of sections) {
        const sectionPath = path.join(ROOT_DIR, section.dir);
        if (fs.existsSync(sectionPath)) {
            content += `## ${section.name}\n`;
            const readmePath = path.join(sectionPath, 'README.md');
            if (fs.existsSync(readmePath)) {
                const desc = getMarkdownDescription(readmePath);
                content += `- [${section.name} Overview](${section.dir}/README.md)${desc ? `: ${desc}` : ''}\n`;
            }

            // Look for sub-docs
            const subDocs = [];
            const items = fs.readdirSync(sectionPath, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory() && !item.name.startsWith('.')) {
                    const subReadme = path.join(sectionPath, item.name, 'README.md');
                    if (fs.existsSync(subReadme)) {
                        subDocs.push({
                            name: item.name,
                            path: `${section.dir}/${item.name}/README.md`
                        });
                    }
                }
            }

            for (const doc of subDocs) {
                content += `- [${doc.name}](${doc.path})\n`;
            }
            content += '\n';
        }
    }

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`Generated ${OUTPUT_FILE}`);
}

generateLLMsTxt();
