# Owner Guide

## Routine Updates

Update normal kingdom content in Google Sheets:

- Migration status, seeds, homepage lists, and Discord link: `Kingdom Settings`.
- Bauler times, instructions, rewards, route image path, and build images: `Bauler Runs`.
- Rankings: replace rows and columns in `Fort Rankings` or `KvK Contributions`.
- Automatic notifications: edit `Events`.

The sync workflow runs around hourly, can be delayed by GitHub, and can be run manually from GitHub Actions.

## Before Going Live

1. Replace demo rows in the spreadsheet.
2. Publish only the intended tabs.
3. Copy `data/sync-sources.example.json` to `data/sync-sources.json` and add CSV URLs.
4. Run the sync workflow manually once.
5. Confirm snapshots in `data/snapshots/` say `"mode": "live"`.
6. Change `SITE_CONFIG.mode` in `assets/js/config.js` from `demo` to `live`.
7. Add the real Discord URL when ready.
8. Configure OneSignal and test with `NOTIFICATION_AUDIENCE_MODE=test`.

## Alerts

Use OneSignal's dashboard for urgent manual alerts. Use the `Events` tab for scheduled reminders. Keep `ONESIGNAL_RECONCILE_ENABLED` unset or not `true` until test sends are confirmed.
