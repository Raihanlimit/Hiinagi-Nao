import fs from 'fs';
import path from 'path';
import { getProjectTree } from '../tools/project.js';
import { readFileContent } from '../tools/file.js';
import { removeFile } from '../tools/remove.js';
import { execute } from '../tools/exec.js';
import { cleanupSession } from '../tools/cleanup.js';
import { getContext, setContext } from './context.js';

export const tools = {
    tree: {
        name: 'tree',
        direct: true,
        run: () => getProjectTree(),
    },
    readfile: {
        name: 'readfile',
        direct: true,
        run: (file) => readFileContent(file),
    },
    remove: {
        name: 'remove',
        direct: true,
        run: (file) => removeFile(file),
    },
    cleanup: {
        name: 'cleanup',
        direct: true,
        run: () => cleanupSession(),
    },
    exec: {
        name: 'exec',
        direct: true,
        run: (command) => execute(command),
    },
};

let fileCache = [];
let lastScan = 0;

function scan(dir, result = []) {
    let items = [];

    try {
        items = fs.readdirSync(dir);
    } catch {
        return result;
    }

    for (const item of items) {
        const target = path.join(dir, item);

        try {
            const stat = fs.statSync(target);

            if (stat.isDirectory()) {
                if (item === 'node_modules' || item === '.git' || item === '.next' || item === 'dist' || item === 'build') {
                    continue;
                }
                scan(target, result);
            } else {
                result.push(target);
            }
        } catch { }
    }

    return result;
}

function getFiles() {
    const now = Date.now();

    if (now - lastScan > 30000 || !fileCache.length) {
        fileCache = scan('./');
        lastScan = now;
        console.log(`[ FILE CACHE ] ${fileCache.length} files`);
    }

    return fileCache;
}

function findFile(text = '') {
    const lower = text.toLowerCase();
    const files = getFiles();

    let best = null;
    let bestScore = 0;

    for (const file of files) {
        const normalized = file.replace(/\\/g, '/');
        const base = path.basename(file).toLowerCase();
        const noExt = base.replace(path.extname(base), '');
        let score = 0;

        if (lower.includes(base)) score += 100;
        if (lower.includes(noExt)) score += 60;
        if (lower.includes(normalized.toLowerCase())) score += 200;

        if (lower.includes('.json') && base.endsWith('.json')) score += 40;
        if (lower.includes('.js') && base.endsWith('.js')) score += 40;
        if (lower.includes('database') && normalized.includes('database')) score += 30;

        if (base.includes(lower) || lower.includes(base)) score += 5;

        const words = lower.split(/\s+/);
        for (const word of words) {
            if (word.length < 2) continue;
            if (base.includes(word)) score += 3;
        }

        if (score > bestScore) {
            bestScore = score;
            best = file;
        }
    }

    return bestScore < 10 ? null : best;
}

function isRunnable(file = '') {
    const allowed = ['.js', '.mjs', '.cjs'];
    const ext = path.extname(file).toLowerCase();
    return allowed.includes(ext);
}

function isProtected(file = '') {
    const blocked = [
        '.env',
        'package-lock.json',
        'app.js',
        'ai/deepseek.js',
        'events/message.js',
        'system/tools.js',
        'system/context.js',
        'system/session.js',
        'system/memory.js',
        'database/session/creds.json',
        'database/data/context.json',
        'database/data/history.json',
        'database/data/memory.json',
    ];

    const normalized = file.replace(/\\/g, '/');
    return blocked.some(v => normalized.includes(v));
}

export async function detectTool(text = '', chatId = 'global') {
    const lower = text.toLowerCase();

    console.log('[ TOOL DETECT ]', lower);

    if (
        lower.includes('tree') ||
        lower.includes('struktur') ||
        lower.includes('project') ||
        lower.includes('folder') ||
        lower.includes('repo') ||
        lower.includes('source')
    ) {
        console.log('[ TOOL ] tree');
        setContext(chatId, { lastTool: 'tree' });
        return {
            ...tools.tree,
            run: () => getProjectTree(),
        };
    }

    if (
        lower.includes('hapus session') ||
        lower.includes('bersihin session') ||
        lower.includes('cleanup session') ||
        lower.includes('session sampah') ||
        lower.includes('hapus sampah') ||
        lower.includes('bersihin tmp') ||
        lower.includes('clear tmp') ||
        lower.includes('bersihin cache')
    ) {
        console.log('[ TOOL ] cleanup');
        setContext(chatId, { lastTool: 'cleanup' });
        return {
            ...tools.cleanup,
            run: () => cleanupSession(),
        };
    }

    const readIntent = lower.startsWith('lihat ') ||
        lower.startsWith('liat ') ||
        lower.includes('cek file') ||
        lower.includes('buka file') ||
        lower.includes('read file') ||
        lower.includes('isi file') ||
        lower.includes('show file') ||
        lower.includes('file terakhir') ||
        lower.includes('last file') ||
        lower.includes('yang tadi');

    if (readIntent) {
        let file = findFile(lower);

        if (!file && (lower.includes('terakhir') || lower.includes('last') || lower.includes('tadi'))) {
            const ctx = getContext(chatId);
            if (ctx?.lastFile) file = ctx.lastFile;
        }

        if (file) {
            console.log('[ TOOL ] readfile', file);
            return {
                ...tools.readfile,
                run: () => {
                    setContext(chatId, { lastTool: 'readfile', lastFile: file });
                    return readFileContent(file);
                },
            };
        }
    }

    if (
        lower.includes('tes ') ||
        lower.includes('test ') ||
        lower.includes('run ') ||
        lower.includes('execute ') ||
        lower.includes('jalanin ') ||
        lower.startsWith('run') ||
        lower.startsWith('tes') ||
        lower.startsWith('test') ||
        lower.startsWith('execute')
    ) {
        let file = findFile(lower);

        if (!file && (lower.includes('terakhir') || lower.includes('last') || lower.includes('tadi'))) {
            const ctx = getContext(chatId);
            if (ctx?.lastFile && isRunnable(ctx.lastFile)) file = ctx.lastFile;
        }

        if (file && isRunnable(file)) {
            console.log('[ TOOL ] exec', file);
            return {
                ...tools.exec,
                run: () => {
                    setContext(chatId, { lastTool: 'exec', lastFile: file });
                    return execute(`node "${file}"`);
                },
            };
        }
    }

    if (lower.includes('hapus') || lower.includes('delete') || lower.includes('remove')) {
        let file = findFile(lower);

        if (!file && (lower.includes('terakhir') || lower.includes('last') || lower.includes('tadi'))) {
            const ctx = getContext(chatId);
            if (ctx?.lastFile) file = ctx.lastFile;
        }

        if (file) {
            if (isProtected(file)) {
                console.log('[ TOOL ] protected file');
                return {
                    name: 'protected',
                    direct: true,
                    run: () => 'file protected 😼',
                };
            }

            console.log('[ TOOL ] remove', file);
            return {
                ...tools.remove,
                run: () => {
                    setContext(chatId, { lastTool: 'remove', lastFile: file });
                    return removeFile(file);
                },
            };
        }
    }

    console.log('[ TOOL ] none');
    return null;
}