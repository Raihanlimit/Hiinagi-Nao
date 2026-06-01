import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function safeResolve(target = '') {
    const possible = [
        target,
        `./${target}`,
        `./events/${target}`,
        `./tools/${target}`,
        `./system/${target}`,
        `./ai/${target}`,
        `./database/${target}`,
        `./database/data/${target}`,
        `./database/session/${target}`,
    ];

    for (const file of possible) {
        try {
            const resolved = path.resolve(file);

            if (!resolved.startsWith(ROOT)) {
                continue;
            }

            if (fs.existsSync(resolved)) {
                return resolved;
            }
        } catch { }
    }

    return null;
}

export function readFileContent(target = '') {
    const real = safeResolve(target);

    if (!real) {
        return `file tidak ditemukan 😒\n\n${target}`;
    }

    try {
        const stat = fs.statSync(real);

        if (stat.isDirectory()) {
            return `itu folder 😒\n\n${real}`;
        }

        if (stat.size > 1024 * 1024) {
            return `file terlalu besar 😭\n\n${real}`;
        }

        const content = fs.readFileSync(real, 'utf8');
        return `📄 ${real}\n\n${content}`;
    } catch (err) {
        return `gagal baca file 😭\n\n${err.message}`;
    }
}

export function writeFileContent(target = '', content = '') {
    try {
        const resolved = path.resolve(target);

        if (!resolved.startsWith(ROOT)) {
            return `akses path ditolak 😼\n\n${target}`;
        }

        fs.writeFileSync(resolved, content, 'utf8');
        return `berhasil nulis file 😼\n\n${resolved}`;
    } catch (err) {
        return `gagal nulis file 😭\n\n${err.message}`;
    }
}