import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export function parseBuffer(buffer, fileName = '') {
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';

    const media = {
        mime: mimeType,
        data: buffer.toString('base64'),
        buffer,
        fileName,
    };

    media.category = mimeType.startsWith('image/')
        ? 'image'
        : mimeType.startsWith('audio/')
        ? 'audio'
        : mimeType.startsWith('video/')
        ? 'video'
        : 'document';

    return media;
}

export async function parseMedia(filePath) {
    const buffer = fs.readFileSync(filePath);
    return parseBuffer(buffer, path.basename(filePath));
}