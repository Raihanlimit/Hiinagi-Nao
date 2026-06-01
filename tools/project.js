import fs from 'fs';
import path from 'path';

const ignore = ['node_modules', '.git', '.cache', '.turbo'];

const description = {
    ai: 'AI system',
    'deepseek.js': 'DeepSeek engine',
    'prompt.js': 'personality prompt',
    events: 'event handler',
    'message.js': 'message event',
    system: 'core system',
    'behavior.js': 'auto reply logic',
    'presence.js': 'typing presence',
    tools: 'helper utilities',
    'project.js': 'project analyzer',
};

function walk(dir, prefix = '') {
    let result = '';

    const files = fs
        .readdirSync(dir)
        .filter((v) => !ignore.includes(v))
        .sort();

    files.forEach((file, index) => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        const last = index === files.length - 1;
        const connector = last ? '└── ' : '├── ';

        result += `${prefix}${connector}${file}`;

        if (description[file]) {
            result += ` ← ${description[file]}`;
        }

        result += '\n';

        if (stat.isDirectory()) {
            result += walk(full, prefix + (last ? '    ' : '│   '));
        }
    });

    return result;
}

export function getProjectTree(root = process.cwd()) {
    return `
${root}

${walk(root)}`.trim();
}