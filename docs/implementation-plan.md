# Native implementation milestones

Status: PRs 1-6 are merged. PR 7 adds the weekly/monthly/annual reporting slice; see [summary scope and phone checklist](summary-review.md). Weekly targets/streaks follow separately. Routines, references, calendar, and saved-workout editing are implemented; new-feature physical iOS/Android review remains pending. Remaining milestone bullets describe the complete target, not claims that all behavior is implemented.

Build in this order, keeping each slice usable and verified before adding the next. Keep prototype fixtures out of the personal database. Native app implementation is the next phase after review of this blueprint.

## 1. Mobile foundation and saved first set

- Scaffold an Expo Router TypeScript app without overwriting the preview. Confirm Expo Go/device SDK compatibility, select resolved versions, install native dependencies with Expo's version-aware installer, commit lockfile, and record actual start/test/typecheck/lint commands in README.
- Port Coral Daylight tokens, fonts, and icon assets. Establish SQLite connection, initial migrations, a Home location, default types/goal, basic repositories, and a minimal Home → open workout → add exercise → save one completed set path.
- Acceptance: launch on physical iOS and Android; save a set offline; restart and retrieve it. Show a useful error on write/migration failure rather than erasing data. No fabricated preview history in the database.

Verification: strict typecheck/lint; migration/repository tests in actual Expo SQLite; platform smoke checks for keyboard, dark/light mode, text scaling, and saved data. This first slice proves the two highest practical risks: device setup and durable writes.

## 2. Flexible session lifecycle

- Add gym creation/selection, equipment variations, loaded/bodyweight/timed/distance measurements, unlimited editable sets, save queue, unfinished-session recovery, quick completion, and atomic Finish/Discard. Capture session/exercise snapshots.
- Add historical session details/edit/delete and date/duration correction. Keep completed content distinct from planned/incomplete sets. Avoid silent loss when navigating away from pending writes.
- Acceptance: finish a session with one chest exercise, several exercises, or quick completion; only completed work appears in history. Double-tapping Finish cannot duplicate sessions. Two locations with the same exercise keep separate equipment references.

Verification: measurement validation, write ordering, background/relaunch, rollback on failed Finish/edit, removal of completed data with confirmation, and idempotent completion. Test quick entry, core reps, plank duration, and cardio duration/distance on devices.

## 3. Routines and last-time references

- Add routine/type creation and editing, ordered slots, optional location alternatives, and copying a routine into an independent draft. Add explicit save-session-as-routine.
- Show recent matching-type sessions at the selected location and previous completed sets for each equipment variation, including sets previously performed in another type of routine. Label other-gym references distinctly.
- Acceptance: start Push, remove all but one exercise, change set count, and finish without changing the saved routine. Start Full Body and retrieve that same equipment's latest sets. A different machine or gym does not auto-fill those weights.

Verification: snapshot stability after rename/archive/template changes; no unwanted cross-equipment comparisons; chosen location validation on alternatives; draft exclusion from last-time queries.

## 4. Calendar and exercise progress

- Feed month navigation and day detail sheets from completed sessions. Link history to exercise/equipment detail, completed-set history, and mode-specific charts/records.
- Acceptance: a date with gym and home sessions opens both, counts as one active day, and retains separate session types. Backdating/editing/deleting a workout updates calendar and exercise progress. Weight charts never compare plate counts or different machines.

Verification: Monday offsets, leap years, month/year rollover, midnight sessions, timezone changes, lbs/kg conversion, archived equipment, and empty states. Check both platforms and screen-reader day labels/focus restoration.

## 5. Targets, streaks, and summaries

- Implement effective-dated weekly targets and shared summary/streak calculations as pure domain functions over completed-session read models. Connect Home, Week/Month/Year views, session-type breakdowns, gym/home counts, recorded time, and completed-exercise muscle coverage.
- Add monthly weekly-consistency and annual active-day-by-month views. Current period says “so far”; incomplete current weeks do not prematurely break streaks.
- Acceptance: a shortened Push counts once as Push; extra core exercises add coverage without inventing a separate Core session. Two separate workouts on one date contribute two sessions and one active day. Changing next week's target preserves earlier weeks' target interpretation.

Verification: cross-year weeks, closed unmet weeks, current week met/unmet, longest/current streak, historical edits/deletion, goals before imported history, pending target replacement, custom/renamed routine types, and unknown session durations. Sum type counts and location counts to the completed-session total.

## 6. JSON backup and atomic restore

- Implement the versioned DTO validator, consistent snapshot export, native file picker/share adapters, inspection counts, explicit replacement confirmation, stale inspection detection, and transactional restoration. Support archived data, goals, settings, and the active draft.
- Acceptance: export on one device and restore on a clean app/device; IDs, settings, session snapshots, original units, targets, and calculated results match. A malformed, unsupported, stale, or failed import changes nothing. Restoring the same file again does not duplicate sessions.
- Verify manual export/restore on both iOS and Android. File picker/share cancellation must be harmless. OS sharing must not be presented as confirmed cloud backup.

Verification: round-trip comparison, referential integrity, duplicate IDs/positions, invalid dates/values, size guard, active-draft conflicts, rollback after injected mid-restore failure, and process interruption at the transaction boundary. Check fixture files under the documented format versions.

## 7. CSV and first-version readiness

- Add all-history/date-range CSV generation and native sharing; preserve quick entries and original units. Verify quoting, Unicode, newline handling, empty exports, and formula-trigger escaping.
- Run the complete personal workflow on both platforms offline: flexible routine → finish → calendar detail → summary/progress → backup → restore → CSV inspection in a spreadsheet.
- Acceptance: activity and session counts match across every view and export; no preview data leaks; logging is comfortable with keyboard/text scaling; failures provide recovery; backups survive a transfer to user-selected storage. Revisit full-history query performance with a multi-year fixture before optimizing or adding indexes beyond observed need.

## Test setup and completion evidence

At scaffold time configure `jest-expo`, React Native Testing Library, strict TypeScript, and the Expo-compatible lint setup; document exact resolved versions and commands. Unit-test date/count/measurement/serialization rules without mocking their logic. Use repository contract tests against actual SQLite on Expo runtimes for persistence/transactions, focused UI tests for editable session behavior, and physical-device journeys for sharing/picking/background recovery. Do not claim a browser-only preview check proves native behavior.

For each milestone, record passing commands, device/OS/runtime versions, and any remaining limitations. Do not lower checks, skip failing tests, introduce silent fallback-to-empty data, or claim a feature complete from a mock. Preserve the approved scope: no server, login, cloud sync, analytics upload, or app-store release is required for this first personal build.
