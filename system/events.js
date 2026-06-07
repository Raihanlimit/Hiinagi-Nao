import fs from 'fs';

const PATH = './database/data/events.json';

function loadEvents() {
  try {
    if (!fs.existsSync(PATH)) {
      return [];
    }

    const raw = fs.readFileSync(PATH, 'utf8');

    if (!raw.trim()) {
      return [];
    }

    const data = JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];
  } catch (err) {
    console.log('[EVENT LOAD ERROR]', err);
    return [];
  }
}

function saveEvents(events) {
  try {
    fs.writeFileSync(
      PATH,
      JSON.stringify(events, null, 2)
    );
  } catch (err) {
    console.log('[EVENT SAVE ERROR]', err);
  }
}

export function getEvents() {
  return loadEvents();
}

export function getEvent(id) {
  return loadEvents().find(
    (v) => v.id === id
  ) || null;
}

export function createEvent(data = {}) {
  const events = loadEvents();

  const event = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8),

    type: data.type || 'unknown',

    chatId: data.chatId || '',

    executeAt:
      data.executeAt ||
      Date.now(),

    payload:
      data.payload || {},

    completed: false,

    createdAt: Date.now(),
  };

  events.push(event);

  saveEvents(events);

  return event;
}

export function removeEvent(id) {
  const events = loadEvents();

  const filtered = events.filter(
    (v) => v.id !== id
  );

  saveEvents(filtered);

  return true;
}

export function completeEvent(id) {
  const events = loadEvents();

  const event = events.find(
    (v) => v.id === id
  );

  if (!event) {
    return false;
  }

  event.completed = true;
  event.completedAt = Date.now();

  saveEvents(events);

  return true;
}

export function updateEvent(id, updates = {}) {
  const events = loadEvents();

  const event = events.find(
    (v) => v.id === id
  );

  if (!event) {
    return null;
  }

  Object.assign(
    event,
    updates
  );

  saveEvents(events);

  return event;
}

export function clearCompletedEvents() {
  const events = loadEvents();

  const filtered = events.filter(
    (v) => !v.completed
  );

  saveEvents(filtered);

  return filtered.length;
}