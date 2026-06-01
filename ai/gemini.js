import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

if (!API_KEYS.length) {
    throw new Error('Gemini API key tidak ada');
}

let currentKeyIndex = 0;

function getClient() {
    return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
}

function rotateKey() {
    currentKeyIndex++;
    if (currentKeyIndex >= API_KEYS.length) {
        currentKeyIndex = 0;
    }
    console.log(`[ GEMINI ] rotate -> key ${currentKeyIndex + 1}`);
}

export default async function gemini({ text = '', media = null } = {}) {
    let lastError = null;

    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            console.log(`[ GEMINI ] using key ${currentKeyIndex + 1}`);
            const ai = getClient();

            let contents;
            if (!media) {
                contents = text;
            } else {
                contents = [
                    { text },
                    { inlineData: { mimeType: media.mime, data: media.data } }
                ];
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const output = response.text;
            if (!output) {
                throw new Error('empty response');
            }

            return {
                status: true,
                text: output,
                keyIndex: currentKeyIndex + 1
            };
        } catch (err) {
            lastError = err;
            const message = err?.message?.toLowerCase() || '';

            console.log('[ GEMINI ERROR ]', err?.message || err);

            if (
                message.includes('429') ||
                message.includes('quota') ||
                message.includes('resource exhausted') ||
                message.includes('rate limit')
            ) {
                rotateKey();
            }
        }
    }

    return {
        status: false,
        text: String(lastError)
    };
}