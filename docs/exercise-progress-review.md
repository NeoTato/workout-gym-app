# Exercise history and progress review

PR 9 adds a searchable Exercise progress page from Home. It lists only exercises with completed workouts, searchable by exercise name, category or muscle group. Loaded and bodyweight entries remain separate. Expand an exercise in saved-workout details to open its progress with that workout's equipment already selected.

Completed workout details, calendar day details and the Exercise progress library now start with collapsed category/subcategory buttons (for example Push / Chest and Pull / Back). Each button shows its exercise count and opens independently. Exercises without a muscle group stay under Other exercises for Push/Pull, or their category; missing categories appear under Uncategorized. Opening a group reveals its exercises, and each completed exercise still expands separately to show sets. Progress searches show matching exercises directly, bypassing collapsed groups; clearing search restores the previous group expansion state.

The detail page shows a recorded best, the latest 12 session points in a bar chart, and expandable session history (10 sessions initially, with Show more). Every chart bar can open its saved workout. Sessions retain their activity dates, types, original set loads, units and reps. Multiple occurrences of the same equipment variation in one workout produce one chart point containing all completed sets. History refreshes after edits, backdating and deletion; the selected chart unit and equipment remain selected when still available.

## Comparison rules

- Compare only one existing equipment variation ID: the same exercise, gym, equipment name, measurement mode, load convention and dimension.
- Compatible lb/kg loads convert for the chart and recorded best using 1 lb = 0.45359237 kg. Values round to two decimals for display. Saved sets retain original units.
- Mass loads, plate counts, bodyweight, machines, gyms, total, per-hand and per-side loads are never pooled.
- Loaded charts show the heaviest completed load per session regardless of reps; bodyweight charts show the highest reps in a completed set. These are recorded values, not estimated strength scores or one-rep maxima.
- Chart points have equal session spacing, oldest to newest; they are not spaced by elapsed calendar time. The recorded best uses all completed history through the current local date, even when the best predates the chart's latest 12 sessions.
- Removed gyms remain visible in historical comparisons. Drafts do not contribute. Deleting all completed sets produces an empty history without recreating records.

Schema remains version 6. No dependencies, measurement modes, server, telemetry or fabricated workout data are added. The history query reads only the selected exercise in one joined query; rendered history expands in groups of 10. Full selected-exercise set data is read to calculate its all-time record.

## Phone checklist

Stop Metro and run `npm start -- --clear` from `mobile/` to pick up the new route files. No dependency reinstall is needed.

1. Open Exercise progress from Home. Expand a category/subcategory button and verify other groups stay collapsed. Search for a logged exercise or muscle group: matching exercises should appear directly. Clear search and check the previous group state returns. Confirm an empty library and a search with no matches have different messages.
2. Open a loaded exercise. Check the selected gym, equipment and load convention before comparing. Switch equipment and confirm unrelated history stays separate, including removed gyms.
3. Switch lb/kg and check chart/record conversion while expanded saved sets keep their original units. Zero-load sets should remain visible.
4. Open a bodyweight exercise and confirm the chart uses reps without a load-unit selector. Plate-count exercises must remain in plates.
5. Expand a session to inspect all sets, then open its workout. Edit a load or date and return: progress should refresh. Delete a workout with confirmation and check the chart and record update.
6. From a saved workout or calendar day, expand a muscle group and then an exercise to inspect its sets. In saved-workout details choose View exercise progress and confirm its own equipment is selected. Back navigation should return to the previous page. Collapsing a group hides its exercises and sets.
7. Confirm multiple occurrences of the same exercise/equipment in one session give one point with all sets. With more than 12 sessions, check the chart limit and Show more history.
8. Check horizontal chart scrolling, touch labels, text scaling, light/dark appearance and narrow screens. Verify existing workout logging, calendar, summaries, routines and an active draft still work.

Validation: 91 Jest tests and 25 real SQLite tests pass. Automated coverage includes domain conversion/grouping/record/chart limits, real SQLite isolation and history corrections, collapsed sets, equipment/unit selection, history expansion, search, error/empty distinction and stale-response recovery. Lint, types, SDK compatibility, all-platform bundle export and the high/critical audit gate pass. Dependencies are unchanged, with 1 low and 30 moderate audit findings.

Real browser verification covered empty/search states, separate gyms/mass/plate/bodyweight histories, lb/kg conversion, original-unit sets, saved-workout shortcuts, edit/delete refresh, retained chart units, active draft preservation, light/dark appearance, 320/390px layouts and chart-unit touch targets. Screenshots are in `screenshots/native-progress-*.png`.

All-platform JavaScript export is not a signed build or a physical iOS/Android test. Keep the PR unmerged until phone review and explicit approval.
