import { execSync } from 'child_process';

export function execute(command = '') {
    const blocked = [
        'rm -rf',
        'reboot',
        'shutdown',
        'poweroff',
        'mkfs',
        ':(){:|:&};:',
    ];

    const lower = command.toLowerCase();

    for (const bad of blocked) {
        if (lower.includes(bad)) {
            throw new Error('command blocked 😼');
        }
    }

    try {
        const result = execSync(command, {
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 1000 * 60,
            maxBuffer: 1024 * 1024 * 10,
        });

        return result || 'done 😼';
    } catch (err) {
        return `exec error 😭\n\n${err.message}\n\n${err.stdout || ''}\n\n${err.stderr || ''}`;
    }
}