export function normalizeId(id = '') {
    return String(id).split(':')[0].trim();
}

export function getSender(key = {}) {
    const sender = key.participant || key.participantAlt || key.remoteJid || '';
    const senderAlt = key.participantAlt || key.participant || key.remoteJidAlt || key.remoteJid || '';

    return {
        id: normalizeId(sender),
        alt: normalizeId(senderAlt),
        lid: normalizeId(sender).endsWith('@lid')
    };
}

export function getChat(key = {}) {
    const chat = key.remoteJid || key.remoteJidAlt || '';
    const chatAlt = key.remoteJidAlt || key.remoteJid || '';

    return {
        id: normalizeId(chat),
        alt: normalizeId(chatAlt)
    };
}

export function isGroup(id = '') {
    return String(id).endsWith('@g.us');
}

export function getUserIdentity(id = '') {
    const owner = normalizeId(process.env.OWNER_NUMBER);
    const user = normalizeId(id);

    if (!owner || !user) {
        return '';
    }

    const cleanOwner = owner.replace(/\D/g, '');
    const cleanUser = user.replace(/\D/g, '');

    if (cleanUser === cleanOwner) {
        return `
[ USER STATUS ]
OWNER

Lawan bicara ini adalah owner.
`;
    }

    return `
[ USER STATUS ]
NORMAL_USER

Lawan bicara ini bukan owner.
Jangan menggunakan panggilan romantis seperti:
- ayang
- sayang
- yank
- beb
- bubub

kecuali memang diminta secara eksplisit.
`;
}