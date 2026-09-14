import crypto from "node:crypto";

const WEEKDAY_INDEX = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

export function parseBoolean(value) {
  return ["true", "yes", "1", "enabled", "on"].includes(String(value || "").trim().toLowerCase());
}

export function parseUtcDateTime(dateText, timeText) {
  const time = parseUtcTime(timeText);
  if (!time) return null;
  const date = String(dateText || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const result = new Date(`${date}T${time}:00.000Z`);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function parseUtcTime(value) {
  const match = String(value || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export function expandEventRows(rows, options = {}) {
  const now = options.now || new Date();
  const windowDays = options.windowDays ?? 14;
  const minLeadMinutes = options.minLeadMinutes ?? 5;
  const maxDate = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const occurrences = [];
  const errors = [];

  for (const row of rows) {
    const event = normalizeEvent(row);
    if (!event.enabled) continue;
    const validation = validateEvent(event);
    if (validation.length) {
      errors.push({ eventId: event.eventId || "(missing)", errors: validation });
      continue;
    }

    const starts = event.recurrence === "once" ? expandOnce(event) : expandRecurring(event, now, maxDate);
    for (const startAt of starts) {
      const sendAt = new Date(startAt.getTime() - event.reminderMinutes * 60 * 1000);
      if (sendAt <= new Date(now.getTime() + minLeadMinutes * 60 * 1000)) continue;
      if (sendAt > maxDate) continue;
      occurrences.push({
        key: occurrenceKey(event.eventId, startAt, event.reminderMinutes),
        eventId: event.eventId,
        title: event.title,
        message: event.message,
        destination: event.destination,
        audience: event.audience,
        startAt: startAt.toISOString(),
        sendAfter: sendAt.toISOString(),
        reminderMinutes: event.reminderMinutes,
        contentHash: contentHash(event, sendAt)
      });
    }
  }

  occurrences.sort((a, b) => a.sendAfter.localeCompare(b.sendAfter));
  return { occurrences, errors };
}

export function normalizeEvent(row) {
  return {
    eventId: pick(row, "Event ID", "event_id", "id"),
    enabled: parseBoolean(pick(row, "Enabled", "enabled")),
    title: pick(row, "Title", "title"),
    message: pick(row, "Message", "message"),
    utcDate: pick(row, "UTC Date", "utc_date", "date"),
    utcTime: pick(row, "UTC Time", "utc_time", "time"),
    recurrence: String(pick(row, "Recurrence", "recurrence") || "once").trim().toLowerCase(),
    reminderMinutes: Number(pick(row, "Reminder Minutes", "reminder_minutes") || 0),
    destination: pick(row, "Destination", "destination", "url") || "./",
    audience: String(pick(row, "Audience", "audience") || "test").trim().toLowerCase()
  };
}

export function validateEvent(event) {
  const errors = [];
  if (!event.eventId) errors.push("Event ID is required.");
  if (!event.title) errors.push("Title is required.");
  if (!event.message) errors.push("Message is required.");
  if (!parseUtcTime(event.utcTime)) errors.push("UTC Time must be HH:MM.");
  if (!Number.isInteger(event.reminderMinutes) || event.reminderMinutes < 0 || event.reminderMinutes > 10080) {
    errors.push("Reminder Minutes must be an integer from 0 to 10080.");
  }
  if (event.recurrence === "once" && !parseUtcDateTime(event.utcDate, event.utcTime)) {
    errors.push("One-time events require UTC Date as YYYY-MM-DD.");
  }
  if (!["once", "daily"].includes(event.recurrence) && !event.recurrence.startsWith("weekdays:")) {
    errors.push("Recurrence must be once, daily, or weekdays:mon,wed.");
  }
  return errors;
}

export function occurrenceKey(eventId, startAt, reminderMinutes) {
  return `${eventId}|${startAt.toISOString()}|${reminderMinutes}`;
}

export function uuidFromString(text) {
  const hash = crypto.createHash("sha256").update(text).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function expandOnce(event) {
  return [parseUtcDateTime(event.utcDate, event.utcTime)].filter(Boolean);
}

function expandRecurring(event, now, maxDate) {
  const starts = [];
  const [hours, minutes] = event.utcTime.split(":").map(Number);
  const weekdays = event.recurrence.startsWith("weekdays:") ? parseWeekdays(event.recurrence) : null;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));

  while (cursor <= maxDate) {
    if (cursor > now && (!weekdays || weekdays.has(cursor.getUTCDay()))) {
      starts.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return starts;
}

function parseWeekdays(value) {
  const set = new Set();
  const list = value.split(":")[1] || "";
  for (const part of list.split(/[|,;\s]+/).filter(Boolean)) {
    if (WEEKDAY_INDEX[part.toLowerCase()] !== undefined) set.add(WEEKDAY_INDEX[part.toLowerCase()]);
  }
  return set;
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return String(row[key]).trim();
  }
  return "";
}

function contentHash(event, sendAt) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify([event.title, event.message, event.destination, event.audience, sendAt.toISOString()]))
    .digest("hex");
}
