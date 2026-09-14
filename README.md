# Kingdom 3981 Website

Static, mobile-first GitHub Pages site for Kingdom 3981. It includes four public pages, demo data, flexible Sheet-backed JSON snapshots, PWA support, and configurable OneSignal web push.

## Stack

Plain HTML, CSS, JavaScript modules, and Node scripts. There is no server app and no paid dependency.

## Local Preview

```bash
npm test
npm run preview
```

Open `http://localhost:4173/`.

## GitHub Pages Deployment

1. Put this project at the root of a GitHub repository.
2. Push to `main`.
3. In GitHub, go to **Settings > Pages** and choose **GitHub Actions**.
4. The included `deploy.yml` workflow tests and deploys the static site.

The site uses relative URLs, so it works at both `https://OWNER.github.io/` and `https://OWNER.github.io/REPOSITORY/`.

## Demo vs Live

The project ships in demo mode. Demo rows are visibly labelled and never become a silent live fallback.

To enable live data:

1. Import the CSV templates from `templates/csv/` into one Google spreadsheet.
2. Publish only the intended public tabs as CSV.
3. Copy `data/sync-sources.example.json` to `data/sync-sources.json`.
4. Add the published CSV URLs.
5. Run `npm run sync` or the GitHub `Sync public sheet data` workflow.
6. Confirm valid live snapshots.
7. Change `mode: "demo"` to `mode: "live"` in `assets/js/config.js`.

## Data and Tables

Rankings use dynamic headers. New named columns appear without a code change. Configure ordering, labels, types, filters, hidden UI columns, and public exclusions in `data/table-config.json`.

Governor IDs are treated as text so leading zeroes and long IDs are preserved. Sheet values are rendered as text, never executable HTML.

See `docs/data-dictionary.md` and `docs/sheets-guide.md`.

## Notifications

OneSignal is wired but disabled until configured. The public app ID belongs in `assets/js/config.js`; the REST API key belongs only in GitHub Secrets.

See `docs/notifications.md` for browser subscription, manual alerts, recurring alerts, cancellation behavior, and dry-run setup.

## Verified Constraints

External limits and platform behavior were checked on 2026-09-14. See `docs/free-plan-notes.md` for official documentation links covering GitHub Pages, Actions scheduling, OneSignal free limits/API scheduling/cancellation, and iOS web push.

## Useful Commands

```bash
npm test
npm run sync
npm run notifications:dry-run
npm run notifications:reconcile
```
