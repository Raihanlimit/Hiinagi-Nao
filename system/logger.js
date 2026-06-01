import chalk from 'chalk';

function time() {
    return new Date().toLocaleTimeString('id-ID');
}

function line() {
    console.log(chalk.hex('#FF5FD7')('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

function detectMedia(m = {}) {
    try {
        if (!m?.message || typeof m.message !== 'object') {
            return 'unknown';
        }

        const keys = Object.keys(m.message);
        if (!keys.length) {
            return 'unknown';
        }

        const type = String(keys[0]).toLowerCase();

        if (type.includes('conversation') || type.includes('extendedtext')) {
            return 'text';
        }

        if (type.includes('image')) return 'image';
        if (type.includes('video')) return 'video';
        if (type.includes('audio')) return 'audio';
        if (type.includes('sticker')) return 'sticker';
        if (type.includes('document')) return 'document';
        if (type.includes('contact')) return 'contact';
        if (type.includes('location')) return 'location';
        if (type.includes('reaction')) return 'reaction';

        return type;
    } catch {
        return 'unknown';
    }
}

function trim(text = '', limit = 400) {
    const str = String(text || '');
    if (str.length <= limit) return str;
    return str.slice(0, limit) + '...';
}

export function logMessage({
    sender = '-',
    pushName = '-',
    chat = '-',
    type = 'private',
    mode = '-',
    user = '-',
    tool = null,
    reply = '-',
    raw = null,
} = {}) {
    try {
        const media = detectMedia(raw);

        line();
        console.log(chalk.bold.hex('#00FFD1')('📨 MESSAGE'), chalk.hex('#FFD700')(time()));
        console.log('');

        console.log(chalk.bold.hex('#FF8C42')('👤 Sender '), chalk.whiteBright(trim(pushName, 80)));
        console.log(chalk.hex('#00BFFF')('   ↳'), chalk.hex('#E6E6FA')(trim(sender, 120)));
        console.log('');

        console.log(chalk.bold.hex('#7CFC00')('💬 Chat   '), type === 'group' ? chalk.hex('#FF5FD7')('GROUP') : chalk.hex('#00FA9A')('PRIVATE'));
        console.log(chalk.hex('#00BFFF')('   ↳'), chalk.hex('#E6E6FA')(trim(chat, 120)));
        console.log('');

        console.log(chalk.bold.hex('#FFD700')('⚙️ Mode   '), chalk.hex('#00FFFF')(String(mode).toUpperCase()));
        console.log(chalk.bold.hex('#FF69B4')('📦 Media  '), chalk.hex('#FFFFFF')(String(media).toUpperCase()));
        console.log(chalk.bold.hex('#BA55D3')('🛠️ Tool   '), tool ? chalk.hex('#FFB6FF')(tool) : chalk.hex('#FFD166')('none'));
        console.log(chalk.bold.hex('#FFA500')('🧠 Reply  '), chalk.hex('#FFFFFF')(`${String(reply || '').length} chars`));
        console.log('');

        console.log(chalk.bold.hex('#00BFFF')('🗨️ User'));
        console.log(chalk.whiteBright(trim(user, 1500)));
        console.log('');

        console.log(chalk.bold.hex('#00FF7F')('🤖 Nao'));
        console.log(chalk.hex('#FFFFFF')(trim(reply, 3000)));

        line();
        console.log('');
    } catch (err) {
        console.log(chalk.bold.bgRed.white(' ❌ LOGGER ERROR '));
        console.log(chalk.hex('#FFB3B3')(err?.stack || String(err)));
        console.log('');
    }
}

export function logTool(name = '') {
    console.log(chalk.bold.hex('#FF5FD7')('🛠️ TOOL'), chalk.hex('#FFFFFF')(trim(name, 200)));
}

export function logConnection(text = '') {
    console.log(chalk.bold.hex('#00FFFF')('🌐 CONNECTION'), chalk.hex('#FFFFFF')(trim(text, 500)));
}

export function logAI(text = '') {
    console.log(chalk.bold.hex('#00FF7F')('🤖 AI'), chalk.hex('#FFFFFF')(trim(text, 500)));
}

export function logError(title = 'ERROR', err) {
    console.log('');
    console.log(chalk.bold.bgRed.white(` ❌ ${title} `));
    console.log('');
    console.log(chalk.hex('#FFB3B3')(err?.stack || err?.message || String(err)));
    console.log('');
}