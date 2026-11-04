# UI overhaul: HTML review before native implementation

Open [the UI preview](../previews/ui-overhaul/ui-overhaul-preview.html) directly in a browser. It loads local fonts and needs no installation or dev server. No native app files or workout data are changed.

## Proposed direction

- Coral filled primary action, one per screen: Continue, Finish, Back to Home.
- Green outlined/soft actions for Add set/exercise; green text/checks for completion and save status.
- Red text for Remove/Delete/Discard. Destructive confirmation is separate from initiating the action.
- Neutral text/outlined secondary actions: Back, Edit, Cancel.
- Compact set rows, exercise setup behind a menu, collapsible optional exercises, and a footer for the main action. These are proposals for review, not implemented native features.

Keep readable text and explicit labels/icons alongside color. Check light and dark modes rather than treating the palette as fixed hex values everywhere.

## Review interactions

1. Toggle Current colors / Proposed. The comparison changes color hierarchy on the same proposed layout; Current colors is not a screenshot or exact reproduction of the current app.
2. Toggle appearance. On a narrow window, select Setup, Log workout, or Saved; desktop shows all three.
3. Choose a location/session type; open the date details; Continue and Edit details move between preview screens.
4. Enter a valid missing rep value: completion becomes green. Clear a required value: completion disables. Add set copies values without completion.
5. Remove a completed set: Keep it / Remove confirm the distinction. Delete/Discard similarly demonstrate confirmation. Exercise menus expose secondary settings.
6. Finish builds the saved sample from checked sets. All interactions are temporary and fictional; reload resets the preview. Some secondary actions deliberately show an explanatory notice rather than implementing the whole app.

## Verification

`node scripts/verify-ui-overhaul.mjs` uses the existing dependency-free Chrome DevTools test approach. Checks cover light/dark, distinct semantic action colors, the comparison toggle, completion validity, copied-set behavior, confirmation and cancellation, Finish, Escape closing dialogs, gym selection, and no horizontal overflow at 320px/390px. Screenshots: [desktop](../screenshots/ui-overhaul-desktop.png), [dark](../screenshots/ui-overhaul-dark.png), [mobile](../screenshots/ui-overhaul-mobile.png).

Native implementation is pending user review. Preserve the merged app's SQLite/draft behavior, explicit saved-workout Save/Cancel, and timezone-aware validation when transferring an approved design.

## Exercise name reuse

Add exercise opens a search field with suggestions from fictional previously logged exercises. Search ignores capitalization and surrounding/repeated spaces; users can select an existing name or enter a new one. Existing exercise-name editing also has a browser suggestion dropdown.

Finishing the preview's editable exercise remembers its name for subsequent selections in this page. Names are deduplicated without case/spacing variations. Merely typing/selecting a new exercise does not make it previously logged. This demonstration is in memory and resets when the page reloads; added exercise cards illustrate selection rather than implementing a second complete logger.

Native acceptance: query the persisted exercise catalog populated by completed workouts; suggestions must survive app restarts and be available in both new logging and saved-workout editing. Reuse the exercise identity when selected, allow new names, and retain gym-specific equipment identities and progression. Do not seed the actual app with this preview's fictional names/history. Verify reuse after finishing, restart persistence, filtering, new-name entry, case/space duplicates, and separation of equipment across gyms.

Preview verification covers case-insensitive filtering, selection, remembering a newly completed exercise, deduplication, and excluding unlogged names. Screenshot: [exercise suggestions](../screenshots/ui-overhaul-exercise-suggestions.png).

## History, summaries, and consistency

Open the [activity preview](../previews/ui-overhaul/activity-preview.html). It shares fonts, semantic colors, cards, and navigation styling with the workout-flow preview. A link in each preview connects the two.

- History: monthly calendar, today ring, completed-day markers, multiple-session indicators, gym/Home filters, and recent sessions. Tap a date or session to open a centered day sheet showing every matching workout, its duration/location, exercises, and sets. Empty dates/months have an explicit state.
- Summary: Week/Month/Year with period navigation, unique active days, workout-session counts, recorded time, activity bars, Push/Pull/Legs and other type counts, gym/Home sessions, and muscle groups from logged exercises. Current periods say “so far”; empty periods show zero activity without inventing comparisons.
- Consistency: current and longest weekly streaks, this week's active-day goal, recent achieved weeks, and a goal-change dialog. The current unmet week remains in progress; rest days are allowed. Goal changes apply next Monday and do not rewrite the current week.

All three views derive from one fictional sample through November 4, 2026. November contains 3 sessions on 2 dates: Upper on Nov 2, Push plus Core on Nov 4. Five earlier weeks each meet a 3-day goal. This deliberately tests the distinction between sessions, active days, and weekly streaks. Data and goal edits are temporary and reset on reload.

Run `node scripts/verify-activity-preview.mjs`. Chrome checks cover shared totals, type/location conservation, calendar/day details, empty days/periods, focus restoration, period navigation, weekly streak behavior, next-week-only target changes, light/dark themes, and 320px/390px layouts. Images are saved in `screenshots/activity-preview-*.png`. This is a visual prototype; native calendar/reporting/streak functionality is still planned separately from the merged logger.
