import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const protectedFiles = [
    '.env',
    'package.json',
    'package-lock.json',
    'database/session/creds.json',
];

function resolvePath(target = '') {
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

function isProtected(file = '') {
    const normalized = file.replace(/\\/g, '/');
    return protectedFiles.some((v) => normalized.includes(v));
}

export function removeFile(target = '') {
    const real = resolvePath(target);

    if (!real) {
        return `file tidak ditemukan 😒\n\n${target}`;
    }

    try {
        if (isProtected(real)) {
            return `file protected 😼\n\n${real}`;
        }

        const stat = fs.statSync(real);

        if (stat.isDirectory()) {
            return `itu folder 😒\n\n${real}`;
        }

        fs.unlinkSync(real);
        return `berhasil hapus file 😼\n\n${real}`;
    } catch (err) {
        return `gagal hapus file 😭\n\n${err.message}`;
    }
}