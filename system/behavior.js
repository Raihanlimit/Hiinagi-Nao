import isOwner from '../tools/owner.js';
import { getMode } from './mode.js';

export default function behavior(msg, sock) {
    const state = getMode();
    const mode = state.current;
    const owner = isOwner(msg);

    const botIds = [
        sock.user.id,
        sock.user.lid,
        sock.user?.jid,
    ]
        .filter(Boolean)
        .map(v => v
            .split(':')[0]
            .replace('@s.whatsapp.net', '')
            .replace('@lid', '')
        );

    if (mode === 'self') {
        if (!msg.isGroup) {
            return owner;
        }
    }

    if (mode === 'custom') {
        if (!state.custom.includes(msg.chat)) {
            return false;
        }
    }

    if (!msg.isGroup) {
        return true;
    }

    const text = msg.body || '';
    const calledName = /\bnao\b/i.test(text) || /\bhiinagi\b/i.test(text);

    const mentions = msg.mentions || [];
    const mentioned = mentions.some(v => {
        const id = v
            .replace('@s.whatsapp.net', '')
            .replace('@lid', '');
        return botIds.includes(id);
    });

    const quotedParticipant = msg.quoted?.participant || msg.quoted?.sender || '';
    const quotedId = quotedParticipant
        .split(':')[0]
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '');
    const quoted = botIds.includes(quotedId);

    if (quoted) return true;
    if (mentioned) return true;
    if (calledName) return true;

    return false;
}