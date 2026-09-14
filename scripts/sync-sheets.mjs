#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { csvToObjects } from "./lib/csv.js";

const root = process.cwd();
const sourcesPath = path.join(root, "data", "sync-sources.json");
const snapshotsDir = path.join(root, "data", "snapshots");
const tableConfigPath = path.join(root, "data", "table-config.json");
const now = new Date().toISOString();

const sourceConfig = await readJsonIfExists(sourcesPath);
if (!sourceConfig) {
  console.log("No data/sync-sources.json found. Copy data/sync-sources.example.json when live Sheets are ready.");
  process.exit(0);
}

const tableConfig = (await readJsonIfExists(tableConfigPath)) || { tables: {} };
let hadFailure = false;

for (const [dataset, source] of Object.entries(sourceConfig.sources || {})) {
  const csvUrl = String(source.csvUrl || "").trim();
  if (!csvUrl) {
    console.log(`${dataset}: no CSV URL configured; leaving existing snapshot untouched.`);
    continue;
  }

  try {
    const csv = await fetchCsv(csvUrl);
    const snapshot = normalizeDataset(dataset, csv, sourceConfig.mode || "live", source.tab, tableConfig);
    await writeJson(path.join(snapshotsDir, `${dataset}.json`), snapshot);
    console.log(`${dataset}: synced ${snapshot.rows?.length ?? snapshot.runs?.length ?? "settings"} records.`);
  } catch (error) {
    hadFailure = true;
    await preserveLastValid(dataset, error, source.tab, sourceConfig.mode || "live");
  }
}

if (hadFailure) {
  console.log("One or more sources failed. Existing valid snapshots were preserved or unavailable snapshots were written.");
}
process.exit(0);

async function fetchCsv(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    throw new Error("Source returned HTML instead of CSV. Check publication and permissions.");
  }
  return text;
}

function normalizeDataset(dataset, csv, mode, tab, tableConfig) {
  const parsed = csvToObjects(csv);
  if (parsed.duplicateHeaders.length) throw new Error(`Duplicate headers: ${parsed.duplicateHeaders.join(", ")}`);
  if (parsed.missingHeaders.length) throw new Error(`Missing headers: ${parsed.missingHeaders.join(", ")}`);

  if (dataset === "kingdom-settings") return normalizeSettings(parsed, mode, tab);
  if (dataset === "bauler-runs") return normalizeBauler(parsed, mode, tab);
  if (dataset === "fort-rankings" || dataset === "kvk-contributions") {
    return normalizeTable(dataset, parsed, mode, tab, tableConfig.tables?.[dataset] || {});
  }
  if (dataset === "events") return normalizeEvents(parsed, mode, tab);
  throw new Error(`Unknown dataset: ${dataset}`);
}

function baseSnapshot(dataset, mode, tab) {
  return {
    dataset,
    mode,
    demo: false,
    status: "valid",
    source: {
      tab,
      asOf: "",
      trackingPeriod: ""
    },
    sync: {
      lastSuccessAt: now,
      lastAttemptAt: now,
      staleAfterHours: 26,
      failures: []
    },
    warnings: []
  };
}

function normalizeSettings(parsed, mode, tab) {
  const snapshot = baseSnapshot("kingdom-settings", mode, tab);
  const settings = {};
  for (const row of parsed.rows) {
    const key = pick(row, "Key", "Setting", "Name");
    const value = pick(row, "Value", "Text");
    if (!key) continue;
    settings[toCamelKey(key)] = parseSettingValue(key, value);
  }
  const status = settings.migrationStatus;
  if (!["Open", "Closed"].includes(status)) {
    throw new Error("Kingdom Settings must configure migrationStatus as Open or Closed before live mode.");
  }
  snapshot.settings = settings;
  return snapshot;
}

function normalizeBauler(parsed, mode, tab) {
  const snapshot = baseSnapshot("bauler-runs", mode, tab);
  const runs = [];
  const instructions = [];
  const rewards = [];
  const builds = [];
  let routeMap = null;

  for (const row of parsed.rows) {
    const section = pick(row, "Section", "Type").toLowerCase();
    if (section === "run") {
      runs.push({
        label: pick(row, "Label", "Title") || "Daily Run",
        utcTime: pick(row, "UTC Time", "Time"),
        enabled: !["false", "no", "0"].includes(pick(row, "Enabled").toLowerCase()),
        note: pick(row, "Note", "Notes")
      });
    } else if (section === "instruction") {
      const text = pick(row, "Text", "Description", "Message");
      if (text) instructions.push(text);
    } else if (section === "reward") {
      rewards.push({ title: pick(row, "Title", "Label"), description: pick(row, "Description", "Text") });
    } else if (section === "route") {
      routeMap = {
        src: pick(row, "Image Path", "Path", "URL"),
        alt: pick(row, "Alt Text", "Alt"),
        caption: pick(row, "Caption", "Description")
      };
    } else if (section === "build") {
      builds.push({
        march: pick(row, "March", "Label"),
        caption: pick(row, "Caption", "Title"),
        note: pick(row, "Note", "Notes"),
        src: pick(row, "Image Path", "Path", "URL"),
        alt: pick(row, "Alt Text", "Alt")
      });
    }
  }

  snapshot.runs = runs;
  snapshot.instructions = instructions;
  snapshot.rewards = rewards;
  snapshot.routeMap = routeMap || {};
  snapshot.builds = builds;
  return snapshot;
}

function normalizeTable(dataset, parsed, mode, tab, config) {
  const snapshot = baseSnapshot(dataset, mode, tab);
  const excluded = new Set(config.publicExcludedColumns || []);
  const headers = parsed.headers.filter((header) => !excluded.has(header));
  const rows = parsed.rows.map((row) => {
    const clean = {};
    for (const header of headers) clean[header] = row[header] ?? "";
    return clean;
  });
  snapshot.headers = headers;
  snapshot.rows = rows;
  snapshot.source.trackingPeriod = inferTrackingPeriod(rows, config.filters?.periodColumn);
  return snapshot;
}

function normalizeEvents(parsed, mode, tab) {
  const snapshot = baseSnapshot("events", mode, tab);
  snapshot.headers = parsed.headers;
  snapshot.rows = parsed.rows;
  return snapshot;
}

async function preserveLastValid(dataset, error, tab, mode) {
  const target = path.join(snapshotsDir, `${dataset}.json`);
  const existing = await readJsonIfExists(target);
  const failure = { at: now, message: error.message };
  if (existing && existing.status === "valid" && existing.mode === mode) {
    existing.sync = existing.sync || {};
    existing.sync.lastAttemptAt = now;
    existing.sync.failures = [failure, ...(existing.sync.failures || [])].slice(0, 5);
    await writeJson(target, existing);
    console.error(`${dataset}: sync failed; preserved last valid snapshot from ${existing.sync.lastSuccessAt}. ${error.message}`);
    return;
  }
  const unavailable = baseSnapshot(dataset, mode, tab);
  unavailable.status = "unavailable";
  unavailable.sync.lastSuccessAt = null;
  unavailable.sync.failures = [failure];
  unavailable.headers = [];
  unavailable.rows = [];
  await writeJson(target, unavailable);
  console.error(`${dataset}: sync failed and no valid live snapshot exists. ${error.message}`);
}

function parseSettingValue(key, value) {
  if (["whatWeOffer", "whoWereLookingFor"].includes(toCamelKey(key))) {
    return String(value || "")
      .split(/\n|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

function toCamelKey(value) {
  return String(value)
    .trim()
    .replace(/[_\s-]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function inferTrackingPeriod(rows, periodColumn) {
  if (!periodColumn) return "";
  const values = [...new Set(rows.map((row) => row[periodColumn]).filter(Boolean))];
  return values.length === 1 ? values[0] : "";
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return String(row[key]).trim();
  }
  return "";
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
