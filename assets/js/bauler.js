import { SITE_CONFIG } from "./config.js";
import { registerPwa } from "./pwa.js";
import { renderAlertPanels } from "./notifications.js";
import {
  createEl,
  formatDuration,
  formatUtcDisplay,
  getNextDailyOccurrenceUtc,
  loadJson,
  localTimeForUtc,
  parseUtcTime,
  renderDemoBanner,
  renderNotices,
  requireLiveOrDemo,
  setupNavigation
} from "./utils.js";

setupNavigation();
registerPwa();
renderAlertPanels();
loadBauler();

async function loadBauler() {
  const banner = document.querySelector("#bauler-demo-banner");
  try {
    const snapshot = await loadJson(SITE_CONFIG.data.bauler);
    renderDemoBanner(banner, snapshot);
    renderNotices(banner, snapshot.warnings || []);
    if (!requireLiveOrDemo(snapshot)) {
      renderScheduleUnavailable();
      return;
    }

    renderRuns(snapshot.runs || []);
    renderInstructions(snapshot.instructions || []);
    renderRewards(snapshot.rewards || []);
    renderRoute(snapshot.routeMap || {});
    renderBuilds(snapshot.builds || []);
    setupImageDialog();
  } catch (error) {
    renderScheduleUnavailable();
  }
}

function renderRuns(runs) {
  const container = document.querySelector("#run-times");
  const validRuns = runs.filter((run) => run.enabled !== false && parseUtcTime(run.utcTime));
  container.replaceChildren();

  if (!validRuns.length) {
    renderScheduleUnavailable();
    return;
  }

  const countdownNode = createEl("div", { class: "countdown", "aria-live": "polite" });
  const nextRunCard = createEl("div", { class: "card" }, [
    createEl("h2", { text: "Next Run" }),
    countdownNode,
    createEl("p", { text: "Countdown uses UTC rollover and updates locally." })
  ]);

  const scheduleCard = createEl("div", { class: "card" }, [
    createEl("h2", { text: "Daily Times" }),
    ...validRuns.map((run) =>
      createEl("div", { class: "time-pair" }, [
        createEl("strong", { text: run.label || SITE_CONFIG.baulerRunsName }),
        createEl("span", { text: formatUtcDisplay(run.utcTime) }),
        createEl("span", { text: `${localTimeForUtc(run.utcTime)} local time` }),
        run.note ? createEl("p", { text: run.note }) : null
      ])
    )
  ]);

  container.append(nextRunCard, scheduleCard);

  const update = () => {
    const next = getNextDailyOccurrenceUtc(validRuns.map((run) => run.utcTime));
    countdownNode.textContent = formatDuration(next);
  };
  update();
  window.setInterval(update, 1000);
}

function renderScheduleUnavailable() {
  const container = document.querySelector("#run-times");
  container.replaceChildren(
    createEl("div", { class: "notice", role: "status" }, [
      createEl("p", { text: "Schedule to be announced. The countdown is hidden until valid UTC run times are configured." })
    ])
  );
}

function renderInstructions(items) {
  const list = document.querySelector("#bauler-instructions");
  list.replaceChildren(...items.map((item) => createEl("li", { text: item })));
}

function renderRewards(items) {
  const container = document.querySelector("#bauler-rewards");
  container.replaceChildren(
    ...items.map((reward) =>
      createEl("div", {}, [
        createEl("h3", { text: reward.title || "Reward note" }),
        createEl("p", { text: reward.description || "" })
      ])
    )
  );
}

function renderRoute(route) {
  const container = document.querySelector("#route-map");
  const img = createEl("img", {
    class: "media-frame",
    src: route.src || "./assets/img/placeholders/bauler-route-placeholder.svg",
    alt: route.alt || "Bauler Runs route placeholder"
  });
  img.addEventListener("error", () => {
    container.replaceChildren(createEl("div", { class: "empty-state", text: "Route image is missing or unavailable." }));
  });
  const button = createEl("button", { type: "button", class: "image-button", "data-large-image": img.src, "data-caption": route.caption || "" }, [img]);
  container.replaceChildren(button, createEl("p", { class: "caption", text: route.caption || "" }));
}

function renderBuilds(builds) {
  const gallery = document.querySelector("#build-gallery");
  gallery.replaceChildren(
    ...builds.map((build) => {
      const img = createEl("img", {
        class: "media-frame",
        src: build.src,
        alt: build.alt || build.caption || "Commander build placeholder"
      });
      img.addEventListener("error", () => {
        img.replaceWith(createEl("div", { class: "empty-state", text: "Build image is missing or unavailable." }));
      });
      return createEl("figure", { class: "card" }, [
        createEl("button", { type: "button", class: "image-button", "data-large-image": build.src, "data-caption": build.caption || "" }, [img]),
        createEl("figcaption", { class: "caption" }, [
          createEl("strong", { text: `${build.march || "March"}: ${build.caption || "Commander build"}` }),
          createEl("br"),
          build.note || ""
        ])
      ]);
    })
  );
}

function setupImageDialog() {
  const dialog = document.querySelector("#image-dialog");
  const dialogImage = document.querySelector("#dialog-image");
  const dialogCaption = document.querySelector("#dialog-caption");
  const closeButton = document.querySelector(".dialog-close");

  document.querySelectorAll("[data-large-image]").forEach((button) => {
    button.addEventListener("click", () => {
      dialogImage.src = button.dataset.largeImage;
      dialogImage.alt = button.querySelector("img")?.alt || "Enlarged image";
      dialogCaption.textContent = button.dataset.caption || "";
      dialog.classList.add("is-open");
      closeButton.focus();
    });
  });

  const close = () => {
    dialog.classList.remove("is-open");
    dialogImage.removeAttribute("src");
  };
  closeButton.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.classList.contains("is-open")) close();
  });
}
