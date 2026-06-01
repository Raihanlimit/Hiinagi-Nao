import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';
import connection from '../events/connection.js';
import message from '../events/message.js';
import { initDeepSeek } from '../ai/deepseek.js';

const logger = pino({ level: 'silent' });

export default async function start() {
    await initDeepSeek();

    const { state, saveCreds } = await useMultiFileAuthState('./database/session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        logger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    connection(sock);
    message(sock);

    if (!sock.authState.creds.registered) {
        const phone = process.env.BOT_NUMBER;

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phone);
                console.log(`\nPairing Code: ${code}\n`);
            } catch (err) {
                console.log('Pairing Error:', err);
            }
        }, 3000);
    }

    return sock;
}