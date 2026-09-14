import { SITE_CONFIG } from "./config.js";

export function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");
  const page = document.body.dataset.page;

  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
  });

  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
}

export async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
  return response.json();
}

export function createEl(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === "class") element.className = value;
    else if (key === "text") element.textContent = value;
    else if (key === "html") element.innerHTML = value;
    else element.setAttribute(key, value);
  });
  for (const child of children) {
    if (child === null || child === undefined) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

export function renderDemoBanner(container, snapshot, label = "Demo mode") {
  if (!container) return;
  container.replaceChildren();
  const isDemo = SITE_CONFIG.mode === "demo" || snapshot?.demo || snapshot?.mode === "demo";
  if (!isDemo) return;
  container.append(
    createEl("div", { class: "demo-banner", role: "status" }, [
      createEl("span", { class: "badge", text: label }),
      createEl("p", {
        text:
          "This page is using labelled demonstration data. Live mode will not silently fall back to demo rows."
      })
    ])
  );
}

export function renderNotices(container, warnings = []) {
  if (!container || !warnings.length) return;
  warnings.forEach((warning) => {
    container.append(createEl("div", { class: "notice", role: "status" }, [createEl("p", { text: warning })]));
  });
}

export function validMigrationStatus(value) {
  return value === "Open" || value === "Closed";
}

export function formatUtcDisplay(utcTime) {
  return `${utcTime} UTC/game time`;
}

export function localTimeForUtc(utcTime, date = new Date()) {
  const parsed = parseUtcTime(utcTime);
  if (!parsed) return "";
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), parsed.hours, parsed.minutes));
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(utcDate);
}

export function parseUtcTime(value) {
  const match = String(value || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function getNextDailyOccurrenceUtc(times, now = new Date()) {
  const validTimes = times.map(parseUtcTime).filter(Boolean);
  if (!validTimes.length) return null;

  const candidates = [];
  for (const time of validTimes) {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), time.hours, time.minutes, 0, 0));
    candidates.push(today);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    candidates.push(tomorrow);
  }

  return candidates.filter((candidate) => candidate > now).sort((a, b) => a - b)[0] || null;
}

export function formatDuration(target, now = new Date()) {
  if (!target) return "Schedule to be announced";
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDateTime(value) {
  if (!value) return "Not yet synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function freshnessText(snapshot) {
  const sync = snapshot?.sync || {};
  const lastSuccess = sync.lastSuccessAt;
  const sourceAsOf = snapshot?.source?.asOf;
  const parts = [];
  if (sourceAsOf) parts.push(`Source as of: ${sourceAsOf}`);
  parts.push(`Last successful sync: ${formatDateTime(lastSuccess)}`);
  if (lastSuccess && isStale(lastSuccess, sync.staleAfterHours || SITE_CONFIG.staleAfterHours)) {
    parts.push("Freshness notice: data is stale.");
  }
  return parts;
}

export function isStale(iso, staleAfterHours) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > staleAfterHours * 60 * 60 * 1000;
}

export function isLiveSnapshot(snapshot) {
  return SITE_CONFIG.mode === "live" && snapshot?.mode === "live" && snapshot?.status === "valid";
}

export function requireLiveOrDemo(snapshot) {
  if (SITE_CONFIG.mode === "demo") return true;
  return isLiveSnapshot(snapshot);
}

export function safeText(value) {
  return value === null || value === undefined ? "" : String(value);
}

export function makeAbsolutePath(relativePath) {
  return new URL(relativePath, document.baseURI).pathname;
}
