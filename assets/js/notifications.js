import { SITE_CONFIG } from "./config.js";
import { createEl, makeAbsolutePath } from "./utils.js";

let oneSignalReadyPromise;

export function renderAlertPanels() {
  document.querySelectorAll("[data-alert-panel]").forEach((panel) => renderAlertPanel(panel));
}

function renderAlertPanel(panel) {
  const context = panel.dataset.context || "kingdom";
  const status = createEl("p", { class: "status-line", role: "status" });
  const preferences = [
    ["kingdom", "Kingdom/Event alerts"],
    ["war", "War alerts"],
    ["bauler", "Bauler run reminders"],
    ["codes", "Codes"]
  ];
  const checks = Object.fromEntries(
    preferences.map(([key, label]) => {
      const input = createEl("input", { type: "checkbox", id: `${context}-${key}-alerts`, checked: "" });
      if (context === "bauler") input.checked = key === "bauler";
      return [key, { input, label }];
    })
  );

  const enableButton = createEl("button", { type: "button", class: "primary", text: "Enable alerts" });
  panel.replaceChildren(
    createEl(
      "div",
      { class: "preference-row" },
      preferences.map(([key]) =>
        createEl("label", { class: "check-line", for: checks[key].input.id }, [checks[key].input, checks[key].label])
      )
    ),
    createEl("div", { class: "button-row" }, [enableButton]),
    status
  );

  if (!SITE_CONFIG.notifications.appId) {
    status.textContent = "";
    enableButton.disabled = true;
    return;
  }

  enableButton.addEventListener("click", async () => {
    status.textContent = "Checking notification support...";
    enableButton.disabled = true;
    try {
      const OneSignal = await getOneSignal();
      if (!OneSignal.Notifications.isPushSupported()) {
        status.textContent = "This browser does not support web push for this site.";
        return;
      }

      await OneSignal.Notifications.requestPermission();
      if (!OneSignal.Notifications.permission) {
        status.textContent = "Notification permission was not granted.";
        return;
      }

      await OneSignal.User.PushSubscription.optIn();
      const subscriptionId = OneSignal.User.PushSubscription.id;
      const optedIn = OneSignal.User.PushSubscription.optedIn;
      if (!optedIn && !subscriptionId) {
        status.textContent = "Permission was granted, but the push subscription was not confirmed yet.";
        return;
      }

      OneSignal.User.addTags(
        Object.fromEntries(
          preferences.map(([key]) => [SITE_CONFIG.notifications.preferenceTags[key], checks[key].input.checked ? "true" : "false"])
        )
      );

      status.textContent = "Alerts enabled. Preference tags were submitted to OneSignal.";
    } catch (error) {
      status.textContent = "Alerts could not be enabled. Check browser support and OneSignal setup.";
    } finally {
      enableButton.disabled = false;
    }
  });
}

function getOneSignal() {
  if (oneSignalReadyPromise) return oneSignalReadyPromise;
  oneSignalReadyPromise = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onerror = () => reject(new Error("OneSignal SDK failed to load"));
    document.head.append(script);

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: SITE_CONFIG.notifications.appId,
          safari_web_id: SITE_CONFIG.notifications.safariWebId || undefined,
          allowLocalhostAsSecureOrigin: isLocalhost(),
          autoResubscribe: true,
          notificationClickHandlerMatch: "origin",
          serviceWorkerPath: makeAbsolutePath(SITE_CONFIG.notifications.serviceWorkerPath),
          serviceWorkerParam: {
            scope: makeAbsolutePath(SITE_CONFIG.notifications.serviceWorkerScope)
          },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: false,
                  text: {
                    actionMessage: "Enable Kingdom 3981 alerts?",
                    acceptButton: "Allow",
                    cancelButton: "Cancel"
                  }
                }
              ]
            }
          },
          welcomeNotification: {
            disable: true
          }
        });
        resolve(OneSignal);
      } catch (error) {
        reject(error);
      }
    });
  });
  return oneSignalReadyPromise;
}

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}

function browserGuidance() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const isAndroid = /Android/.test(ua);

  if (isIos && !standalone) {
    return "On iPhone or iPad, add this site to the Home Screen, open it from that icon, then enable notifications on iOS or iPadOS 16.4 or later.";
  }
  if (isAndroid) {
    return "On Android, use a supported browser such as Chrome or Edge and allow notifications when your browser asks.";
  }
  return "Notifications require a supported browser, HTTPS on the live site, and a confirmed browser permission grant.";
}
