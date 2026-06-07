import fs from 'fs';
import { generateSelfie } from './media.js';

const EVENT_PATH = './database/data/events.json';

function loadEvents() {
  try {
    if (!fs.existsSync(EVENT_PATH)) {
      return [];
    }

    const raw = fs.readFileSync(EVENT_PATH, 'utf8');

    if (!raw.trim()) {
      return [];
    }

    return JSON.parse(raw);
  } catch (err) {
    console.log('[SCHEDULER LOAD ERROR]', err);
    return [];
  }
}

function saveEvents(events) {
  try {
    fs.writeFileSync(
      EVENT_PATH,
      JSON.stringify(events, null, 2)
    );
  } catch (err) {
    console.log('[SCHEDULER SAVE ERROR]', err);
  }
}

async function processEvent(sock, event) {
  try {
    console.log(
      '[EVENT]',
      event.type,
      event.chatId
    );

    switch (event.type) {

      case 'send_selfie': {

  const photo = await generateSelfie();

  await sock.sendMessage(
    event.chatId,
    {
      image: fs.readFileSync(photo.image),
      caption: photo.caption
    }
  );

  break;
}

      case 'send_cosplay': {
        await sock.sendMessage(
          event.chatId,
          {
            text: 'cosplay test berhasil ✨'
          }
        );
        break;
      }

      default: {
        console.log(
          '[UNKNOWN EVENT]',
          event.type
        );
      }

    }

    return true;
  } catch (err) {
    console.log(
      '[EVENT PROCESS ERROR]',
      err
    );

    return false;
  }
}

async function checkEvents(sock) {
  const events = loadEvents();

  if (!events.length) {
    return;
  }

  const now = Date.now();
  let changed = false;

  for (const event of events) {

    if (event.completed) {
      continue;
    }

    if (event.executeAt > now) {
      continue;
    }

    const success = await processEvent(
      sock,
      event
    );

    if (success) {
      event.completed = true;
      event.completedAt = now;
      changed = true;
    }
  }

  if (changed) {
    saveEvents(events);
  }
}

export function startScheduler(sock) {
  console.log('[SCHEDULER STARTED]');

  checkEvents(sock);

  setInterval(() => {
    checkEvents(sock);
  }, 10000);
}