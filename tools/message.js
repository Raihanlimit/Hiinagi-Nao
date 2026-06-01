import { downloadMediaMessage } from 'baileys';
import { getSender, getChat, isGroup } from './user.js';
import { parseBuffer } from './media.js';

function unwrapMessage(message = {}) {
    if (message.viewOnceMessage) {
        return unwrapMessage(message.viewOnceMessage.message);
    }
    if (message.viewOnceMessageV2) {
        return unwrapMessage(message.viewOnceMessageV2.message);
    }
    if (message.viewOnceMessageV2Extension) {
        return unwrapMessage(message.viewOnceMessageV2Extension.message);
    }
    return message;
}

async function parseMedia({ sock, source, type, msg, fileName = '' }) {
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
    const isMedia = mediaTypes.includes(type);

    let media = {
        isMedia,
        type,
        mime: msg?.mimetype || '',
        caption: msg?.caption || '',
        seconds: msg?.seconds || 0,
        fileName,
        size: msg?.fileLength || 0
    };

    if (!isMedia) {
        return media;
    }

    try {
        const buffer = await downloadMediaMessage(source, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer) {
            return media;
        }

        media = {
            ...media,
            ...parseBuffer(buffer, fileName),
            buffer,
            base64: buffer.toString('base64')
        };

        if (media.mime === 'application/octet-stream') {
            media.mime = msg?.mimetype || media.mime;
        }

        if (!media.category) {
            media.category = media.mime.startsWith('image/')
                ? 'image'
                : media.mime.startsWith('audio/')
                ? 'audio'
                : media.mime.startsWith('video/')
                ? 'video'
                : media.mime.startsWith('application/')
                ? 'document'
                : 'unknown';
        }

        media.isPdf = media.mime === 'application/pdf';

        const textMime = [
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'application/json', 'text/xml', 'text/csv'
        ];

        const textExt = [
            '.txt', '.js', '.mjs', '.cjs', '.json', '.html', '.css',
            '.xml', '.csv', '.py', '.java', '.cpp', '.c', '.php', '.go',
            '.rs', '.ts', '.tsx', '.jsx', '.yaml', '.yml', '.md'
        ];

        const lowerName = fileName?.toLowerCase() || '';
        const isTextDocument = textMime.includes(media.mime) ||
            textExt.some(ext => lowerName.endsWith(ext));

        if (isTextDocument) {
            try {
                media.text = buffer.toString('utf-8');
            } catch {
                media.text = null;
            }
        }

        return media;
    } catch (err) {
        console.log('parse media error:', err);
        return media;
    }
}

export default async function parseMessage(sock, m) {
    const sender = getSender(m.key);
    const chat = getChat(m.key);
    let message = unwrapMessage(m.message || {});

    const type = Object.keys(message || {})[0] || '';
    const msg = message[type] || {};

    const body = message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || message?.videoMessage?.caption || message?.documentMessage?.caption || message?.buttonsResponseMessage?.selectedButtonId || message?.listResponseMessage?.title || message?.templateButtonReplyMessage?.selectedId || ''

    const media = await parseMedia({
        sock,
        source: m,
        type,
        msg,
        fileName: msg?.fileName || ''
    });

    const contextInfo = message?.extendedTextMessage?.contextInfo ||
        message?.imageMessage?.contextInfo ||
        message?.videoMessage?.contextInfo ||
        message?.audioMessage?.contextInfo ||
        message?.documentMessage?.contextInfo ||
        {};

    const quotedMessage = contextInfo.quotedMessage || null;
    const normalizedQuoted = unwrapMessage(quotedMessage || {});
    const normalizedQuotedType = Object.keys(normalizedQuoted || {})[0] || '';
    const normalizedQuotedMsg = normalizedQuoted[normalizedQuotedType] || {};

    const quotedBody = normalizedQuoted?.conversation || normalizedQuoted?.extendedTextMessage?.text || normalizedQuoted?.imageMessage?.caption || normalizedQuoted?.videoMessage?.caption || normalizedQuoted?.documentMessage?.caption || normalizedQuoted?.buttonsResponseMessage?.selectedButtonId || normalizedQuoted?.listResponseMessage?.title || ''

    const botIds = [sock.user.id, sock.user.lid, sock.user?.jid]
        .filter(Boolean)
        .map(v => v.split(':')[0].replace('@s.whatsapp.net', '').replace('@lid', ''));

    const quotedParticipant = contextInfo.participant || '';
    const quotedId = quotedParticipant.split(':')[0].replace('@s.whatsapp.net', '').replace('@lid', '');

    const quoted = quotedMessage ? {
        type: normalizedQuotedType,
        body: quotedBody,
        sender: quotedParticipant,
        fromMe: botIds.includes(quotedId),
        media: await parseMedia({
            sock,
            source: {
                key: {
                    remoteJid: chat.id,
                    id: contextInfo.stanzaId,
                    participant: quotedParticipant
                },
                message: normalizedQuoted
            },
            type: normalizedQuotedType,
            msg: normalizedQuotedMsg,
            fileName: normalizedQuotedMsg?.fileName || ''
        })
    } : null;

    const mentions = contextInfo.mentionedJid || [];

    return {
        sock,
        id: m.key.id,
        sender: sender.id,
        senderAlt: sender.alt,
        participant: m.key.participant || '',
        chat: chat.id,
        chatAlt: chat.alt,
        isLid: sender.lid,
        isGroup: isGroup(chat.id),
        type,
        body,
        quoted,
        mentions,
        media,
        pushName: m.pushName || 'Unknown',
        fromMe: m.key.fromMe,
        raw: m
    };
}