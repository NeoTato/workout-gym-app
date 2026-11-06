# PR 11: CSV export review

Status: implemented on `feat/csv-export`, based on merged PR 10. Leave unmerged for phone review.

## Workflow

Open the Home gear, **Settings > Export workout history**. Choose **All history** or **Date range** with calendar pickers. Both range endpoints use the workout's stored activity date, independent of the device's current timezone. **Preview export** prepares one consistent snapshot and brings its counts into view. **Export CSV** shares/downloads that exact snapshot. Changing the selection clears the previous preview. Preview/export never changes workouts, drafts, appearance, goals or the database revision.

The preview shows distinct workouts, completed sets, active days and actual workout-date coverage. Empty results clearly explain the column-headings-only file before the export action. Read/share errors can be retried; duplicate taps cannot start duplicate work. On iOS/Android, explicitly save the file from the system share sheet; returning/cancelling does not prove a durable copy exists. Web downloads locally. No cloud upload, CSV import, new dependency or database migration is added.

## CSV contract

The fixed 28-column header is documented in [data-model.md](data-model.md#csv-export-version-1). Rows are ordered by recorded activity date, saved start time/ID, exercise position and set position. Each completed set is a row; session details repeat, so count distinct `session_id` for workouts. A completed session without sets is retained as a `session` row; the app does not yet offer quick-workout logging.

Original loads, decimal precision, lb/kg/plates units, IDs, conventions, recorded timezones and saved exercise/equipment/location labels are retained. Archived gyms remain included. Numeric zero exports as `0`. Bodyweight rows contain reps and empty load/unit/convention fields. Drafts and incomplete sets are excluded. `session_duration_seconds` is derived from saved start/end instants, retaining fractional seconds when present.

The app does not store a session-type catalog ID, source-routine provenance, exercise duration/distance or notes yet; those columns remain empty. No values are guessed from templates or exercise names. CSV is a spreadsheet report, while JSON preserves the complete journal for restoration.

Files use UTF-8 with BOM, CRLF records, quoted text cells and doubled embedded quotes. Embedded newlines/commas stay inside cells. Text starting with formula triggers (including full-width variants), after whitespace/control characters, receives an apostrophe prefix; numeric values are unchanged. This reduces formula interpretation on initial import. Spreadsheet applications can alter escaping on save/reopen, so this is not a universal security guarantee. See [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection). Exact original text remains in SQLite/JSON.

## Validation and phone checklist

Local verification on November 7, 2026: 134 domain/component/adapter tests and 33 real SQLite tests pass, along with types, lint, SDK alignment, all-platform JavaScript exports and the high/critical audit gate. Audit remains at 31 low/moderate findings, zero high/critical.

Automated checks cover date validation, quoting/Unicode/multiline/control/formula text, original units, bodyweight nulls, zero values, fixed ordering, empty exports, snapshot consistency, selection changes, busy states and retry. Real SQLite tests verify archived snapshots, same-day sessions, inclusive filtering, corrections/deletions, draft exclusion and unchanged data/revision. The shared file writer retains JSON sharing behavior. Chrome verifies actual downloaded CSV bytes and independently parses the files, including full/range/empty/future-date exports and dark/narrow layouts, then downloads an intact JSON backup with the same workouts and draft. Physical spreadsheet/native share checks remain pending.

1. Reload Expo Go on the feature branch; no new package install is needed. Open **Settings > Export workout history**.
2. Preview All history. Compare workout/set counts with completed history. Include multiple workouts on one date and an unfinished draft; the draft must stay excluded and recoverable.
3. Choose Date range. Export a single date, then a range spanning month/year boundaries. Include both endpoint dates. An end before the start must show an error and remove the previous export preview.
4. Choose an empty period. Confirm the header-only explanation appears before sharing. Cancelling sharing must leave the journal unchanged.
5. Save a CSV to Files on iPhone and the equivalent destination on Android. Open it in your spreadsheet application. Check non-English names, commas/quotes/newlines, zero loads, decimals, bodyweight reps, archived gyms and mixed original units. Check that formula-like exercise names stay text on initial import; spreadsheet re-saving can change escaping.
6. Edit/backdate/delete a saved workout, then prepare a fresh preview. The export should reflect the correction. Export the same prepared snapshot twice; its data should be identical.
7. Check Light/Dark/System, larger text, calendar popup placement and narrow screens. Use JSON backup/restore, rather than CSV, to transfer the complete journal.

Local required commands are `npm test`, `npm run test:storage`, `npm run typecheck`, `npm run lint`, `npx expo install --check`, `npm run build` and `npm audit --audit-level=high`. Bundle exports verify JavaScript for iOS/Android/web; they are not signed native builds or a substitute for physical-device review.
