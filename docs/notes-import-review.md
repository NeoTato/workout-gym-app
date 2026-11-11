# Paste workout notes: review guide

In a new or resumed workout, choose the date, time, session type and gym/Home as usual. Continue to **Your workout**, then tap **Paste workout notes** below Add exercise. No AI account or network request is used for parsing. The app must already be running; this does not change Expo Go's internet requirements for launching the iPhone preview.

Paste one exercise per line, for example:

```text
pull ups 5reps 5reps 2reps
lateral pulldowns 70lbsx13 100lbsx12 100lbsx8
close grip horizontal pull 85lbsx12 85x6 85x8
preacher curl 12.5kgx4 10kg x8 10kgx8
hammer dumbbell curl 5kg x12 5kg x12 7.5kgx10
inclined situps 10kg x18 10kg x18
halos 10kgx12 10kgx12 10kgx12
```

Review reports seven exercises and twenty sets. Tap an exercise to inspect individual sets and source text or choose a compatible saved-name suggestion. Suggestions require explicit selection and copy catalog/category/subcategory only; entered measurements and units remain intact. Equipment is left blank and load convention starts as total: confirm equipment and per-hand/per-side meaning in the normal editor. Unlinked exercises remain uncategorized until configured there. Matching uses normalized name containment and tracking compatibility, without fuzzy auto-linking or AI classification.

An omitted unit after an explicit weighted set inherits only within that same line. In the row example all three sets use pounds, and this assumption is highlighted. Nothing carries across lines. Mixed units, mixed weighted/bodyweight sets, timed/cardio notes, unknown units, partial text, negative loads and fractional/zero reps require correction or explicit line exclusion. A partially recognized line contributes no sets. Editing notes preserves the original text and resets review selections. Input is bounded to 20,000 characters, 100 nonblank lines and 50 sets per exercise; oversized paste is rejected without truncating the previous text.

Check **I reviewed the detected sets and assumptions**, then **Add N exercises to draft**. All unreadable lines must first be corrected or explicitly excluded. Import appends new exercises and completed sets without replacing existing draft work, changing date/location, starting a rest alarm or finishing the workout. Corrections are available in the normal editor before Finish workout. Repeated lines stay separate; importing the same notes again creates duplicates. Leaving the import with text asks for confirmation; pasted text is not persisted until added to the draft. Imported drafts use existing SQLite persistence and backup/restore. No dependency, schema migration or backup format change.

Unit and total/per-hand/per-side corrections preserve the set values and current Done state; no numeric conversion is applied. A regression previously unchecked all sets on those setup edits, causing exercises with no remaining completed sets to be omitted on Finish. The regression test imports both curl exercises, edits units/conventions/equipment and Pull/Biceps categorization, then verifies both exercises and their six sets survive the completion filter. Tracking-mode changes still require confirmation and clear incompatible measurements as before.

## Evidence

- Exact example: seven exercises, twenty sets, bodyweight reps, decimal kg and inferred pounds verified in domain tests and isolated Chrome.
- 174 app/domain/component tests plus 38 actual SQLite tests pass; types, lint and iOS/Android/web JavaScript exports pass.
- Focused tests cover invalid/partial lines, mixed units/tracking, limits, confirmed category matching, review acknowledgment, exclusion, double-tap fencing, edit-and-reparse and preservation of existing draft exercises.
- Chrome verified paste/review, visible inferred-unit warning, expanded sets, 320/390 px layout, draft navigation/reload persistence and Finish workout to history, with no runtime errors. Images: `screenshots/native-notes-{input,review,saved}.png`.
- Physical native keyboard/paste, small-screen scrolling, cancel confirmation, date/location corrections and phone persistence still need device review. Installed Android APK and hosted iPhone links predate this feature; test on the local branch first. No preview publication or APK rebuild is performed automatically.
