# PR 15: Live logging and rest timer

PR 15 is stacked on hosted-preview PR 14. Neither PR is merged automatically. This is a rest timer for an active workout; timed exercise measurements such as plank duration remain separate.

## Interaction

The workout screen now says to log each set as you go and finish when the session ends. Valid measurements still mark a set done automatically. A completed exercise gains a **Rest 01:30** button beside **+ Add set**, with matching button sizes and the current duration shown before tapping. Rest starts that interval in one tap (90 seconds initially). It works between sets and between exercises. No timer starts from typing by default.

**Rest timer** near the exercise count opens a centered, bounded, scrollable dialog. Choose 1 minute, 1:30, 2 minutes or custom whole minutes/seconds (1 second to 60 minutes). Starting a new rest replaces the existing countdown. Options apply to this workout:

- **Auto-start after a new set** waits for leaving valid inputs or explicitly marking a copied set done. It fires once for a new set, not per keystroke, when editing older sets, or when editing completed workout history.
- **Notify when rest ends** asks for notification permission only when enabled. It schedules a local completion reminder, not remote push. Denial/failure leaves the visual timer usable and shows an actionable status. Web shows the unavailable-reminder explanation rather than requesting browser notifications.

The compact timer dock occupies layout space below the screen instead of covering fields or Finish workout. Tap its countdown/Options for details. **+30 sec**, **Pause/Resume**, **End rest** and **Restart current rest** are available; expiration shows **Rest complete** and **Done**. Paused time stays paused. The dock remains available while navigating other screens. It uses existing action colors and 44+ px controls, wraps on narrow screens, and avoids announcing every countdown tick to screen readers. Only the countdown component ticks, so workout inputs do not redraw every second.

## Persistence and reminders

Schema 10 adds a transient rest_timer table and an internal rest_epoch field. It copies/changes no completed workout measurements. Countdown uses an absolute deadline; pause stores remaining milliseconds. Navigation, backgrounding and reload retain the clock instead of trusting background JavaScript interval execution. Expired timers do not schedule a late alarm after reopening.

Finish/discard and successful JSON restore clear timer state transactionally. A failed finish or restore retains the recoverable state. Epoch checks prevent a delayed timer action from recreating an old countdown even when a restored draft has the same ID. Only this project's owned reminder IDs are reconciled/cancelled. A reminder scheduling error never rolls back a successfully saved workout or timer.

Rest state and workout-scoped timer options are transient, excluded from JSON/CSV, and do not invalidate a backup inspection merely because rest settings changed. Backup format remains 2; SQLite filenames, workout rows and measurement units stay unchanged. The schema migration is additive, but older app code rejects databases with a newer schema: after opening this timer build, continue using an updated build/preview rather than returning to the older pinned hosted update. Export a fresh JSON backup before phone review.

SDK 58 expo-notifications was installed with Expo's version-aware installer. Local notifications are documented as available in Expo Go; no push tokens, server registration, exact-alarm permission flow, custom sound or signed build is added. Focus/silent/notification settings and OS scheduling can affect delivery; lock-screen sound and Android behavior need physical-device review. Sources: [SDK 58 notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [React Native AppState](https://reactnative.dev/docs/appstate).

## Phone review

1. Export a fresh JSON backup. Use this feature branch locally with `npm ci` and `npm start`, or the timer-specific hosted preview recorded below. Keep using the updated timer build after schema 10 is initialized.
2. Start/resume a workout, add Rope pushdown and enter one set's load/reps. Check completion turns on but no rest starts while typing. Tap Rest and verify the one-tap countdown. Add the next set without losing access to the timer or Finish workout.
3. Pause, wait, extend by 30 seconds, resume, end and restart. Choose a 2-second custom rest and check expiration/Done. Check invalid/zero/fractional duration input and narrow/large-text layouts.
4. Enable auto-start. Log a new set, leave its inputs and verify exactly one timer starts. Changing a completed set or typing multiple digits must not repeatedly restart it. Historical workout editing must not start rest.
5. Enable the local reminder, allow permission for Expo Go and lock the phone during rest. Check sound/banner behavior with your notification/Focus settings. Pause/end/restart/extend before expiry and ensure the superseded reminder does not fire. Deny permission once and verify the visual timer remains usable.
6. Leave the workout for Home, background/reopen, and restart the loaded app. Check deadline-based remaining time, paused recovery and no late alarm for an already expired timer. Finish/discard the workout and confirm the timer ends. Verify normal history, progress, backups and CSV remain unchanged.

Automated tests cover timer math, validation, input commit behavior, controls, permission denial, failed saves, scoped reminder cancellation, migration, same-ID restore fencing and failed-finish rollback. Browser evidence covers one-tap start, pause/extend/resume, navigation/reload, custom expiry, blur-only auto-start, finish cleanup, 320/390 px layouts and dark/light appearance. Native keyboard, background OS delivery, sound and actual force-close behavior remain physical-phone checks.

Local evidence on November 9, 2026: 152 unit/component/adapter tests and 38 actual SQLite tests pass (190 total), along with strict types, lint, SDK alignment, the high/critical audit gate and all-platform JavaScript exports. Audit remains 1 low/30 moderate, zero high/critical. These exports are not signed native builds. Review images are in `screenshots/native-rest-*.png`.
