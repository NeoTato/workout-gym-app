# PR 11: CSV workout history export

Branch: `feat/csv-export`, based on merged PR 10. Leave unmerged for phone review.

1. Implement the fixed CSV header in data-model.md with completed-session/set read models. Keep unsupported catalog-type IDs, routine provenance, exercise duration/distance and notes empty; never infer them. Derive session elapsed seconds from its saved start/end. Preserve zero, decimals, original mass/plate units, bodyweight null loads, snapshots and explicit positions.
2. Test UTF-8 BOM, CRLF records, quoted/multiline/Unicode text, spreadsheet formula/control prefixes (including full-width forms), empty exports and inclusive valid calendar ranges. CSV is for spreadsheet reporting; JSON remains the exact restorable backup.
3. Read a consistent joined snapshot on the existing store queue, ordered by recorded activity date, start/ID, exercise position and set position. Exclude drafts and incomplete sets; retain a session-only row if a completed record has no sets. Verify real SQLite, archived gyms, same-day sessions, backdating/deletion refresh, and no writes/revision changes.
4. Reuse native FileSystem/Sharing and browser download through one shared text-file adapter. Add no packages, database migration, cloud upload, CSV import or unsupported workout logging modes.
5. Add Settings > Export workout history. All history or calendar date range, Preview export, counts/date coverage and a separate Export CSV action. An empty preview explains the header-only file before sharing. Prepared data and counts come from the same snapshot; changing selection clears the old preview. Busy/error/cancel states preserve all workout data.
6. Verify domain/component/storage tests, actual browser download bytes and parsing, dark/light/narrow layouts, types/lint, SDK compatibility, all-platform bundles and audit. Document physical iOS/Android share and spreadsheet review, then open a draft PR.

Text cells are quoted and formula-like/control-leading values receive an apostrophe prefix before CSV escaping. This reduces formula interpretation on initial spreadsheet import; spreadsheet applications can change escaping when re-saving. Never claim universal spreadsheet safety or restore fidelity from CSV. Original text remains in SQLite and JSON backups.
