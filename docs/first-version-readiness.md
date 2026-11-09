# First-version readiness

This review concerns the personal offline Expo app after PRs 1–12. It does not publish an app, produce a signed installer or establish app-store readiness. PR 13 adds repeatable verification and documentation; it does not seed data into the app.

## Automated evidence

Run from `mobile/` with Node 22.17.0:

```powershell
npm ci
npm test
npm run test:storage
npm run typecheck
npm run lint
npx expo install --check
npm audit --audit-level=high
npm run build
```

On November 9, 2026, 142 domain/component/adapter tests and 36 actual SQLite tests passed. Types, lint, SDK dependency alignment and iOS/Android/web JavaScript exports passed. The audit retains 1 low/30 moderate findings with zero high/critical findings. Node's experimental SQLite/type-stripping messages are toolchain warnings; no checks are suppressed. Existing tests cover real-file reopen/draft recovery, atomic finish/edit/restore rollback, invalid/stale backups, schema migration, measurement validation and date/streak boundaries.

The new `tests/readiness.test.mjs` runs under the existing `test:storage` CI step. Its isolated in-memory SQLite fixture contains five years of history: 810 sessions, 780 active days, 12,960 completed sets, mixed original units, bodyweight/timed/cardio measurements, workout-only entries, multiple sessions on a date, a removed gym, a routine, goal history, Dark appearance and unfinished invalid input. It verifies calendar/summary totals, original progress modes, CSV counts, exact JSON data restoration, corrections/deletion and routine independence. Fixture code is confined to `mobile/tests`; it never opens the real journal or runs at app startup.

Desktop observations from one run: history 2 ms (1 read); monthly summaries 5–21 ms (4 reads each); exercise progress 12–14 ms (2 reads each); all-history CSV 196 ms (1 read); JSON snapshot/validation 389 ms (11 reads), about 3.5 MB. These are synthetic Node/SQLite observations, not phone or browser rendering timings. The test reports measurements rather than imposing machine-dependent latency assertions. No indexes, caches or database migration were added without evidence of need.

An isolated Chrome journal restored the same five-year backup through the real file-picker UI, opened day details and monthly summary, then resumed and completed its unfinished cardio set while network requests were disabled. The saved detail showed 2.5 km / 300 seconds. The offline export preview reported 811 workouts / 12,961 sets; a downloaded JSON file confirmed those counts and a cleared draft. After connectivity was restored and Home navigation settled, a full page reload retained the second workout on that date. No runtime errors were observed. Review screenshots are `screenshots/native-readiness-{day,summary,offline,reloaded}.png`. This verifies browser database use after loading, not native force-close behavior or offline web cold loading.

## Phone review matrix

Record the actual device, OS and Expo Go versions with each result. Feature-level approval of earlier PRs does not replace this combined journey. iOS and Android rows remain pending until tested on those devices.

| Check | iOS physical device | Android physical device |
| --- | --- | --- |
| Device / OS / Expo Go version | Pending | Pending |
| Finish a shortened routine; template stays unchanged | Pending | Pending |
| Loaded, bodyweight, timed, cardio and workout-only entries | Pending | Pending |
| Offline logging after the app has loaded | Pending | Pending |
| Background, reopen and force-close draft recovery | Pending | Pending |
| Calendar / summary / progress / streak agreement | Pending | Pending |
| Backdate, edit and delete a saved workout | Pending | Pending |
| JSON file saved outside app cache and restored | Pending | Pending |
| CSV saved and inspected in a spreadsheet | Pending | Pending |
| Light / Dark / System, large text, keyboard and screen reader | Pending | Pending |

## Combined device journey

1. Save a JSON backup through Settings and explicitly save it to Files/Downloads or another chosen destination. Reopen that file to confirm it exists outside the app's cache. A closed share sheet alone is not proof of a durable backup.
2. Start a routine at the correct gym/Home. Skip most exercises and finish one completed exercise. Verify the saved routine still has its original exercises/set counts. Compare last-time references only for the same equipment/location/tracking.
3. Log loaded sets, bodyweight reps, a 45-second plank and a 1.25 km / 600-second cardio set. New Cardio exercises default to distance + duration. Required blank/invalid inputs cannot complete; valid inputs auto-complete; added sets remain incomplete. Cancel a tracking-change confirmation and check that inputs remain.
4. Enable airplane mode after Expo Go has loaded the app. Edit sets, background and reopen the app, then finish. Confirm calendar, history, summaries, progress and goals still work without a network. Record what happens after a full force-close separately: Expo Go's development bundle connection is distinct from SQLite's offline persistence. This is not a claim that the web preview supports offline cold loading.
5. Start another draft with a mix of valid, blank and invalid pending fields. Background and force-close, then reopen using the normal development workflow. Verify exact input recovery. Complete or discard it explicitly.
6. Record a workout-only visit; cancel first and verify no history is created. Confirm it, then check one session and one active day, no invented exercise progress/coverage. Two workouts on one date must count as two sessions and one active day.
7. Backdate a saved workout across a month boundary, change an original measurement, then check calendar/day detail, Month/Year summaries, exercise progress and a fresh CSV preview. Delete a test workout with confirmation and verify the same views update.
8. Export JSON and CSV with the full mixture. In a separate test installation/device, inspect and restore the JSON; verify routines, removed gyms, goals, appearance and any draft. Do not replace the only important copy of your journal during a test. Cancel file picking/replacement once; invalid imports must not change data. Inspect CSV units, zero loads, bodyweight nulls and timed/cardio columns in a spreadsheet.
9. Check Light/Dark/System and larger text, especially modal buttons, decimal/number keyboards, collapsed exercise groups and the bottom action area. With VoiceOver/TalkBack, check field labels, completion state, group expansion and confirmation controls. Record defects with screen, action, expected/actual result and device details.

## Recovery and personal use

The journal is local to the app/device; there is no automatic cloud sync. Keep a recent JSON backup in user-selected storage before reinstalling Expo Go, clearing app data or moving devices. CSV is a report and cannot restore the complete journal.

If opening/migrating storage fails, keep the app data intact and record the error; the app must not reset automatically. Prefer correcting the current build and retrying. Schema 9 / JSON format 2 from PR 12 cannot be read by older builds: reverting code alone does not downgrade the database. Restore a compatible backup only into a compatible build and only after inspecting and explicitly confirming replacement. Do not delete the sole copy of the journal to recover from a development error.

After both device journeys pass, use the app normally and keep backups. Signed standalone/development-build packaging is a separate next step if independence from the Expo development server is needed; no publishing is authorized by this readiness PR.
