# Google Sheets Guide

1. Create one Google spreadsheet.
2. Import each file from `templates/csv/` as its own tab:
   - `Kingdom Settings`
   - `Bauler Runs`
   - `Fort Rankings`
   - `KvK Contributions`
   - `Events`
3. In Google Sheets, use **File > Share > Publish to web**.
4. Publish only the tabs intended to be public. Google warns that published files can be visible on the web, and automatic updates can take a few minutes.
5. For each tab, copy the CSV export URL and put it in `data/sync-sources.json`.
6. Keep automatic republication enabled for routine updates.

Public means public: do not place private notes, Discord moderation data, hidden reward decisions, credentials, or subscriber information in published tabs. Hiding a column in the website is not access control. If a field must not be public, remove it from the published tab or add it to `publicExcludedColumns` before snapshot generation.

If a CSV export ever returns HTML, a login page, malformed CSV, or duplicate headers, the sync workflow preserves the last valid live JSON snapshot and records the failure in that snapshot.

Official reference: [Google Docs Editors Help: Make Docs, Sheets, Slides and Forms public](https://support.google.com/docs/answer/183965).
