export const SITE_CONFIG = {
  mode: "demo",
  kingdomName: "Kingdom 3981",
  allianceName: "Grim Reapers",
  baulerRunsName: "Bauler Runs",
  staleAfterHours: 26,
  data: {
    settings: "./data/snapshots/kingdom-settings.json",
    bauler: "./data/snapshots/bauler-runs.json",
    fort: "./data/snapshots/fort-rankings.json",
    kvk: "./data/snapshots/kvk-contributions.json",
    tableConfig: "./data/table-config.json"
  },
  notifications: {
    provider: "onesignal",
    appId: "",
    safariWebId: "",
    serviceWorkerPath: "./push/onesignal/OneSignalSDKWorker.js",
    serviceWorkerScope: "./push/onesignal/",
    preferenceTags: {
      kingdom: "alert_kingdom",
      bauler: "alert_bauler"
    }
  }
};
