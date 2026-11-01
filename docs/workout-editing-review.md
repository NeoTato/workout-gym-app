# Saved workout editing and deletion

## Scope and acceptance

Open a completed workout from Home and choose **Edit workout**. Change its saved location, session type, exercises, equipment labels, units, load conventions, and sets. Add/remove exercises and sets without a fixed count. Save explicitly or cancel to keep the original. Original date, timezone, start/end times, and session ID remain unchanged.

Existing sets start marked done. In both logging and historical editing, entering valid measurements automatically marks a set done. Loaded sets require a finite nonnegative load (including zero) and positive whole-number reps; bodyweight sets require only reps. Clearing or invalidating either required value makes the set incomplete and disables manual completion. Copied sets start incomplete even with valid copied values; edit a measurement or tap Done to confirm them. Valid sets may still be manually unchecked. Changing tracking mode, units, or load convention clears completion for explicit reconfirmation or a subsequent measurement edit.

To avoid silently omitting edited work, Save requires every remaining set marked done and every remaining exercise to contain a set. At least one valid completed set is required. Remove unwanted sets/exercises explicitly. New gyms can still be created in the normal workout flow; historical editing selects existing locations.

**Delete workout** opens an in-page confirmation naming the permanent effect. **Keep workout** changes nothing. **Permanently delete workout** removes that session and its sets, then returns Home.

## Persistence and failure behavior

- Editing uses an independent in-memory copy. It never overwrites the active workout draft. Cancel, leaving the screen, or restarting before Save discards unsaved historical edits; the saved workout remains unchanged.
- Update validates first, then replaces exercise/set rows and location/type snapshots in one serialized SQLite transaction. Existing schema version 1 is sufficient; no migration or database reset is needed.
- A failed write rolls back both deleted and inserted rows. Errors keep the editor available for retry. A missing/deleted session cannot be recreated by an update.
- Deletion uses existing foreign-key cascades and affects only the selected session. Shared exercise/equipment catalog records remain available; the active draft and other workouts remain intact.
- Date correction, edit autosave/recovery, undo deletion, charts, calendars, summaries, and export are outside this PR.

## Device review checklist

1. Reload the app; no new dependencies or server configuration are introduced.
2. Open a completed workout, tap Edit, change values, then Cancel. Confirm the original remains.
3. Edit again and clear reps/load. Confirm the set becomes incomplete and cannot be marked done. Save must show guidance and retain the editor. Refill valid values and confirm automatic completion. Check zero load, invalid/zero reps, and bodyweight reps without load.
4. Add a copied set: confirm it starts incomplete, then edit its measurements or tap Done to confirm it. Save and confirm details and Home reflect the changes. Fully close/reopen Expo Go and verify persistence. Repeat the completion checks while logging a new workout.
5. Add/remove sets and exercises, including bodyweight sets. Confirm only explicitly removed work disappears. Invalid/empty measurements must not overwrite history.
6. Start an unfinished workout, return Home, edit a completed session, then resume the unfinished workout. Confirm its draft remains intact.
7. On a disposable session, choose Delete, then Keep workout. Reopen it and confirm nothing changed.
8. Delete that disposable session and confirm it remains absent after reopening. Other sessions and the active draft must remain.
9. Check light/dark appearance, large text, keyboard scrolling, and removal confirmations. Native iOS/Android testing remains necessary even after browser and automated tests pass.

## Verification evidence

Twelve component tests cover Cancel without mutation, automatic completion, invalid/empty values, zero load, bodyweight semantics, copied-set confirmation, manual undo, and save failure/retry. Six real SQLite tests cover update rollback, preservation of timestamps/drafts, scoped deletion, stale edits after deletion, foreign keys, and file close/reopen after both update and deletion. Type checking, zero-warning lint, and iOS/Android/web bundle exports pass.

A 390px browser journey before the automatic-completion feedback change passed create/finish, edit cancellation, edited-set validation, save, cancellation of deletion, and confirmed deletion using Expo's SQLite worker, with no runtime errors in that journey. The subsequent completion behavior is covered by component tests and awaits device review. Browser reload testing separately encountered `Invalid VFS state` from Expo SQLite's web worker initialization; browser reload persistence is not claimed. No dependency patch or database reset was applied. Verify persistence on the intended iOS/Android runtimes before merging.
