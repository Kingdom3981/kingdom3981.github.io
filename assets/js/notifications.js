import { SITE_CONFIG } from "./config.js";
import { createEl, makeAbsolutePath } from "./utils.js";

let oneSignalReadyPromise;

export function renderAlertPanels() {
  document.querySelectorAll("[data-alert-panel]").forEach((panel) => renderAlertPanel(panel));
}

function renderAlertPanel(panel) {
  const context = panel.dataset.context || "kingdom";
  const status = createEl("p", { class: "status-line", role: "status" });
  const kingdomCheck = createEl("input", { type: "checkbox", id: `${context}-kingdom-alerts`, checked: "" });
  const baulerCheck = createEl("input", { type: "checkbox", id: `${context}-bauler-alerts` });
  if (context === "bauler") baulerCheck.checked = true;

  const enableButton = createEl("button", { type: "button", class: "primary", text: "Enable alerts" });
  const guidance = createEl("p", {
    text: browserGuidance()
  });

  panel.replaceChildren(
    createEl("div", { class: "preference-row" }, [
      createEl("label", { class: "check-line", for: kingdomCheck.id }, [kingdomCheck, "Kingdom and war alerts"]),
      createEl("label", { class: "check-line", for: baulerCheck.id }, [baulerCheck, "Bauler run reminders"])
    ]),
    createEl("div", { class: "button-row" }, [enableButton]),
    status,
    guidance
  );

  if (!SITE_CONFIG.notifications.appId) {
    status.textContent = "Alerts are not configured yet. The site is usable, but notification success will not be claimed.";
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

      OneSignal.User.addTags({
        [SITE_CONFIG.notifications.preferenceTags.kingdom]: kingdomCheck.checked ? "true" : "false",
        [SITE_CONFIG.notifications.preferenceTags.bauler]: baulerCheck.checked ? "true" : "false"
      });

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
