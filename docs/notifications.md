# Notification Setup

The public website includes a real OneSignal Web SDK integration, but it is inactive until configured.

## Browser Subscription

1. Create a OneSignal app and enable Web Push.
2. In `assets/js/config.js`, set `notifications.appId`.
3. In OneSignal Web settings, use custom service worker settings:
   - Path: `/REPOSITORY/push/onesignal/` for a project site, or `/push/onesignal/` for a user site.
   - Filename: `OneSignalSDKWorker.js`.
   - Scope: same path.
4. On localhost, use a separate OneSignal test app.

The site only requests browser permission after a visitor presses the alert button. Missing configuration, unsupported browsers, denied permission, and subscription failures do not show fake success.

Preference tags:

- `alert_kingdom`
- `alert_bauler`

These use 2 of the 6 Free-plan data tags currently listed by OneSignal. If tag targeting is not available on your plan in the future, set `NOTIFICATION_AUDIENCE_MODE=test` or target all subscribers until the plan supports preferences again.

## Manual Alerts

Use the OneSignal dashboard for immediate leadership alerts:

1. Create a push message.
2. Set title and message.
3. Set destination URL.
4. Choose the audience or test segment.
5. Send a test first.
6. Send immediately when verified.

Never put the OneSignal REST API key in browser code or public data files.

## Automatic Alerts

The `reconcile-notifications.yml` workflow reads the public `Events` snapshot and schedules a rolling window of future messages. It does not need to run at the exact delivery minute.

Repository secrets:

- `ONESIGNAL_APP_ID`
- `ONESIGNAL_API_KEY`

Repository variables:

- `ONESIGNAL_RECONCILE_ENABLED`: set to `true` only when ready for real scheduling.
- `NOTIFICATION_AUDIENCE_MODE`: use `test` during validation. Use `live` when ready.
- `NOTIFICATION_WINDOW_DAYS`: default `14`, keep at or below OneSignal's 30-day scheduling horizon.
- `SITE_URL`: live Pages URL, such as `https://OWNER.github.io/REPOSITORY/`.
- `ONESIGNAL_SCHEDULE_STATE`: managed by the workflow. It stores provider message IDs and occurrence hashes outside the public deployment output.

Edits, disabled rows, and cancellations are reconciled on the next workflow run. Messages already in progress or already sent cannot be reliably withdrawn.
