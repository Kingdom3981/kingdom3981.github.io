import { SITE_CONFIG } from "./config.js";
import { registerPwa } from "./pwa.js";
import { renderAlertPanels } from "./notifications.js";
import {
  createEl,
  loadJson,
  requireLiveOrDemo,
  setupNavigation,
  validMigrationStatus
} from "./utils.js";

setupNavigation();
registerPwa();
renderAlertPanels();
loadHome();

async function loadHome() {
  try {
    const snapshot = await loadJson(SITE_CONFIG.data.settings);

    if (!requireLiveOrDemo(snapshot)) {
      renderUnavailable();
      return;
    }

    const settings = snapshot.settings || {};

    const migration = settings.migrationStatus;
    const migrationNode = document.querySelector("#migration-status");
    if (validMigrationStatus(migration)) {
      migrationNode.textContent = `Migration: ${migration}`;
      migrationNode.className = `migration-pill ${migration === "Open" ? "status-open" : "status-closed"}`;
    } else {
      migrationNode.textContent = "Migration: Configuration required";
      migrationNode.className = "migration-pill status-unknown";
    }

    renderList("#offer-list", settings.whatWeOffer || []);
    renderList("#looking-list", settings.whoWereLookingFor || []);
    renderDiscord(settings.discordUrl);
  } catch (error) {
    renderUnavailable();
  }
}

function renderList(selector, items) {
  const container = document.querySelector(selector);
  const isOfferGrid = selector === "#offer-list";
  const className = isOfferGrid ? "feature-tile" : "role-tile";
  container.replaceChildren(
    ...items.map((item) =>
      createEl("div", { class: className }, [
        createEl("span", { class: "tile-mark", "aria-hidden": "true" }),
        createEl("strong", { text: item })
      ])
    )
  );
}

function renderDiscord(url) {
  const link = document.querySelector("#discord-link");
  if (!url) {
    link.textContent = "Discord";
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
    return;
  }
  link.textContent = "Discord";
  link.href = url;
  link.removeAttribute("aria-disabled");
}

function renderUnavailable() {
  document.querySelector("#migration-status").textContent = "Migration: Unavailable";
  document.querySelector("#migration-status").className = "migration-pill status-unknown";
}
