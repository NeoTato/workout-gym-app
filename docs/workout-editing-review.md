# Saved workout editing and deletion

## Scope and acceptance

Open a completed workout from Home and choose **Edit workout**. Change its saved location, session type, exercises, equipment labels, units, load conventions, and sets. Add/remove exercises and sets without a fixed count. Save explicitly or cancel to keep the original. Date and start/end times can be corrected. Session ID and recorded timezone stay unchanged; untouched date/time fields preserve exact original timestamps.

Existing sets start marked done. In both logging and historical editing, entering valid measurements automatically marks a set done. Loaded sets require a finite nonnegative load (including zero) and positive whole-number reps; bodyweight sets require only reps. Clearing or invalidating either required value makes the set incomplete and disables manual completion. Copied sets start incomplete even with valid copied values; edit a measurement or tap Done to confirm them. Valid sets may still be manually unchecked. Changing tracking mode, units, or load convention clears completion for explicit reconfirmation or a subsequent measurement edit.

To avoid silently omitting edited work, Save requires every remaining set marked done and every remaining exercise to contain a set. At least one valid completed set is required. Remove unwanted sets/exercises explicitly. New gyms can still be created in the normal workout flow; historical editing selects existing locations.

**Delete workout** opens an in-page confirmation naming the permanent effect. **Keep workout** changes nothing. **Permanently delete workout** removes that session and its sets, then returns Home.

## Persistence and failure behavior

- Editing uses an independent in-memory copy. It never overwrites the active workout draft. Cancel, leaving the screen, or restarting before Save discards unsaved historical edits; the saved workout remains unchanged.
- Update validates first, then replaces exercise/set rows and location/type snapshots in one serialized SQLite transaction. Existing schema version 1 is sufficient; no migration or database reset is needed.
- A failed write rolls back both deleted and inserted rows. Errors keep the editor available for retry. A missing/deleted session cannot be recreated by an update.
- Deletion uses existing foreign-key cascades and affects only the selected session. Shared exercise/equipment catalog records remain available; the active draft and other workouts remain intact.
- New and saved workouts include start/end dates and times selected through system calendars and time pickers, interpreted in the displayed recorded timezone. Editing a same-day start date also moves its end date. Separate end dates support overnight sessions. Normal live logging still ends at Finish unless timing is edited.
- Invalid dates/times, nonexistent daylight-saving times, an end before the start, and future end times are rejected before any history changes. Activity date follows the selected start date, so Home ordering reflects backdated sessions. No database migration is needed.
- Timezone changes, edit autosave/recovery, undo deletion, charts, calendars, summaries, and export are outside this PR.

## Device review checklist

1. Stop and restart Expo once after the new picker dependency is installed, then reopen the app. A fresh checkout needs `npm ci` in `mobile`. The SDK-compatible system picker is included in Expo Go; a custom native build is not required. While logging a new workout, set yesterday's Start date, select Start/End time using the picker, and finish. Verify the saved details show yesterday and the intended times. Reopen the app and verify persistence.
2. Open a completed workout, tap Edit, change dates/times and values, then Cancel. Confirm the original remains. Repeat and Save: verify the corrected date/time and Home ordering. Try an overnight session with the next day as End date. Verify iPhone Cancel keeps the old value, Done applies it, Android dismissal changes nothing, and end-before-start is rejected. No manual date/time text entry is offered on mobile.
3. Edit again and clear reps/load. Confirm the set becomes incomplete and cannot be marked done. Save must show guidance and retain the editor. Refill valid values and confirm automatic completion. Check zero load, invalid/zero reps, and bodyweight reps without load.
4. Add a copied set: confirm it starts incomplete, then edit its measurements or tap Done to confirm it. Save and confirm details and Home reflect the changes. Fully close/reopen Expo Go and verify persistence. Repeat the completion checks while logging a new workout.
5. Add/remove sets and exercises, including bodyweight sets. Confirm only explicitly removed work disappears. Invalid/empty measurements must not overwrite history.
6. Start an unfinished workout, return Home, edit a completed session, then resume the unfinished workout. Confirm its draft remains intact.
7. On a disposable session, choose Delete, then Keep workout. Reopen it and confirm nothing changed.
8. Delete that disposable session and confirm it remains absent after reopening. Other sessions and the active draft must remain.
9. Check light/dark appearance, large text, keyboard scrolling, and removal confirmations. Native iOS/Android testing remains necessary even after browser and automated tests pass.

## Verification evidence

Sixteen component tests cover Cancel without mutation, automatic completion, invalid/empty values, zero load, bodyweight semantics, copied-set confirmation, manual undo, and save failure/retry. Eight real SQLite/domain tests cover update rollback, preservation of timestamps/drafts, scoped deletion, stale edits after deletion, foreign keys, backdating, overnight duration, timezone/DST conversion, invalid timing rejection, and file close/reopen after both update and deletion. Type checking, zero-warning lint, and iOS/Android/web bundle exports pass.

A 390px browser journey before the automatic-completion feedback change passed create/finish, edit cancellation, edited-set validation, save, cancellation of deletion, and confirmed deletion using Expo's SQLite worker, with no runtime errors in that journey. The subsequent completion behavior is covered by component tests and awaits device review. Browser reload testing separately encountered `Invalid VFS state` from Expo SQLite's web worker initialization; browser reload persistence is not claimed. No dependency patch or database reset was applied. Verify persistence on the intended iOS/Android runtimes before merging.

## Picker dependency

`@react-native-community/datetimepicker` 9.2.1 was installed with `npx expo install` for SDK 58. It has no new runtime dependency tree; its moderate audit entry is inherited from the existing Expo tooling chain. Audit now reports 45 low/moderate entries (1 low, 44 moderate), zero high/critical. No force-upgrade or audit suppression was applied. Web uses browser date/time controls with character typing/paste blocked; mobile uses native calendar/clock UI. Physical-device visual checks remain pending.

Picker verification: 16 component tests pass, including calendar confirmation, clock confirmation, iPhone Cancel, Android dismissal, same-day end-date movement, and workout Cancel. Browser smoke check confirms two date controls, two time controls, blocked arbitrary character typing, and no runtime errors. iOS/Android/web exports, TypeScript, lint, and Expo version compatibility pass. Native picker rendering still needs physical-device review.

## Separate setup and logging screens

New workouts begin with session setup: location, session type, and collapsed date/time controls. Continue validates location and timing, records setup completion in the existing draft checkpoint, and opens exercise logging. Logging shows only a compact type/location/date summary, Edit details, and exercise/set controls. Switching screens resets scroll position without losing entries. Home and resume return configured drafts directly to logging; unfinished setup returns to setup. Older drafts with a selected location remain compatible without a migration.

Saved-workout editing separates Session details and Exercises. Both sections share one in-memory edit, with Save/Cancel available in either. No new dependency or server restart is needed for this UI change.

Review: start a new workout, expand/cancel date selection, choose location/type, Continue, enter several sets, Edit details, change the type, return to logging, and verify all set values. Go Home and Resume: configured drafts must open logging directly. Reopen Expo Go and repeat. Edit a saved workout, switch sections and Save/Cancel, checking both details and sets.

Verification: 19 component tests cover setup-first navigation, required location, collapsed time controls, retention across screen changes, direct resume, and saved-edit section changes. Eight SQLite/domain tests include setup-completion checkpoint persistence on file reopen. A real browser SQLite journey passed setup, logging, return to details retaining sets, Home/resume directly to logging, finish, saved-edit sections and Save without runtime errors. Native/device review remains pending.
