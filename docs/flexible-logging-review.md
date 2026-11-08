# PR 12: Flexible logging review

Adds Duration and Distance + duration tracking in each exercise's Setup, alongside Load + reps and Bodyweight reps. Enter positive whole seconds and, for cardio, positive kilometres. Valid required measurements automatically complete a set; clearing or invalidating one makes it incomplete. Added sets copy inputs without copying completion. Changing tracking clears inputs only after confirmation when values exist.

New empty exercises assigned to Cardio default to Distance + duration, both when added and when categorized in Setup. Saved exercise choices, explicit timed modes and existing measurements are preserved. Tracking remains changeable in Setup.

Saved workouts, editing, routine copying, exercise suggestions, previous-session references, progress and CSV retain the selected measurement. Distance is stored in metres and entered/displayed in kilometres; time is stored in seconds. Timed sets have null load and reps. Equipment identities separate measurement modes and locations. Progress shows the longest completed duration/distance per session; these are records, not a score or claim of improved fitness. No stopwatch, GPS, pace calculation or calories.

When a draft has no exercises, **Record workout only** opens a centered confirmation showing the session details. It records attendance with no fabricated sets or muscle coverage. Session counts, active days, streaks, calendar and recorded elapsed time include it. Saved detail labels it explicitly and hides Save as routine until exercises exist. Edit details normally or add completed exercises to turn it into a detailed workout. Converting a detailed workout requires removing exercises and explicitly choosing Workout only in the editor.

Schema 9 transactionally replaces the sets table to allow nullable reps and adds duration/distance, routine tracking and the workout-only flag. Legacy numeric values, IDs and revision triggers remain intact. JSON exports use format 2; format 1 imports normalize to the current DTO with explicit defaults. Old apps reject new backups instead of discarding measurements. The fixed CSV header is unchanged: timed values now populate duration_seconds/distance_meters; workout-only entries produce session rows.

## Phone review

1. Before updating, keep a JSON backup of any important journal data. No package install or new native module is required. Reload Expo Go on this branch; migration runs automatically.
2. Log a plank: choose Duration in Setup, enter 45 seconds, add another set, test blank/zero/fractional seconds and completion. Add a cardio exercise with Distance + duration; enter 1.25 km and 600 seconds. Finish, expand the saved exercises and check both measurements.
3. Edit the saved workout; correct duration/distance and reopen it. Save as routine, start a new workout from it, and verify the tracking is retained while sets start incomplete. Choose the saved exercise from suggestions and expand Last time. Other gyms/equipment/modes must not supply those values.
4. Open Exercise progress: inspect duration and distance records/history. Filter Timed / cardio; loaded/bodyweight filters must exclude these exercises. Check dark/light, narrow layouts, large text, keyboards and modal placement on iOS and Android.
5. Start an empty workout, choose location/type/date/time, then Record workout only. Cancel once and confirm no history is added; then confirm. Verify one session/active day, zero sets/coverage, history/calendar access, details editing and deletion. An existing workout draft with exercises must not offer the shortcut.
6. Export CSV and JSON with loaded, bodyweight, timed, cardio, workout-only and unfinished entries. Check no fake reps/load in timed rows. Restore on another app/device and verify values, modes, routines, draft input and counts. Keep an older format-1 backup to verify legacy import.

Local verification on November 8, 2026: 140 domain/component/adapter tests and 35 real SQLite tests pass, along with strict types, lint and SDK dependency alignment. The dependency audit retains its existing 1 low/30 moderate findings and has zero high/critical findings. iOS/Android/web JavaScript exports are checked before PR creation; these are not signed native builds.

Real Chrome checks cover quick-entry cancellation/confirmation and editing, a mixed plank/cardio workout, collapsed saved details, original progress measurements, saved exercise suggestions retaining tracking, previous-session references without autofill, and persisted dark appearance. Progress and timed inputs are checked at 320/390 px. No runtime errors were observed. Screenshots are in `screenshots/native-{quick-workout,timed-logging,cardio-*}.png`.

Physical-device and OS file-sharing review remains with the reviewer; browser verification does not prove native keyboard or sharing behavior.
