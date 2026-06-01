'use strict';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const KEY = Buffer.from('6f71a512b1e035eaab53d8be73120d3fb68a0ca346b9560aab3e5cdf753d5e98', 'hex');

const GPU_POOL = JSON.parse(fs.readFileSync(path.join(__dirname, 'webgl.json'), 'utf8'));

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let crc = 0 ^ (-1);
    for (const b of buf) {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ b) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

let wasm;
let memory;
let cachedUint8 = null;
let cachedView = null;
let WASM_VECTOR_LEN = 0;

const encoder = new TextEncoder();

function getUint8() {
    if (!cachedUint8 || cachedUint8.buffer !== memory.buffer) {
        cachedUint8 = new Uint8Array(memory.buffer);
    }
    return cachedUint8;
}

function getView() {
    if (!cachedView || cachedView.buffer !== memory.buffer) {
        cachedView = new DataView(memory.buffer);
    }
    return cachedView;
}

function passString(str) {
    const buf = encoder.encode(str);
    const ptr = wasm.__wbindgen_export_0(buf.length, 1) >>> 0;
    getUint8().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
}

async function initWasm() {
    if (wasm) return;
    const bytes = fs.readFileSync(path.join(__dirname, 'sha3_wasm.wasm'));
    const result = await WebAssembly.instantiate(bytes, {
        wbg: {
            __wbindgen_throw() {
                throw new Error('wasm error');
            }
        }
    });
    wasm = result.instance.exports;
    memory = wasm.memory;
}

async function solvePow(pow) {
    await initWasm();
    const { algorithm, challenge, salt, signature, difficulty, expire_at, expireAt } = pow;
    const prefix = `${salt}_${expireAt ?? expire_at}_`;
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    try {
        const challengePtr = passString(challenge);
        const challengeLen = WASM_VECTOR_LEN;
        const prefixPtr = passString(prefix);
        const prefixLen = WASM_VECTOR_LEN;
        wasm.wasm_solve(retptr, challengePtr, challengeLen, prefixPtr, prefixLen, difficulty);
        const view = getView();
        const status = view.getInt32(retptr, true);
        const answer = view.getFloat64(retptr + 8, true);
        if (status === 0) {
            throw new Error('PoW solve failed');
        }
        return {
            algorithm,
            challenge,
            salt,
            answer: Math.round(answer),
            signature
        };
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function encodePayload(obj) {
    const raw = JSON.stringify(obj);
    const checksum = crc32(Buffer.from(raw)).toString(16).toUpperCase().padStart(8, '0');
    return `${checksum}#${raw}`;
}

function encryptPayload(payload) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    let encrypted = cipher.update(payload, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('hex'), encrypted.toString('hex')].join('::');
}

function randomGpu() {
    return GPU_POOL[Math.floor(Math.random() * GPU_POOL.length)];
}

function randomCanvas() {
    const bins = Array.from({ length: 280 }, () => Math.floor(Math.random() * 120) + 1);
    return {
        hash: Math.floor(Math.random() * 999999999),
        bins
    };
}

function buildMetrics(hasToken = false) {
    return [
        { name: '2', value: 1.7, unit: '2' },
        { name: '100', value: 1, unit: '2' },
        { name: '101', value: 0, unit: '2' },
        { name: '102', value: 4, unit: '2' },
        { name: '103', value: 7, unit: '2' },
        { name: '105', value: 0, unit: '2' },
        { name: '106', value: 0, unit: '2' },
        { name: '107', value: 0, unit: '2' },
        { name: '110', value: 0, unit: '2' },
        { name: '111', value: 140, unit: '2' },
        { name: '1', value: 20, unit: '2' },
        { name: '4', value: 2, unit: '2' },
        { name: '5', value: 0.4, unit: '2' },
        { name: '6', value: 24, unit: '2' },
        { name: '7', value: hasToken ? 1 : 0, unit: '4' },
        { name: '8', value: 1, unit: '4' }
    ];
}

function buildFingerprint(site, ua) {
    const gpu = randomGpu();
    const canvas = randomCanvas();
    const now = Date.now();
    return {
        metrics: {
            fp2: 1,
            browser: 0,
            capabilities: 4,
            gpu: 7,
            math: 0,
            screen: 0,
            navigator: 0,
            subtle: 0,
            canvas: 140
        },
        start: now,
        userAgent: ua,
        location: `${site}/`,
        screenInfo: '1920-1080-1080-24-*-*-*',
        gpu,
        math: {
            tan: '-1.4214488238747245',
            sin: '0.8178819121159085',
            cos: '-0.5753861119575491'
        },
        plugins: [
            { name: 'PDF Viewer' },
            { name: 'Chrome PDF Viewer' },
            { name: 'Chromium PDF Viewer' }
        ],
        canvas: {
            hash: canvas.hash,
            histogramBins: canvas.bins
        },
        capabilities: {
            js: {
                audio: true,
                geolocation: true,
                localStorage: 'supported',
                touch: false,
                video: true,
                webWorker: true
            }
        },
        crypto: {
            subtle: 1,
            encrypt: true,
            decrypt: true,
            sign: true,
            verify: true,
            digest: true,
            randomUUID: true,
            getRandomValues: true
        },
        webDriver: false,
        automation: {
            wd: {
                properties: {
                    document: [],
                    window: [],
                    navigator: []
                }
            }
        },
        errors: [],
        version: '2.4.0',
        id: crypto.randomUUID(),
        end: now + 1
    };
}

function makeClient() {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        withCredentials: true,
        validateStatus: () => true
    }));
    client.jar = jar;
    return client;
}

async function solveAwsWaf(site, ua) {
    const client = makeClient();
    const warmup = await client.get(site, {
        headers: {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': ua
        }
    });
    const html = String(warmup.data || '');
    let challengeUrl = null;
    const regexes = [
        /https:\/\/[a-z0-9.-]+\.token\.awswaf\.com\/[^/"'\s<]+\/[^/"'\s<]+\/[^/"'\s<]+/gi,
        /https:\/\/[a-z0-9.-]+\.edge\.sdk\.awswaf\.com\/[^/"'\s<]+\/[^/"'\s<]+\/[^/"'\s<]+/gi,
        /\/__challenge_[A-Za-z0-9]+\/[a-f0-9]+\/[a-f0-9]+/gi
    ];
    for (const regex of regexes) {
        const match = html.match(regex);
        if (!match?.[0]) continue;
        challengeUrl = match[0];
        if (challengeUrl.startsWith('/')) {
            challengeUrl = site + challengeUrl;
        }
        break;
    }
    if (!challengeUrl) {
        const redirectUrl = warmup.request?.res?.responseUrl;
        if (redirectUrl && redirectUrl.includes('awswaf')) {
            challengeUrl = redirectUrl;
        }
    }
    if (!challengeUrl) {
        fs.writeFileSync('./debug.html', html);
        throw new Error('Challenge URL not found');
    }
    challengeUrl = challengeUrl.replace(/\/challenge\.js.*$/i, '').replace(/\?.*$/, '');
    let finalToken = null;
    for (let round = 0; round < 2; round++) {
        const hasToken = round > 0;
        const metrics = buildMetrics(hasToken);
        const inputsResp = await client.get(`${challengeUrl}/inputs?client=browser`, {
            headers: {
                accept: '*/*',
                origin: site,
                referer: `${site}/`,
                'user-agent': ua
            }
        });
        const challenge = inputsResp.data?.challenge;
        if (!challenge) {
            throw new Error('Challenge invalid');
        }
        const decoded = JSON.parse(Buffer.from(challenge.input, 'base64').toString());
        const challengeType = decoded?.challenge_type;
        const difficulty = decoded?.difficulty || 1;
        const fp = buildFingerprint(site, ua);
        const encoded = encodePayload(fp);
        const encrypted = encryptPayload(encoded);
        let endpoint = 'verify';
        let body;
        let contentType;
        if (challengeType === 'NetworkBandwidth') {
            endpoint = 'mp_verify';
            const boundary = '----WebKitFormBoundary' + crypto.randomBytes(12).toString('hex');
            const solutionData = Buffer.alloc(difficulty === 1 ? 1024 : 10240, 0).toString('base64');
            const metadata = {
                challenge,
                solution: null,
                signals: [{ name: 'Zoey', value: { Present: encrypted } }],
                checksum: encoded.split('#')[0],
                existing_token: finalToken,
                client: 'Browser',
                domain: new URL(site).hostname,
                metrics
            };
            body = [
                `--${boundary}`,
                `Content-Disposition: form-data; name="solution_data"\r\n`,
                solutionData,
                `--${boundary}`,
                `Content-Disposition: form-data; name="solution_metadata"\r\n`,
                JSON.stringify(metadata),
                `--${boundary}--\r\n`
            ].join('\r\n');
            contentType = `multipart/form-data; boundary=${boundary}`;
        } else {
            body = JSON.stringify({
                challenge,
                solution: '0',
                signals: [{ name: 'Zoey', value: { Present: encrypted } }],
                checksum: encoded.split('#')[0],
                existing_token: finalToken,
                client: 'Browser',
                domain: new URL(site).hostname,
                metrics
            });
            contentType = 'text/plain;charset=UTF-8';
        }
        const verifyResp = await client.post(`${challengeUrl}/${endpoint}`, body, {
            headers: {
                accept: '*/*',
                origin: site,
                referer: `${site}/`,
                'content-type': contentType,
                'user-agent': ua
            }
        });
        if (verifyResp.data?.token) {
            finalToken = verifyResp.data.token;
        }
    }
    if (!finalToken) {
        return {
            success: false,
            token: null,
            cookies: []
        };
    }
    await client.jar.setCookie(`aws-waf-token=${finalToken}`, site);
    await client.jar.setCookie(`aws-waf-token-legacy=${finalToken}`, site);
    return {
        success: true,
        token: finalToken,
        cookies: await client.jar.getCookies(site)
    };
}

export {
   solvePow,
   solveAwsWaf
};
