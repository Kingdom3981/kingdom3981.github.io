import { SITE_CONFIG } from "./config.js";
import { registerPwa } from "./pwa.js";
import { loadJson, renderDemoBanner, setupNavigation } from "./utils.js";
import { renderDataTable } from "./data-table.js";

setupNavigation();
registerPwa();

const [snapshot, tableConfig] = await Promise.all([loadJson(SITE_CONFIG.data.kvk), loadJson(SITE_CONFIG.data.tableConfig)]);
renderDemoBanner(document.querySelector("#kvk-demo-banner"), snapshot);
renderDataTable(document.querySelector("#kvk-table"), snapshot, tableConfig.tables["kvk-contributions"], "kvk-contributions");
