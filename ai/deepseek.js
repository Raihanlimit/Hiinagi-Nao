'use strict';

import fs from 'fs';
import crypto from 'crypto';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { solvePow, solveAwsWaf } from './solver.js';
import prompt from './prompt.js';
import { getMemory, saveMemory } from '../system/memory.js';
import { getSession, setSession } from '../system/session.js';
import { getUserIdentity } from '../tools/user.js';

const BASE_URL = 'https://chat.deepseek.com';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36';

const API = {
  LOGIN: '/api/v0/users/login',
  HISTORY: '/api/v0/chat/history_messages',
  POW: '/api/v0/chat/create_pow_challenge',
  SESSION: '/api/v0/chat_session/create',
  CHAT: '/api/v0/chat/completion',
};

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    validateStatus: () => true,
    timeout: 60000,
  })
);

let authToken = '';

function headers(extra = {}) {
  const h = {
    accept: '*/*',
    origin: BASE_URL,
    referer: `${BASE_URL}/`,
    'user-agent': UA,
    'x-app-version': '2.0.0',
    'x-client-version': '2.0.0',
    'x-client-platform': 'web',
    'x-client-locale': 'id',
    'x-client-timezone-offset': '25200',
  };

  if (authToken) {
    h.authorization = `Bearer ${authToken}`;
  }

  return {
    ...h,
    ...extra,
  };
}

async function request(method, path, body = null, extra = {}) {
  const config = {
    url: BASE_URL + path,
    method,
    headers: headers(extra),
  };

  if (body) {
    config.data = body;
    config.headers['content-type'] = 'application/json';
  }

  const res = await client.request(config);

  return {
    status: res.status,
    headers: res.headers,
    data: res.data,
  };
}

async function saveAuth() {
  const cookieArr = await jar.getCookies(BASE_URL);
  const cookieStr = cookieArr.map((v) => `${v.key}=${v.value}`).join('; ');

  fs.writeFileSync('./database/data/cookie.txt', cookieStr);
  fs.writeFileSync('./database/data/token.txt', authToken);
}

async function loadAuth() {
  if (fs.existsSync('./database/data/token.txt')) {
    authToken = fs.readFileSync('./database/data/token.txt', 'utf8').trim();
  }

  if (fs.existsSync('./database/data/cookie.txt')) {
    const saved = fs.readFileSync('./database/data/cookie.txt', 'utf8').trim();

    for (const c of saved.split('; ')) {
      if (!c) continue;
      try {
        await jar.setCookie(c, BASE_URL);
      } catch {}
    }
  }
}

async function clearAuth() {
  authToken = '';

  try {
    fs.unlinkSync('./database/data/token.txt');
  } catch {}

  try {
    fs.unlinkSync('./database/data/cookie.txt');
  } catch {}
}

async function login() {
  console.log('[ DEEPSEEK LOGIN ]');

  await client.get(BASE_URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': UA,
    },
  });

  const waf = await solveAwsWaf(BASE_URL, UA, client);

  if (!waf?.token) {
    throw new Error('WAF gagal');
  }

  await jar.setCookie(`aws-waf-token=${waf.token}`, BASE_URL);
  await jar.setCookie(`aws-waf-token-legacy=${waf.token}`, BASE_URL);

  const loginBody = {
    email: process.env.DEEPSEEK_EMAIL,
    mobile: '',
    area_code: '',
    password: process.env.DEEPSEEK_PASSWORD,
    device_id: 'B' + crypto.randomBytes(48).toString('base64'),
    os: 'web',
  };

  const res = await request('POST', API.LOGIN, loginBody);

  const token =
    res?.data?.data?.biz_data?.user?.token ||
    res?.data?.data?.user?.token ||
    res?.data?.biz_data?.user?.token ||
    res?.data?.user?.token;

  if (!token) {
    console.log(res.data);
    throw new Error('Login gagal');
  }

  authToken = token;

  await saveAuth();
  console.log('[ LOGIN SUCCESS ]');
}

async function createSession() {
  const res = await request('POST', API.SESSION, {
    agent: 'chat',
  });

  return res?.data?.data?.biz_data?.chat_session?.id;
}

async function fetchHistory(sessionId) {
  const res = await request('GET', `${API.HISTORY}?chat_session_id=${sessionId}`);
  return res?.data?.data?.biz_data || null;
}

async function createPowHeader() {
  const powReq = await request('POST', API.POW, {
    target_path: API.CHAT,
  });

  const POW = powReq?.data?.data?.biz_data?.challenge;

  if (!POW) {
    throw new Error('POW ERROR');
  }

  return Buffer.from(JSON.stringify(await solvePow(POW))).toString('base64');
}

async function injectPersona(sessionId, sender, mode) {
  console.log('[ PERSONA INJECT ]');

  const identity = getUserIdentity(sender);
  const starterPrompt = `${prompt(mode)}\n\n${identity}`;
  const POW_HEADER = await createPowHeader();

  const stream = await client.post(
    BASE_URL + API.CHAT,
    {
      chat_session_id: sessionId,
      parent_message_id: null,
      model_type: 'default',
      prompt: starterPrompt,
      ref_file_ids: [],
      thinking_enabled: true,
      search_enabled: false,
      action: null,
      preempt: false,
    },
    {
      headers: headers({
        accept: 'text/event-stream',
        'x-ds-pow-response': POW_HEADER,
      }),
      responseType: 'stream',
    }
  );

  await new Promise((resolve, reject) => {
    let closed = false;

    const done = () => {
      if (closed) return;
      closed = true;
      resolve(true);
    };

    stream.data.on('data', () => {});
    stream.data.on('end', done);
    stream.data.on('close', done);
    stream.data.on('error', reject);
    setTimeout(done, 8000);
  });

  console.log('[ PERSONA READY ]');
}

export async function initDeepSeek() {
  try {
    await loadAuth();

    if (!authToken) {
      throw new Error('NO TOKEN');
    }

    console.log('[ SESSION RESTORED ]');
  } catch {
    await clearAuth();
    await login();
  }
}

export default async function deepseek({ sender, chatId, text, mode = 'public' }) {
  try {
    console.log('[ DEEPSEEK ] start');

    const session = getSession(chatId) || {};
    let sessionId = session.sessionId;
    let lastPersonaInject = session.lastPersonaInject;
    
    if (!sessionId) {
      console.log('[ CREATE SESSION ]');
      
      sessionId = await createSession();
      
      await injectPersona(sessionId, sender, mode);
      
      lastPersonaInject = Date.now();
      setSession(chatId, {
        sessionId,
        lastPersonaInject,
      });
    }
    
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    
    if (!lastPersonaInject || Date.now() - lastPersonaInject >= TWELVE_HOURS) {
      
      console.log('[ PERSONA REFRESH ]');
      
      await injectPersona(sessionId, sender, mode);
      
      lastPersonaInject = Date.now();
      setSession(chatId, {
        ...session,
        sessionId,
        lastPersonaInject,
      });
    }

    const history = await fetchHistory(sessionId);
    const parentMessageId = history?.chat_session?.current_message_id || null;
    const POW_HEADER = await createPowHeader();

    const memory = getMemory(chatId);
    const memoryText = memory.messages.map(v => `${v.role}: ${v.content}`).join('\n');
    
    const stream = await client.post(
      BASE_URL + API.CHAT,
      {
        chat_session_id: sessionId,
        parent_message_id: parentMessageId,
        model_type: 'default',
        prompt: `[ MEMORY ]\n${memoryText}\n\n${text}`,
        ref_file_ids: [],
        thinking_enabled: true,
        search_enabled: true,
        action: null,
        preempt: false,
      },
      {
        headers: headers({
          accept: 'text/event-stream',
          'x-ds-pow-response': POW_HEADER,
        }),
        responseType: 'stream',
      }
    );

    const userMessage = text;

    return await new Promise((resolve, reject) => {
      let buffer = '';
      let result = '';
      let currentType = '';
      
      function parsePacket(packet) {
        const lines = packet.split('\n').filter(v => v.startsWith('data:'));
        if (!lines.length) {
          return;
        }
        
        for (const line of lines) {
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') {
            continue;
          }
          
          try {
            const json = JSON.parse(raw);
            const path = String(json.p || '');
            let text = '';
            if (path === 'response/fragments' && json.o === 'APPEND') {
              const frag = json.v?.[0];
              if (!frag) {
                continue;
              }
              if (frag.type === 'THINK') {
                currentType = 'THINK';
                continue;
              }
              if (frag.type === 'RESPONSE') {
                currentType = 'RESPONSE';
                text = frag.content || '';
              }
            }
            else if (path === 'response/fragments/-1/content' || (!path && typeof json.v === 'string')) {
              if (currentType !== 'RESPONSE') {
                continue;
              }
              text = json.v || '';
            }
            else {
              continue;
            }
            if (!text) {
              continue;
            }
            result += text;
          } catch {}
        }
      }

      stream.data.on('data', (chunk) => {
        buffer += chunk.toString();
        buffer = buffer.replace(/\r\n/g, '\n');
        
        const packets = buffer.split('\n\n');
        
        buffer = packets.pop() || '';
        
        for (const packet of packets) {
          const clean = packet.trim();
          if (!clean) {
            continue;
          }
          parsePacket(clean);
        }
      });

      stream.data.on('end', () => {
        if (buffer.trim()) {
          parsePacket(buffer.trim());
        }

        let final = result.trim();

        if (!final) {
          final = 'hm? 😭';
        }

        saveMemory(chatId, 'user', userMessage);
        saveMemory(chatId, 'assistant', final);

        console.log('[ DEEPSEEK ] done');

        resolve({
          text: final,
        });
      });

      stream.data.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.log('[ DEEPSEEK ERROR ]', err);

    if (err?.response?.status === 401 || err?.response?.status === 403) {
      console.log('[ RELOGIN ]');
      await clearAuth();
      await login();

      return deepseek({
        sender,
        chatId,
        text,
        mode,
      });
    }

    return {
      text: 'yah error 😭',
    };
  }
}
