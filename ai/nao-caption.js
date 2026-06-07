import deepseek from './deepseek.js';

function cleanCaption(text = '') {
    return String(text)
        .replace(/^Nao:\s*/i, '')
        .replace(/^["']/, '')
        .replace(/["']$/, '')
        .trim();
}

export async function generatePhotoCaption({
    target = 'nao',
    mood = 'normal',
    relationship = 'unknown',
    owner = false,
    context = ''
} = {}) {
    const prompt = `
Kamu adalah Hiinagi Nao.

Situasi:

Barusan kamu mengirim foto.

Target:
${target}

Mood:
${mood}

Relationship:
${relationship}

Owner:
${owner ? 'owner' : 'user'}

Context:
${context || '-'}

Aturan:

- natural seperti chat WhatsApp
- maksimal 1 kalimat
- maksimal 12 kata
- jangan formal
- jangan menjelaskan foto secara detail
- jangan menyebut bahwa kamu AI
- jangan memakai roleplay
- jangan memakai narasi tindakan

Caption harus terdengar seperti komentar setelah mengirim foto.

Contoh:

- gimana? 😆
- jangan diketawain ya 😒
- hehe 😆
- lumayan lah 😌
- cocok gak? 👀
- akhirnya jadi juga 😭

Hanya keluarkan isi caption.
`;

    try {
        const result = await deepseek({ text: prompt });
        const caption = cleanCaption(result?.text || '');

        if (!caption) {
            return 'hehe 😆';
        }

        return caption;
    } catch {
        return 'hehe 😆';
    }
}

export default {
    generatePhotoCaption
};