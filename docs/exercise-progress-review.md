# Exercise history and progress review

PR 9 adds a searchable Exercise progress page from Home. It lists only exercises with completed workouts, searchable by exercise name, category or muscle group. Loaded and bodyweight entries remain separate. Expand an exercise in saved-workout details to open its progress with that workout's equipment already selected.

Completed workout details, calendar day details and the Exercise progress library now start with collapsed category/subcategory buttons (for example Push / Chest and Pull / Back). Each button shows its exercise count and opens independently. Exercises without a muscle group stay under Other exercises for Push/Pull, or their category; missing categories appear under Uncategorized. Opening a group reveals its exercises, and each completed exercise still expands separately to show sets. Progress searches and specific subcategory filters show matching exercises directly, bypassing collapsed groups; clearing search restores the previous group expansion state.

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

1. Open Exercise progress from Home. Check the bordered search input and its Clear search button. Open Filters and combine exercise type (loaded/bodyweight), category and subcategory; changing category must reset its subcategory. Verify Uncategorized and Not assigned options, result counts, Reset filters and Clear filters. Expand a category/subcategory button and verify other groups stay collapsed. Search for a logged exercise or muscle group: matching exercises should appear directly. Clear search and check the previous group state returns. Confirm an empty library and a search with no matches have different messages.
2. Open a loaded exercise. Check the selected gym, equipment and load convention before comparing. Switch equipment and confirm unrelated history stays separate, including removed gyms.
3. Switch lb/kg and check chart/record conversion while expanded saved sets keep their original units. Zero-load sets should remain visible.
4. Open a bodyweight exercise and confirm the chart uses reps without a load-unit selector. Plate-count exercises must remain in plates.
5. Expand a session to inspect all sets, then open its workout. Edit a load or date and return: progress should refresh. Delete a workout with confirmation and check the chart and record update.
6. From a saved workout or calendar day, expand a muscle group and then an exercise to inspect its sets. In saved-workout details choose View exercise progress and confirm its own equipment is selected. Back navigation should return to the previous page. Collapsing a group hides its exercises and sets.
7. Confirm multiple occurrences of the same exercise/equipment in one session give one point with all sets. With more than 12 sessions, check the chart limit and Show more history.
8. Check horizontal chart scrolling, touch labels, text scaling, light/dark appearance and narrow screens. Verify existing workout logging, calendar, summaries, routines and an active draft still work.

Validation: 102 Jest tests and 25 real SQLite tests pass. Automated coverage includes domain conversion/grouping/record/chart limits, real SQLite isolation and history corrections, collapsed sets, equipment/unit selection, history expansion, search, error/empty distinction and stale-response recovery. Lint, types, SDK compatibility, all-platform bundle export and the high/critical audit gate pass. Dependencies are unchanged, with 1 low and 30 moderate audit findings.

Real browser verification covered empty/search states, separate gyms/mass/plate/bodyweight histories, lb/kg conversion, original-unit sets, saved-workout shortcuts, edit/delete refresh, retained chart units, active draft preservation, light/dark appearance, 320/390px layouts and chart-unit touch targets. Screenshots are in `screenshots/native-progress-*.png`.

All-platform JavaScript export is not a signed build or a physical iOS/Android test. Keep the PR unmerged until phone review and explicit approval.

The search/filter controls use a centered, scrollable popup with a result count and Show results action. Filter selections apply together with name/muscle-group search; clearing filters preserves search text. Search and filter controls do not change exercise metadata or workout history.

Home navigation uses blue summary and green progress cards with icons, descriptions and chevrons. Forward browsing/actions such as Filters, Goals and streaks, View exercise progress, Open workout and Save as routine use filled blue controls; back navigation remains a quiet link. Start/finish actions retain coral, additions/success use green, and removal uses red. Both themes retain labels and shapes so color is not the only action cue.

Home keeps its coral Start workout / Resume workout action in a fixed bottom bar with a solid surface background and subtle top divider. The button aligns with the Home cards and uses the standard rounded shape. The bar includes the bottom safe area, and the scroll viewport ends above it so content is never covered. Other screens do not show this action. Browser verification checked fixed positioning, card alignment, non-overlap, a 320x568 dark layout, Start navigation and draft-to-Resume behavior.

Exercise progress details separate Selected setup (labeled location/equipment/tracking rows), the highlighted recorded best with display-unit controls, and the recent-session chart. Equipment options use short stacked fields rather than a slash-separated paragraph. Longer notes about equipment isolation, rep counts, conversion and chart spacing live in a collapsed How comparisons work section. Browser checks verified the disclosure, unit conversion, workout navigation, focus refresh and dark/narrow layouts.

Workout setup separates location, session type and date/time into individual cards. New-gym entry is hidden behind + New gym and retains input after errors. Logging uses a compact session summary, clear Setup controls, equipment/load-convention badges, a completed-set count beside Finish, and optional How logging works guidance. Empty previous-session boilerplate is omitted; available recent sessions expand on request and errors/retry remain visible. Saved-workout editing shares these components. Browser verification covered adding a gym, corrected dates, copied-set completion rules, retained detail edits, loaded/bodyweight logging, finishing, completed groups and dark/narrow layouts.

Category/subcategory headers use a larger blue section style, a small parent-category label, a prominent muscle-group name and an exercise count. Expanded exercise cards are indented beneath a guide line, making parent sections distinct from individual exercises. The same hierarchy is shared by completed-workout details, calendar day details and progress browsing. Browser checks verified parent headers are larger than exercise cards/rows, indentation, set expansion and dark/narrow layouts.

Saved-workout editing now opens on a compact grouped exercise overview. Tap a group and an exercise to edit only its sets/setup in a focused view, then use Back to exercises to return with pending edits and group expansion preserved. Session details remain a separate tab. Save changes and Cancel changes stay fixed at the bottom in both views. New exercises open directly in the focused editor. Saving with unfinished sets opens the first affected exercise; removing exercises remains pending until Save. Android Back returns from the focused view to the overview and is blocked during a save; physical-device review remains pending. Tests cover multi-exercise edits, cancellation, addition, confirmed removal, failed-save retry, date changes and validation focus. Browser checks confirmed the complete cancel/save flows, footer geometry, dark mode and narrow screens.
