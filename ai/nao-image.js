import path from 'path';
import deepseek from './deepseek.js';
import { editImage, generateImage } from './openai-image.js';

const REFERENCE_IMAGES = [
    path.resolve('./image/Hiinagi-Nao-1.png'),
    path.resolve('./image/Hiinagi-Nao-2.png'),
    path.resolve('./image/Hiinagi-Nao-3.png')
];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function cleanPrompt(text = '') {
    let result = String(text);
    result = result.replace(/```json/gi, '');
    result = result.replace(/```/g, '');
    return result.trim();
}

async function buildPrompt({
    target = 'nao',
    type = 'selfie',
    mood = 'normal',
    owner = false,
    instruction = '',
    context = '',
    previousPrompt = ''
}) {
    const systemPrompt = `
Kamu adalah prompt engineer profesional untuk GPT Image 2.

Karakter utama:

Hiinagi Nao

Informasi karakter:

- Japanese woman
- long black hair
- blue front highlights
- round glasses
- small dangling earrings

Jika target adalah "nao":

- preserve exact facial identity
- preserve same hairstyle
- preserve same glasses
- preserve same earrings
- preserve same body proportions
- preserve same overall appearance

Target:
${target}

Jenis Foto:
${type}

Mood:
${mood}

Owner:
${owner ? 'yes' : 'no'}

Konteks:
${context || '-'}

Instruksi User:
${instruction || '-'}

${previousPrompt
? `
Prompt Sebelumnya:
${previousPrompt}

Anggap foto sebelumnya adalah foto yang sama.

Pertahankan:
- pakaian
- lokasi
- pencahayaan
- suasana
- framing kamera

Ubah hanya bagian yang diminta user.
`
: ''
}

Aturan:

- photorealistic
- smartphone photo
- natural pose
- natural expression
- realistic lighting
- high detail
- realistic environment
- not anime
- not cartoon

Jika target bukan "nao",
buat foto target tersebut
sesuai konteks percakapan.

Output hanya prompt.
Jangan markdown.
Jangan JSON.
Jangan penjelasan.
`;

    const result = await deepseek({ text: systemPrompt });
    const prompt = cleanPrompt(result?.text || '');

    if (!prompt) {
        return `
Photorealistic smartphone photo.
Natural lighting.
High detail.
Realistic environment.
`;
    }

    return prompt;
}

export async function generateNaoImage({
    target = 'nao',
    type = 'selfie',
    mood = 'normal',
    owner = false,
    instruction = '',
    context = '',
    referenceImage = null,
    previousPrompt = ''
} = {}) {
    const prompt = await buildPrompt({
        target,
        type,
        mood,
        owner,
        instruction,
        context,
        previousPrompt
    });

    console.log('[NAO PROMPT]', prompt);

    let image;

    try {
        if (target === 'nao') {
            const refImage = referenceImage || random(REFERENCE_IMAGES);
            console.log('[TRY REF]', refImage ? path.basename(refImage) : 'null');
            image = await editImage({ image: refImage, prompt });
        } else {
            image = await generateImage({ prompt });
        }
    } catch (err) {
        console.log('[NAO IMAGE FALLBACK]', err?.message || err);
        image = await generateImage({ prompt });
    }

    return {
        image,
        prompt,
        target,
        type,
        mood,
        owner,
        viewOnce: !owner
    };
}

export default {
    generateNaoImage
};