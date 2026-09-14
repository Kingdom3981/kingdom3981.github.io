import { SITE_CONFIG } from "./config.js";
import { registerPwa } from "./pwa.js";
import { loadJson, renderDemoBanner, setupNavigation } from "./utils.js";
import { renderDataTable } from "./data-table.js";

setupNavigation();
registerPwa();

const [snapshot, tableConfig] = await Promise.all([loadJson(SITE_CONFIG.data.fort), loadJson(SITE_CONFIG.data.tableConfig)]);
renderDemoBanner(document.querySelector("#fort-demo-banner"), snapshot);
renderDataTable(document.querySelector("#fort-table"), snapshot, tableConfig.tables["fort-rankings"], "fort-rankings");
