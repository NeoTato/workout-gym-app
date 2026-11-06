# PR 10: JSON backup and restore review

Status: implemented on `feat/json-backup-restore`; leave the PR unmerged until phone review. CSV export is a separate next PR.

## Behavior

The gear at the top right of Home opens **Settings**, where **Backup and restore** lives. Export takes a consistent snapshot after pending writes finish. The file includes workouts, original loads/units, equipment and location identities, archived gyms, exercise categories/subcategories, routine templates, weekly goal history (including a pending target) and the active draft with unfinished input. There are no stored theme/unit preferences yet. Charts and streaks recalculate from restored records.

On iOS/Android, export opens the system share sheet. Choose **Save to Files** or another destination; returning from the share sheet does not prove a copy was saved. Cached files are temporary. Web starts a browser download. JSON is readable personal workout data; there is no app upload or cloud sync.

Choose a file to inspect counts, dates and draft presence. This never writes data. You can export the current journal first, then choose **Review replacement** and explicitly **Replace data**, or **Keep current data**. Restore replaces the complete local dataset, including the draft; it does not append/merge. Restore the same file again without duplicating sessions.

Version 1 matches the implemented schema, refining the original unshipped future blueprint. See [exact contract](data-model.md#json-backup-version-1) and [implementation plan](pr10-plan.md). Unknown fields/versions, invalid relationships/measurements, missing Home/goals, duplicate identities/positions, malformed JSON/UTF-8 and files over 50 MiB are rejected. No file-provided SQL, paths, schema version or revision is executed/accepted.

Schema 7 adds internal revision metadata and transactional triggers for every user-data table. Export/inspection/restore use the existing store queue. Inspection is bound to SHA-256 of both the text and original file bytes plus the database revision. Confirm re-reads the file; changed data/file or a reused inspection requires inspection and confirmation again. Replacement, foreign-key check and revision changes commit together. A write failure rolls back the entire transaction.

## Run on a phone

From `mobile/`, stop Metro if it is running, run `npm ci`, then `npm start -- --clear`. The new Expo DocumentPicker, FileSystem and Sharing packages are SDK 58 compatible and included in Expo Go. This feature does not add a receiving share extension or generate native projects.

1. Make a few completed workouts with Push/Pull subcategories, a gym and Home, mixed lb/kg/plates/bodyweight sets, a routine and a scheduled goal change. Leave an unfinished draft, including a blank set.
2. Open **Settings > Backup and restore**, export JSON and explicitly save it to Files. Open Files and verify the `.json` exists outside the app cache. Cancelling the share sheet must not claim a durable backup or alter workouts.
3. Choose that file. Check the counts/date range and unfinished-workout indication. Cancel the replacement confirmation and confirm the existing journal is unchanged. Cancelling the file picker must also be harmless.
4. Export a safety copy of current data, make a temporary change, then choose the earlier backup and confirm replacement. Check history, dates, original units/equipment, categories, routines, goals/streaks and the resumed draft. Close/reopen the app and check again.
5. Restore the same file again; counts must stay the same. Try a malformed or unsupported JSON file; the app must show an actionable error and retain existing data. Do not delete the safety copy until review is complete.
6. Transfer a backup to the other platform or a clean install and repeat. Check light/dark mode, long filenames, large text, centered confirmation and narrow layouts. Physical iOS and Android picker/share/transfer checks are pending; browser/device-simulator checks do not substitute for these.

## Automated evidence

- Domain/component suite: 119 passing tests, including strict validation, incomplete draft preservation, preview-only selection, confirmation cancellation, busy-state protection, fresh inspection after a failed restore, native picker/share behavior and raw UTF-8 byte hashing.
- Real SQLite suite: 30 passing tests, including exact round trip after file close/reopen, mixed units/zero/bodyweight, archived gyms, routines/goals/draft, stale file/data/token rejection, malformed relationships, original-timezone dates, damaged-checkpoint recovery, schema-six migration and injected mid-restore rollback of data and revision.
- Chrome with an isolated fictional database: actual JSON downloads/file inputs, inspection cancellation, confirmed replacement, exact data equality on re-export, malformed-file preservation, persistence after reload, dark theme and 320/390 px widths. No runtime errors. Screenshots: `screenshots/native-backup-preview.png`, `native-backup-confirmation.png`, `native-backup-dark.png`.
- Strict types, lint, SDK compatibility, all-platform JavaScript exports and the high/critical audit gate are required. Audit baseline remains 31 low/moderate findings, zero high/critical. Native exports are not signed install files.

The 50 MiB limit is a memory guard, not a performance promise for the maximum size. Low-storage/provider permission errors remain retryable; they never trigger an automatic data reset. Restoring is an explicit replacement with no undo beyond a separately saved backup.
