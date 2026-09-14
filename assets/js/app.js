import { SITE_CONFIG } from "./config.js";
import { registerPwa } from "./pwa.js";
import { renderAlertPanels } from "./notifications.js";
import {
  createEl,
  loadJson,
  renderDemoBanner,
  renderNotices,
  requireLiveOrDemo,
  setupNavigation,
  validMigrationStatus
} from "./utils.js";

setupNavigation();
registerPwa();
renderAlertPanels();
loadHome();

async function loadHome() {
  const banner = document.querySelector("#home-demo-banner");
  try {
    const snapshot = await loadJson(SITE_CONFIG.data.settings);
    renderDemoBanner(banner, snapshot);
    renderNotices(banner, snapshot.warnings || []);

    if (!requireLiveOrDemo(snapshot)) {
      renderUnavailable();
      return;
    }

    const settings = snapshot.settings || {};
    document.querySelector("#home-intro").textContent = settings.homepageIntro || "";

    const migration = settings.migrationStatus;
    const migrationNode = document.querySelector("#migration-status");
    if (validMigrationStatus(migration)) {
      migrationNode.textContent = `Migration: ${migration}`;
      migrationNode.className = migration === "Open" ? "status-open" : "status-closed";
    } else {
      migrationNode.textContent = "Migration: Configuration required";
      migrationNode.className = "status-unknown";
    }

    document.querySelector("#current-seed").textContent = `Current seed: ${settings.currentSeed || "Seed D"}`;
    document.querySelector("#target-seed").textContent = `Target seed: ${settings.targetSeed || "Seed D"}`;

    renderList("#offer-list", settings.whatWeOffer || []);
    renderList("#looking-list", settings.whoWereLookingFor || []);
    renderDiscord(settings.discordUrl);
  } catch (error) {
    renderUnavailable();
  }
}

function renderList(selector, items) {
  const list = document.querySelector(selector);
  list.replaceChildren(...items.map((item) => createEl("li", { text: item })));
}

function renderDiscord(url) {
  const link = document.querySelector("#discord-link");
  if (!url) {
    link.textContent = "Discord unavailable";
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
    return;
  }
  link.textContent = "Join our Discord";
  link.href = url;
  link.removeAttribute("aria-disabled");
}

function renderUnavailable() {
  const banner = document.querySelector("#home-demo-banner");
  banner.replaceChildren(
    createEl("div", { class: "notice", "data-tone": "danger", role: "status" }, [
      createEl("p", {
        text:
          "Live mode is enabled, but no valid live kingdom settings snapshot is available. Demo data is not being used as a fallback."
      })
    ])
  );
}
