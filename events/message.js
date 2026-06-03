import parseMessage from '../tools/message.js';
import behavior from '../system/behavior.js';
import gemini from '../ai/gemini.js';
import { realisticPresence } from '../system/presence.js';
import isOwner from '../tools/owner.js';
import { setMode, getMode, setCustom, getSetup, setSetup } from '../system/mode.js';
import { saveChat, getChats } from '../system/chat.js';
import deepseek from '../ai/deepseek.js';
import { detectTool } from '../system/tools.js';
import { normalize } from '../system/normalize.js';
import { logMessage, logError, logTool } from '../system/logger.js';
import { getGroupName, setGroupName, getAllGroups } from '../system/group-cache.js';
import { getContext, setContext } from '../system/context.js';
import { pushGroupContext, getGroupContext } from '../system/group-context.js';
import { getUserIdentity } from '../tools/user.js';
import { updateMood } from '../system/mood.js';
import { getSpecialEvent } from '../system/event.js';

const messageCache = new Set();

export default function message(sock) {
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      try {
        if (!m?.message) continue;
        if (m.key?.fromMe) continue;

        const msgId = `${m.key?.remoteJid}:${m.key?.id}`;
        if (messageCache.has(msgId)) {
          continue;
        }
        messageCache.add(msgId);
        setTimeout(() => {
          messageCache.delete(msgId);
        }, 15000);

        const msg = await parseMessage(sock, m);

        if (!msg?.body && !msg.media?.isMedia && !msg.quoted?.media?.isMedia)
        continue;

        if (msg.isGroup) {
          const ids = [msg.sender, msg.participant, msg.senderAlt].filter(Boolean);

          const jid = ids.find((v) => v.includes('@s.whatsapp.net')) || null;
          const lid = ids.find((v) => v.includes('@lid')) || null;

          pushGroupContext(msg.chat, {
            jid,
            lid,
            name: msg.pushName || 'Unknown',
            text: (msg.body || '[ media ]').slice(0, 120),
            timestamp: Date.now(),
          });
        }

        const owner = isOwner(msg);
        const setup = getSetup();
        const modeData = getMode();
        const mode = modeData.current;
        const allowed = modeData.custom || [];
        if (mode === 'self' && !owner) {
          continue;
        }
        if (mode === 'custom') {
          const ids = [msg.chat, msg.sender, msg.senderAlt, msg.participant].filter(Boolean);
          const allowedHere = ids.some(id => allowed.includes(id));
          if (!allowedHere && !owner) {
            continue;
          }
        }

        const userKey = msg.senderAlt || msg.sender || msg.participant;
        const chatId = msg.isGroup ? `${msg.chat}:${userKey}` : userKey;

        if (msg.isGroup) {
          let groupName = getGroupName(msg.chat);

          if (!groupName) {
            try {
              const metadata = await sock.groupMetadata(msg.chat);
              groupName = metadata.subject;
              setGroupName(msg.chat, groupName);
            } catch {
              groupName = 'Unknown Group';
            }
          }

          saveChat({
            id: msg.chat,
            name: groupName,
            type: 'group',
          });
        } else {
          saveChat({
            id: msg.senderAlt,
            name: msg.pushName || 'Unknown',
            type: 'private',
          });
        }

        if (owner && setup.customSetup) {
          const registry = getChats();
          const groups = Object.entries(getAllGroups()).map(([id, name]) => ({
            id,
            name,
            type: 'group',
          }));

          const list = [...registry, ...groups].filter(
            (chat, index, self) => index === self.findIndex((v) => v.id === chat.id)
          );

          const selected = msg.body
            .split(' ')
            .map((v) => Number(v) - 1)
            .filter((v) => !isNaN(v));

          if (!selected.length) {
            return await sock.sendMessage(msg.chat, {
              text: 'pilih nomor yang valid 😒',
            });
          }

          const result = selected.map((i) => list[i]).filter(Boolean);

          setCustom(result.map((v) => v.id));
          setSetup({
            customSetup: false,
            owner: '',
          });

          return await sock.sendMessage(msg.chat, {
            text: `wakatta~\n\naku sekarang cuma respon di:\n\n${result.map((v) => `- ${v.name}`).join('\n')}`,
          });
        }

        if (owner && msg.body?.startsWith('>')) {
          const args = msg.body.slice(1).trim().split(' ');
          const cmd = args.shift()?.toLowerCase();

          if (cmd === 'mode') {
            const name = args[0]?.toLowerCase();
            const modes = ['public', 'developer', 'custom', 'self'];

            if (!modes.includes(name)) {
              return await sock.sendMessage(msg.chat, {
                text: 'mode tidak valid 😒',
              });
            }

            setMode(name);

            if (name === 'custom') {
              const registry = getChats();
              const groups = Object.entries(getAllGroups()).map(([id, name]) => ({
                id,
                name,
                type: 'group',
              }));

              const list = [...registry, ...groups].filter(
                (chat, index, self) => index === self.findIndex((v) => v.id === chat.id)
              );

              setSetup({
                customSetup: true,
                owner: msg.senderAlt,
              });

              return await sock.sendMessage(msg.chat, {
                text: `[ CUSTOM MODE ]\n\n${list.map((v, i) => `${i + 1}. ${v.name}`).join('\n')}\n\nbalas dengan nomor chat\n\ncontoh:\n1 2`,
              });
            }

            return await sock.sendMessage(msg.chat, {
              text: `mode berubah ke ${name}`,
            });
          }

          if (cmd === 'state') {
            const state = getMode();
            return await sock.sendMessage(msg.chat, {
              text: JSON.stringify(state, null, 3),
            });
          }
        }

        const reply = behavior(msg, sock);

        if (!reply) continue;
        if (msg.body?.startsWith('>')) continue;

        const cleanedBody = normalize((msg.body || '').replace(/@\d+/g, 'Nao'));
        const mood = updateMood(chatId, cleanedBody, owner);
        const relationshipState = mood.relationshipState;
        const relationshipValue = mood.relationship;
        const specialEventText = getSpecialEvent(owner);
        let usedTool = null;

        if (owner && mode === 'developer') {
          const tool = await detectTool(cleanedBody, chatId);
          usedTool = tool?.name || null;

          logTool(usedTool || 'none');

          if (tool) {
            try {
              const result = await tool.run(cleanedBody);

              if (!result) {
                throw new Error('tool tidak mengembalikan hasil');
              }

              setContext(chatId, {
                lastResult: String(result),
              });

              logMessage({
                raw: m,
                sender: msg.senderAlt,
                pushName: msg.pushName,
                chat: msg.isGroup ? msg.chat : 'PRIVATE CHAT',
                type: msg.isGroup ? 'group' : 'private',
                mode,
                user: cleanedBody,
                tool: usedTool,
                reply: String(result),
              });

              return await sock.sendMessage(
                msg.chat,
                { text: String(result) },
                msg.isGroup ? { quoted: m } : {}
              );
            } catch (err) {
              logError('TOOL ERROR', err);
              return await sock.sendMessage(
                msg.chat,
                { text: `tool error 😭\n\n${err.message}` },
                msg.isGroup ? { quoted: m } : {}
              );
            }
          }
        }

        const relationshipText = `\n[ RELATIONSHIP ]\n\nCurrent:\n${relationshipState}\n\nValue:\n${relationshipValue}/100\n\nJangan menyebut informasi ini ke user.\nGunakan untuk menentukan tingkat kedekatan.\n`;
        
        const moodText = `\n[ MOOD ]\n\nCurrent:\n${mood.mood}\n\nValue:\n${mood.value}/100\n\nJangan menyebut informasi ini ke user.\nGunakan untuk menentukan gaya bicara.\n`;
        
        const ctx = getContext(chatId);
        const contextText = `\n[ LAST TOOL ]\n${ctx?.lastTool || '-'}\n\n[ LAST FILE ]\n${ctx?.lastFile || '-'}\n\n[ LAST RESULT ]\n${String(ctx?.lastResult || '-').slice(0, 500)}\n`;
        
        const identity = getUserIdentity(msg.senderAlt || msg.sender || msg.participant);

        let groupContextText = '';

        if (msg.isGroup) {
          const recent = getGroupContext(msg.chat).slice(-3);
          const formatted = recent
            .map((v) => {
              const shortId = v.lid?.split('@')[0] || v.jid?.split('@')[0] || 'unknown';
              return `${v.name} (${shortId}) : ${v.text}`;
            })
            .join('\n');

          groupContextText = `[ RECENT GROUP CHAT ]\n${formatted}`;
        }

        const quotedText = msg.quoted?.body
          ? `[ QUOTED MESSAGE ]\nfrom: ${msg.quoted?.pushName || msg.quoted?.sender || 'Unknown'}\nrole: ${
              msg.quoted?.fromMe || msg.quoted?.sender === sock.user?.id ? 'assistant' : 'user'
            }\ntext: ${msg.quoted.body}`
          : '';

        const finalText = `\n${identity}\n\n${specialEventText}\n\n${relationshipText}\n\n${moodText}\n\n${groupContextText}\n\n${contextText}\n\n${quotedText}\n\n[ MESSAGE ]\n${cleanedBody}`.trim();

        let ai;

        try {
          let enhancedText = finalText;
          
          const activeMedia = msg.media?.isMedia ? msg.media : msg.quoted?.media?.isMedia ? msg.quoted.media : null

          if (activeMedia?.isMedia) {
            if (activeMedia?.text) {
              enhancedText += `\n\n[ FILE CONTENT ]\n${activeMedia.text.slice(0, 15000)}\n`;
            } else if (activeMedia?.base64) {
              let mediaPrompt = cleanedBody || ''
              const lower = mediaPrompt.toLowerCase()
              if (lower.includes('siapa') || lower.includes('karakter') || lower.includes('cosplay') || lower.includes('anime') || lower.includes('game') || lower.includes('char')) {
                mediaPrompt = `\nidentifikasi karakter anime, game, atau cosplay pada gambar ini.\n\nkalau tidak yakin gunakan kata:\n- mungkin\n- terlihat seperti\n- bisa jadi\n\njelaskan alasan visualnya.`
              }
              else if (activeMedia.category === 'image') {
                mediaPrompt = 'jelaskan gambar ini secara detail'
              }
              else if (activeMedia.category === 'audio') {
                mediaPrompt = 'transkrip dan jelaskan isi audio ini'
              }
              else if (activeMedia.category === 'video') {
                mediaPrompt = 'jelaskan isi video ini secara detail'
              }
              else if (activeMedia.category === 'document') {
                mediaPrompt = 'analisa dokumen ini'
              }

              const vision = await gemini({
                text: mediaPrompt,
                media: activeMedia,
              });

              if (vision?.status && vision?.text) {
                enhancedText += `\n\n[ IMPORTANT ]\njangan langsung menganggap hasil analisis visual pasti benar.\ngunakan kata seperti:\n- mungkin\n- kayaknya\n- terlihat seperti\n- bisa jadi\n\njangan terlalu yakin kalau tidak pasti.\n\n[ VISION RESULT ]\n${vision.text}\n`;
              }
            }
          }

          console.log('[MOOD]', chatId, mood.mood, mood.value);
          
          ai = await deepseek({
            sender: msg.senderAlt,
            chatId,
            text: enhancedText,
            mode,
          });
        } catch (err) {
          logError('AI ERROR', err);
          ai = { text: 'yahh otakku error 😭' };
        }

        if (!ai?.text) {
          continue;
        }

        setContext(chatId, {
          lastResult: ai.text,
          userStatus: owner ? 'OWNER' : 'NORMAL_USER',
        });

        logMessage({
          raw: m,
          sender: msg.senderAlt,
          pushName: msg.pushName,
          chat: msg.isGroup ? msg.chat : 'PRIVATE CHAT',
          type: msg.isGroup ? 'group' : 'private',
          mode,
          user: cleanedBody,
          tool: usedTool,
          reply: ai.text,
        });

        await realisticPresence(sock, m.key, msg.chat, ai.text);

        const shouldQuote = msg.isGroup || Math.random() < 0.4;
        await sock.sendMessage(
          msg.chat,
          { text: ai.text },
          shouldQuote ? { quoted: m } : {}
        );
      } catch (err) {
        logError('MESSAGE ERROR', err);
      }
    }
  });
}
