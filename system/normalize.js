import fs from 'fs';

const slang = JSON.parse(
    fs.readFileSync('./database/slang/slang-indo.json', 'utf8')
);

function escapeRegex(text = '') {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalize(text = '') {
    let result = text.toLowerCase();

    for (const key in slang) {
        const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi');
        result = result.replace(regex, slang[key]);
    }

    return result;
}