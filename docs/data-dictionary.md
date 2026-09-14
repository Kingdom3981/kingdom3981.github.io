# Data Dictionary

The site expects one Google spreadsheet with these tabs. Import the CSV files in `templates/csv/` to create the starting structure.

## Kingdom Settings

Required keys:

- `migrationStatus`: exactly `Open` or `Closed` before live mode. The project ships with `Closed` only as a demo default.
- `currentSeed`: displayed as written, default requirement is `Seed D`.
- `targetSeed`: displayed as written, default requirement is `Seed D`.
- `whatWeOffer`: line break or pipe separated homepage list.
- `whoWereLookingFor`: line break or pipe separated homepage list.

Optional keys:

- `discordUrl`: blank shows an honest unavailable button.
- `homepageIntro`: short homepage intro text.

## Bauler Runs

Rows use a `Section` column:

- `run`: uses `Label`, `UTC Time`, `Enabled`, and `Note`. `UTC Time` must be `HH:MM` in UTC/game time.
- `instruction`: uses `Text`.
- `reward`: uses `Title` and `Description`.
- `route`: uses `Image Path`, `Caption`, and `Alt Text`.
- `build`: uses `March`, `Image Path`, `Caption`, `Note`, and `Alt Text`.

If live mode has no valid run times, the page says `Schedule to be announced` and hides the countdown.

## Fort Rankings

Headers are flexible. All nonempty named columns are published and displayed by default in sheet order. Suggested starter columns:

- `Rank`
- `Governor ID`
- `Player`
- `Alliance`
- `Fort Helps`
- `Reset Period`
- `Notes`

Only call a column `Rank` when the source sheet has a rank or `data/table-config.json` defines a future explicit ranking rule.

## KvK Contributions

Headers are flexible. Suggested starter columns:

- `Governor ID`
- `Player`
- `Alliance`
- `KvK Period`
- `Kill Points`
- `Deaths`
- `Honor Points`
- `Notes`

The site shows sheet values as supplied. It does not compute lifetime totals, contribution scores, reward weights, or targets.

## Events

Required for enabled rows:

- `Event ID`: stable identifier. Do not rename it unless you intend to cancel and recreate future messages.
- `Enabled`: `TRUE` or `FALSE`.
- `Title`
- `Message`
- `UTC Time`: `HH:MM`.
- `Recurrence`: `once`, `daily`, or `weekdays:mon,wed`.
- `Reminder Minutes`: integer from `0` to `10080`.
- `Destination`: relative site path or full URL.
- `Audience`: `test`, `kingdom`, `bauler`, or `all`.

One-time events also require `UTC Date` as `YYYY-MM-DD`.
