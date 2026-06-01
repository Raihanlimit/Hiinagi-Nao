import { random, sleep } from '../tools/delay.js';

export async function read(sock, key) {
    try {
        await sleep(random(3000, 6000));
        await sock.readMessages([key]);
    } catch {}
}

export async function typing(sock, jid, text = '') {
    try {
        const length = text.trim().length;

        let delay = 2500 + (length * 45);
        delay += random(500, 2000);

        delay = Math.min(delay, 15000);

        await sock.sendPresenceUpdate('composing', jid);
        await sleep(delay);
        await sock.sendPresenceUpdate('paused', jid);
    } catch {}
}

export async function recording(sock, jid, duration = 3000) {
    try {
        await sock.sendPresenceUpdate('recording', jid);
        await sleep(duration);
        await sock.sendPresenceUpdate('paused', jid);
    } catch {}
}

export async function online(sock) {
    try {
        await sock.sendPresenceUpdate('available');
    } catch {}
}

export async function offline(sock) {
    try {
        await sock.sendPresenceUpdate('unavailable');
    } catch {}
}

export async function realisticPresence(sock, key, jid, text = '') {
    try {
        await sleep(random(1000, 3000));

        await online(sock);

        await read(sock, key);

        await typing(sock, jid, text);

        setTimeout(() => {
            offline(sock);
        }, random(4000, 8000));
    } catch {}
}