# PR 4: native UI overhaul and reusable exercise names

## User-visible changes

The approved HTML direction now informs the native logger: coral primary actions; green Add/completion states; red Remove/Delete/Discard actions; neutral secondary actions; rectangular rounded controls; lighter selection surfaces; and theme-specific borders. Home and saved-workout details use the same palette.

Logging uses compact load/reps/completion rows. Each exercise can collapse without losing its sets; equipment/tracking/unit/convention fields live behind Setup. Add set has one consistent style even when there are no sets. Larger device text uses a roomier row layout with visible field labels. Completion rules remain unchanged: valid typed measurements complete a set, invalid/missing values cannot be marked done, zero load is valid, bodyweight only needs reps, and copied sets remain incomplete until edited or confirmed. Removing performed work still requires confirmation.

Primary Continue/Finish/Save actions sit in a footer, separate from scrolling content. Session setup and exercise logging retain their separate screens. New workouts start with an empty exercise list and Add exercise opens a searchable picker. Existing drafts, including older blank exercise cards, remain usable.

## Persistent exercise library

Suggestions come from completed workouts in SQLite, not the HTML preview. Search ignores capitalization and repeated/surrounding whitespace. Users may select a known exercise or create a new name. A known selection preserves its catalog identity and loaded/bodyweight mode; it does not copy another gym's equipment or invent weights/reps. Existing exercise setup fields also offer suggestions when correcting a saved workout.

The store reuses canonical names for new completed entries while preserving loaded/bodyweight distinctions and gym-specific equipment identities. Names in unfinished drafts or unreferenced catalog records are not presented as previously logged workouts. The exercise catalog uses the existing tables. Location removal adds a transactional version 2 migration; exercise categories add version 3 and dependent subcategories add version 4. Existing locations default to active and existing exercises default to Uncategorized. No database reset is needed.

Suggestion loading has explicit loading/error/retry states. A failed suggestion query still permits manual name entry. The picker bounds the visible suggestion list and invites a more specific search. Save/Cancel, draft recovery, transaction rollback, time correction, and deletion behavior remain covered by existing tests.

## Validation

- 39 component tests pass: existing logging/flow/time controls plus picker search/selection/free entry/cancel, suggestion retry, collapse/setup retention, and completed-set removal confirmation.
- 15 SQLite/domain tests pass: catalog normalization and reuse, tracking-mode/gym separation, no draft suggestions, catalog identity after real file reopen, rollback, date/time correction, draft isolation, and scoped deletion.
- The native UI's browser runtime passed a real SQLite journey: create gym, add exercises, log compact rows, bodyweight, copied sets, collapse/expand, Home/resume, finish excluding incomplete sets, reuse persistent suggestions in the next workout, saved-edit suggestions, and preservation of an unrelated active draft. Light/dark and 320px/390px horizontal layouts were checked.
- TypeScript, zero-warning lint, Expo dependency compatibility, and iOS/Android/web JavaScript exports pass. Exports do not prove native visual/keyboard behavior; physical-device review remains pending.

## iPhone / Android review checklist

1. SDK 58 compatibility packages were aligned during final validation. Dependencies are installed in the shared workspace; stop the old Expo server with Ctrl+C, then run `npm start -- --clear` from `mobile` and reopen the project. A fresh checkout needs `npm ci` first. No new native module or SDK-major upgrade was added.
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

## SDK compatibility alignment

The repository's required `expo install --check` began recommending updated SDK 58 packages on November 4. A separate commit aligns Expo 58.0.23, Constants 58.0.15, Linking 58.0.16, Router 58.0.30, safe-area-context 5.11.1, and the development-only Jest preset 58.0.14. React and React Native stay at their existing versions. The lockfile was regenerated rather than edited by hand. Compatibility now passes; all tests and exports are rerun after alignment. Audit reports 39 low/moderate findings (1 low, 38 moderate), zero high/critical. No audit force-fix or check suppression was used.

## Location removal

In workout setup, Manage locations sits directly below the location choices and opens a centered popup with a scrollable gym list, red Remove actions, and a Close locations button. Confirmation explains that history is retained. Home cannot be removed. Removing the selected gym clears that draft selection and requires another choice; existing drafts are otherwise preserved. Removed gyms are hidden from new choices, but remain visible with a removed label when already referenced by a draft or saved workout. Adding the same name (case-insensitive) restores its original identity and equipment associations. Old workouts remain editable.

Device check: remove an unselected gym, cancel and confirm removal of the selected gym, reopen the app, verify old history, and add the same gym again. Automated coverage includes confirmation, protected Home, removed-choice filtering, historical editing, identity restoration, and version-one migration.

## Quiet draft save feedback

Opening a draft shows no success message. After an edit reaches SQLite, Draft saved appears briefly for 2.5 seconds, then clears. A new edit cancels the previous success timer. Failed saves remain visible with Retry save until a retry succeeds; they never expire on a timer. Timer callbacks are cleared when leaving the workout. Check this in both setup and exercise logging.

## Scroll to added exercises

Adding an exercise closes the picker, expands the new card, and scrolls toward its header after layout. This applies to both draft logging and saved-workout editing. Scrolling is requested only for a new addition; typing, resizing, collapsing cards, and cancelling the picker do not repeatedly pull the user down. Device check: add several exercises with enough sets to exceed one screen, then add one more and verify its header and first set are reachable without manually scrolling.

## Exercise categories

The picker has horizontal All, Push, Pull, Legs, Core, Cardio, Mobility, Other and Uncategorized filters. Name search combines with the active filter. The Category control assigns one category to a new or selected exercise; Setup offers the same control for corrections. Selecting or typing an exact existing name retains its category unless explicitly changed. Existing exercises stay Uncategorized until assigned.

Categories are exercise-library metadata shared across gyms, distinct from the workout session type. Draft changes autosave locally; library categories are committed only when finishing a workout or saving a completed-workout edit. Cancel does not commit category edits. Changing a category keeps performed sets and equipment identities intact. Legacy drafts without a category do not clear a stored category. Version 1 and 2 database upgrades, reassignment/clearing, invalid input, transactional rollback, and real-file durability are covered. The browser journey also verified assigning Push/Core and filtering the saved picker library.

Device review: add a new exercise with a category, finish it with a valid set, reopen the app, filter and search for it, change its category under Setup, and verify clearing to Uncategorized. Check the scrollable picker with the keyboard and larger text. No dependency change or database reset is required.

## Compact completed-workout summaries

Completed workouts initially show exercise names, set counts, and an expand indicator. Tapping an exercise reveals its equipment, load convention, and saved sets; tapping again collapses it. Exercises expand independently. The control announces expanded/collapsed state and supports large text with wrapping names. This is a display change only; editing and stored measurements are unchanged. Device check: open a workout with multiple exercises, expand two, collapse one, and verify all load/reps and bodyweight values.

## Completed-workout date hierarchy

The completed view removes the Saved on this phone indicator and places Edit workout beside the session title. A single metadata card shows the workout date once, a 24-hour time range with elapsed duration, then location and recorded timezone. The end date appears only for an overnight session; the end year appears when crossing years. Values are formatted in the recorded workout timezone rather than the viewing device timezone. Device check: compare a same-day, overnight, and backdated workout; confirm names and time ranges wrap correctly with larger text.

## Push and Pull subcategories

Push offers Chest, Triceps, and Shoulders; Pull offers Back and Biceps. Both allow Not assigned. The picker exposes subcategory filters after selecting Push/Pull, combines them with name search, and offers assignment beneath the category control. Setup supports the same edits. Selecting a saved name carries its category and subcategory; changing the parent clears incompatible subcategories. Other parent categories have no subcategory control.

Collapsed completed-exercise cards now show category, subcategory, and set count beneath the exercise name, with the same information in the accessibility label. Sets still expand independently. Classification is current exercise-library metadata shared across gyms; it remains distinct from the workout session type. Finish/Save commits changes, while Cancel leaves stored classification unchanged.

Schema version 4 adds a constrained subcategory column. Existing names and categories survive with subcategories initially unassigned. Parent/child combinations are validated both before saving and in SQLite. Regression coverage includes parent changes, filter/search, completed labels, migration from version 3, real-file reopen, and rollback. The browser journey verified assigning Chest, filtering by Chest in a later workout, and the completed collapsed label. Device check: assign each Push/Pull group, finish, reopen, filter, change the parent, and verify old history and saved sets remain correct.
