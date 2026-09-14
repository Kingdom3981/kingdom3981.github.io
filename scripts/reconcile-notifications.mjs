#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { expandEventRows, uuidFromString } from "./lib/schedules.js";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const forcedDryRun = args.has("--dry-run") || process.env.ONESIGNAL_RECONCILE_ENABLED !== "true";
const now = new Date();
const windowDays = Number(process.env.NOTIFICATION_WINDOW_DAYS || 14);
const minLeadMinutes = Number(process.env.NOTIFICATION_MIN_LEAD_MINUTES || 5);
const appId = process.env.ONESIGNAL_APP_ID || "";
const apiKey = process.env.ONESIGNAL_API_KEY || "";
const audienceMode = process.env.NOTIFICATION_AUDIENCE_MODE || "test";
const stateVariableName = process.env.NOTIFICATION_STATE_VARIABLE || "ONESIGNAL_SCHEDULE_STATE";
const siteUrl = process.env.SITE_URL || "";

const eventsSnapshot = JSON.parse(await fs.readFile(path.join(root, "data", "snapshots", "events.json"), "utf8"));
const state = parseState(process.env.ONESIGNAL_SCHEDULE_STATE || "{}");
const { occurrences, errors } = expandEventRows(eventsSnapshot.rows || [], { now, windowDays, minLeadMinutes });

if (errors.length) {
  for (const error of errors) console.error(`${error.eventId}: ${error.errors.join(" ")}`);
}

const desired = new Map(occurrences.map((occurrence) => [occurrence.key, occurrence]));
const nextState = {
  version: 1,
  updatedAt: now.toISOString(),
  occurrences: { ...(state.occurrences || {}) }
};

const actions = [];
const failures = [];

for (const [key, existing] of Object.entries(state.occurrences || {})) {
  const wanted = desired.get(key);
  const isFuture = new Date(existing.sendAfter) > now;
  if (!wanted && existing.providerId && isFuture) {
    actions.push({ type: "cancel", key, providerId: existing.providerId, reason: "not in current rolling window or disabled" });
  } else if (wanted && existing.contentHash !== wanted.contentHash && existing.providerId && isFuture) {
    actions.push({ type: "cancel", key, providerId: existing.providerId, reason: "content or destination changed" });
    actions.push({ type: "schedule", occurrence: wanted, reason: "replace edited occurrence" });
  }
}

for (const occurrence of occurrences) {
  const existing = nextState.occurrences[occurrence.key];
  if (!existing || existing.contentHash !== occurrence.contentHash) {
    if (!actions.some((action) => action.type === "schedule" && action.occurrence.key === occurrence.key)) {
      actions.push({ type: "schedule", occurrence, reason: "new occurrence" });
    }
  }
}

if (forcedDryRun || !appId || !apiKey) {
  console.log(JSON.stringify({ dryRun: true, reason: forcedDryRun ? "Dry-run mode is active." : "Missing OneSignal credentials.", actions }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

for (const action of actions) {
  try {
    if (action.type === "cancel") {
      await cancelMessage(action.providerId);
      delete nextState.occurrences[action.key];
      console.log(`Canceled ${action.key}: ${action.reason}`);
    } else if (action.type === "schedule") {
      const providerId = await createMessage(action.occurrence);
      nextState.occurrences[action.occurrence.key] = {
        providerId,
        idempotencyKey: uuidFromString(`${action.occurrence.key}|${action.occurrence.contentHash}`),
        contentHash: action.occurrence.contentHash,
        sendAfter: action.occurrence.sendAfter,
        startAt: action.occurrence.startAt,
        audience: action.occurrence.audience
      };
      console.log(`Scheduled ${action.occurrence.key}: ${providerId}`);
    }
  } catch (error) {
    failures.push({ action, message: error.message });
    console.error(`${action.type} failed for ${action.key || action.occurrence?.key}: ${error.message}`);
  }
}

pruneOldState(nextState, now);
await saveState(nextState);

if (failures.length || errors.length) process.exit(1);

async function createMessage(occurrence) {
  const body = {
    app_id: appId,
    target_channel: "push",
    headings: { en: occurrence.title },
    contents: { en: occurrence.message },
    send_after: occurrence.sendAfter,
    idempotency_key: uuidFromString(`${occurrence.key}|${occurrence.contentHash}`),
    ...audiencePayload(occurrence),
    ...(occurrence.destination ? { url: resolveDestination(occurrence.destination) } : {})
  };

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    throw new Error(payload.errors ? JSON.stringify(payload.errors) : `HTTP ${response.status}`);
  }
  return payload.id;
}

async function cancelMessage(messageId) {
  const response = await fetch(`https://api.onesignal.com/notifications/${encodeURIComponent(messageId)}?app_id=${encodeURIComponent(appId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Key ${apiKey}`
    }
  });
  if (!response.ok && response.status !== 404) {
    const payload = await response.text();
    throw new Error(payload || `HTTP ${response.status}`);
  }
}

function audiencePayload(occurrence) {
  if (audienceMode === "test" || occurrence.audience === "test") {
    return { included_segments: ["Test Users"] };
  }
  if (occurrence.audience === "kingdom") {
    return { filters: [{ field: "tag", key: "alert_kingdom", relation: "=", value: "true" }] };
  }
  if (occurrence.audience === "bauler") {
    return { filters: [{ field: "tag", key: "alert_bauler", relation: "=", value: "true" }] };
  }
  return { included_segments: ["Subscribed Users"] };
}

function resolveDestination(destination) {
  if (/^https?:\/\//i.test(destination)) return destination;
  if (!siteUrl) return destination;
  return new URL(destination, siteUrl).toString();
}

function parseState(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : { version: 1, occurrences: {} };
  } catch {
    return { version: 1, occurrences: {} };
  }
}

function pruneOldState(stateObject, referenceDate) {
  for (const [key, value] of Object.entries(stateObject.occurrences || {})) {
    const sendAfter = new Date(value.sendAfter);
    if (Number.isNaN(sendAfter.getTime()) || referenceDate.getTime() - sendAfter.getTime() > 48 * 60 * 60 * 1000) {
      delete stateObject.occurrences[key];
    }
  }
}

async function saveState(stateObject) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  if (!token || !repoFull) {
    console.log("No GitHub token/repository available; schedule state was not persisted.");
    return;
  }

  const value = JSON.stringify(stateObject);
  const [owner, repo] = repoFull.split("/");
  const base = `https://api.github.com/repos/${owner}/${repo}/actions/variables`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2026-03-10"
  };

  const update = await fetch(`${base}/${encodeURIComponent(stateVariableName)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name: stateVariableName, value })
  });
  if (update.status === 204) return;
  if (update.status !== 404) throw new Error(`Could not update GitHub variable: HTTP ${update.status}`);

  const create = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: stateVariableName, value })
  });
  if (create.status !== 201) throw new Error(`Could not create GitHub variable: HTTP ${create.status}`);
}
