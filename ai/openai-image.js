import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { toFile } from 'openai/uploads';
import OpenAI from 'openai';

const clients = [];

if (process.env.OPENAI_API_KEY_1) {
    clients.push(new OpenAI({ apiKey: process.env.OPENAI_API_KEY_1 }));
}

if (process.env.OPENAI_API_KEY_2) {
    clients.push(new OpenAI({ apiKey: process.env.OPENAI_API_KEY_2 }));
}

if (!clients.length) {
    throw new Error('OPENAI_API_KEY tidak ditemukan');
}

const TMP_DIR = './tmp';

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

function createOutputPath(prefix = 'nao') {
    return path.join(TMP_DIR, `${prefix}_${Date.now()}.png`);
}

async function withFallback(callback) {
    let lastError;

    for (const client of clients) {
        try {
            return await callback(client);
        } catch (err) {
            lastError = err;
            console.log('[OPENAI FALLBACK]', err?.message || err);
        }
    }

    throw lastError;
}

export async function generateImage({ prompt, filename = null }) {
    const result = await withFallback(client =>
        client.images.generate({
            model: 'gpt-image-2',
            prompt
        })
    );

    const imageBase64 = result?.data?.[0]?.b64_json;

    if (!imageBase64) {
        throw new Error('gambar tidak ditemukan');
    }

    const output = filename || createOutputPath('nao');
    fs.writeFileSync(output, Buffer.from(imageBase64, 'base64'));

    return output;
}

export async function editImage({ image, prompt, filename = null }) {
    const result = await withFallback(async client => {
        const ext = path.extname(image).toLowerCase();
        const mime = ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg';

        const file = await toFile(
            fs.readFileSync(image),
            path.basename(image),
            { type: mime }
        );

        return client.images.edit({
            model: 'gpt-image-2',
            image: [file],
            prompt
        });
    });

    const imageBase64 = result?.data?.[0]?.b64_json;

    if (!imageBase64) {
        throw new Error('gambar tidak ditemukan');
    }

    const output = filename || createOutputPath('nao_edit');
    fs.writeFileSync(output, Buffer.from(imageBase64, 'base64'));

    return output;
}

export default {
    generateImage,
    editImage
};