# PR 4: native UI overhaul and reusable exercise names

## User-visible changes

The approved HTML direction now informs the native logger: coral primary actions; green Add/completion states; red Remove/Delete/Discard actions; neutral secondary actions; rectangular rounded controls; lighter selection surfaces; and theme-specific borders. Home and saved-workout details use the same palette.

Logging uses compact load/reps/completion rows. Each exercise can collapse without losing its sets; equipment/tracking/unit/convention fields live behind Setup. Add set has one consistent style even when there are no sets. Larger device text uses a roomier row layout with visible field labels. Completion rules remain unchanged: valid typed measurements complete a set, invalid/missing values cannot be marked done, zero load is valid, bodyweight only needs reps, and copied sets remain incomplete until edited or confirmed. Removing performed work still requires confirmation.

Primary Continue/Finish/Save actions sit in a footer, separate from scrolling content. Session setup and exercise logging retain their separate screens. New workouts start with an empty exercise list and Add exercise opens a searchable picker. Existing drafts, including older blank exercise cards, remain usable.

## Persistent exercise library

Suggestions come from completed workouts in SQLite, not the HTML preview. Search ignores capitalization and repeated/surrounding whitespace. Users may select a known exercise or create a new name. A known selection preserves its catalog identity and loaded/bodyweight mode; it does not copy another gym's equipment or invent weights/reps. Existing exercise setup fields also offer suggestions when correcting a saved workout.

The store reuses canonical names for new completed entries while preserving loaded/bodyweight distinctions and gym-specific equipment identities. Names in unfinished drafts or unreferenced catalog records are not presented as previously logged workouts. The catalog uses the existing schema; optional catalog IDs in draft/read models need no database migration or reset.

Suggestion loading has explicit loading/error/retry states. A failed suggestion query still permits manual name entry. The picker bounds the visible suggestion list and invites a more specific search. Save/Cancel, draft recovery, transaction rollback, time correction, and deletion behavior remain covered by existing tests.

## Validation

- 26 component tests pass: existing logging/flow/time controls plus picker search/selection/free entry/cancel, suggestion retry, collapse/setup retention, and completed-set removal confirmation.
- 9 SQLite/domain tests pass: catalog normalization and reuse, tracking-mode/gym separation, no draft suggestions, catalog identity after real file reopen, rollback, date/time correction, draft isolation, and scoped deletion.
- The native UI's browser runtime passed a real SQLite journey: create gym, add exercises, log compact rows, bodyweight, copied sets, collapse/expand, Home/resume, finish excluding incomplete sets, reuse persistent suggestions in the next workout, saved-edit suggestions, and preservation of an unrelated active draft. Light/dark and 320px/390px horizontal layouts were checked.
- TypeScript, zero-warning lint, and iOS/Android/web JavaScript exports are required before merge. Exports do not prove native visual/keyboard behavior; physical-device review remains pending.

## iPhone / Android review checklist

1. Reload the current project. This UI update adds no dependencies; no install or native rebuild is needed.
2. Open an existing saved workout and an existing draft. Confirm original data, dates/times, units and locations remain intact.
3. Start a workout, select Home/gym/type, and Continue. Add exercise opens the picker. A fresh database has no fictional suggestions. Type a new name and add it.
4. Open Setup to choose equipment/mode/unit/convention, then Done setup. Enter values, add at least five sets, and check auto completion and copied-set incompletion. Try zero load, invalid/empty values, and bodyweight reps.
5. Collapse/expand, switch to Edit details and back, and fully close/reopen Expo Go after the saved status appears. Values and configured draft resume must remain correct.
6. Remove a performed set/exercise, first choosing Keep, then confirming removal. Finish must save only performed sets and preserve other history.
7. Start another workout and search for a completed exercise using different capitalization/spaces. Select it. Confirm the correct tracking mode and blank new set measurements. Verify the suggestion still exists after reopening the app.
8. Leave a new draft active, edit a completed workout, and use its name suggestions. Check Save and Cancel independently, then resume the active draft to confirm isolation.
9. Check light/dark theme, larger system text, narrow screen widths, keyboard scrolling, picker dismissal, and reachability of pinned actions. Screen readers should identify each set field, Done state, Remove action, and collapsed/expanded exercise.

## Scope

HTML previews and repository organization are included as the design reference. Calendar/history browsing, summaries, goals/streaks, previous-session performance references, exports, and cloud sync are not implemented by this PR. The native Home still shows the existing saved-workout list; activity screens remain HTML prototypes for later work. The earlier intermittent Expo web-worker reload error is not patched here; database durability is covered by real-file tests and still needs native reopen testing.
