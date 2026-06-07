const PHOTO_KEYWORDS = [
    'pap',
    'selfie',
    'foto',
    'fotoin',
    'kirim foto',
    'muka dong',
    'foto dong',
    'pap dong'
];

function containsPhotoRequest(text = '') {
    const lower = text.toLowerCase();

    if (
        lower.includes('lihat kamu') ||
        lower.includes('mana kamu') ||
        lower.includes('foto kamu') ||
        lower.includes('foto mu') ||
        lower.includes('fotomu') ||
        lower.includes('mukamu') ||
        lower.includes('muka kamu')
    ) {
        return true;
    }

    return PHOTO_KEYWORDS.some(keyword => lower.includes(keyword));
}

function detectTarget(text = '', context = '') {
    const lower = `${text} ${context}`.toLowerCase();

    if (
        lower.includes('foto mu') ||
        lower.includes('fotomu') ||
        lower.includes('foto kamu') ||
        lower.includes('muka kamu') ||
        lower.includes('mukamu') ||
        lower.includes('lihat kamu') ||
        lower.includes('mana kamu') ||
        lower.includes('pap') ||
        lower.includes('selfie') ||
        lower.includes('dirimu')
    ) {
        return 'nao';
    }

    if (/\bkucing\b|\bpus\b|\bmeong\b/i.test(lower)) {
        return 'cat';
    }

    if (/\bkamar\b|\broom\b/i.test(lower)) {
        return 'room';
    }

    if (/\bmeja\b|\bdesk\b/i.test(lower)) {
        return 'desk';
    }

    if (/\bsetup\b|\bpc\b|\bkomputer\b|\bgaming\b/i.test(lower)) {
        return 'gaming_setup';
    }

    if (/\bmakanan\b|\bmakan\b|\bfood\b/i.test(lower)) {
        return 'food';
    }

    return 'nao';
}

function shouldReject(mood = 'normal') {
    switch (mood) {
        case 'angry':
            return Math.random() < 0.9;
        case 'badmood':
            return Math.random() < 0.6;
        case 'sleepy':
            return Math.random() < 0.3;
        default:
            return false;
    }
}

export function detectPhotoIntent({ text = '', mood = 'normal', context = '' } = {}) {
    if (!containsPhotoRequest(text)) {
        return null;
    }

    const target = detectTarget(text, context);

    if (shouldReject(mood)) {
        return {
            action: 'reject',
            target
        };
    }

    return {
        action: 'send_photo',
        target
    };
}

export default {
    detectPhotoIntent
};