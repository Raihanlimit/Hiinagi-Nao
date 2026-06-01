import fs from 'fs';
import path from 'path';

export function cleanupSession() {
    const dir = './database/session';

    // Cek apakah folder session ada
    if (!fs.existsSync(dir)) {
        return `folder session tidak ditemukan: ${dir}`;
    }

    const files = fs.readdirSync(dir);
    let removed = [];

    for (const file of files) {
        // skip creds.json (file penting jangan dihapus)
        if (file === 'creds.json') {
            continue;
        }

        const target = path.join(dir, file);

        // skip kalau directory (hanya hapus file)
        try {
            if (!fs.statSync(target).isFile()) {
                continue;
            }
        } catch (err) {
            continue; // skip jika error akses stat
        }

        // hapus file
        try {
            fs.unlinkSync(target);
            removed.push(file);
        } catch (err) {
            // skip jika gagal hapus (misal permission)
            continue;
        }
    }

    if (removed.length === 0) {
        return 'tidak ada file session yang bisa dihapus (selain creds.json) 😼';
    }

    return `
berhasil bersihin ${removed.length} file session 😼

${removed.join('\n')}
`;
}