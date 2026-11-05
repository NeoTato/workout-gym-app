# PR 5: routines and previous-session references

## Behavior

A completed workout can be explicitly saved as a named routine. The template remembers ordered exercises, classifications, equipment/setup, and the number of completed sets. It contains no performed loads/reps or completion flags. New names are trimmed, whitespace-normalized, limited to 80 characters, and checked for duplicates. Existing routines can be renamed, removed with confirmation, or explicitly replaced from another completed workout after confirmation.

Workout setup offers Choose routine after the user selects a gym or Home. Applying a routine appends independent exercises with fresh IDs and blank, incomplete sets. It adopts the routine's session type only when the draft has no exercises; adding to existing work preserves its type and sets. The selected location never changes. Copying a routine from another location clears equipment labels and explains that Setup needs checking. Removing exercises, changing sets, or finishing early changes only the workout, never its template.

Recent sessions shows at most three earlier completed workouts of the selected type at the selected location. Opening one retains the draft; Back to workout returns to setup. Editing or deleting an earlier workout refreshes references on return.

Each expanded exercise offers a collapsible Last time reference when earlier matching sets exist. Matching requires the same exercise identity/name, location, equipment label, tracking mode, load convention, and measurement dimension. Mass units can match while retaining the original recorded unit; plate counts stay separate. References work across session types and exclude the current workout, unfinished drafts, and sessions later than the corrected activity date/start. Displayed values never populate or complete new sets. Loading, valid empty results, and retryable failures remain distinct. Late responses from a previously selected machine cannot overwrite the current lookup, and typing new set values does not refetch unchanged equipment history.

## Storage and limits

Schema version 5 adds routines and ordered routine slots transactionally, with foreign keys and positive set-count constraints. Existing sessions, categories, locations, and the active draft are preserved. Replacement updates the name and all slots atomically; a failed write restores the previous routine. Templates survive source-workout deletion and database reopen. Routine removal affects template data only.

No dependency, account, server, analytics, or sample history is added. This is the first routine slice: create/replace through completed workouts and the existing flexible workout editor. Custom session types, arbitrary slot rearrangement, advanced per-location alternatives, other-gym reference browsing, timed/distance exercise modes, calendars, reports/streaks, and export remain separate work. Existing template classifications are copied choices; session type counts remain independent.

Use this review branch while testing its newer database schema. Older app checkouts deliberately reject a newer schema rather than reset or downgrade personal data.

## Verification

- 62 component/integration tests pass, including explicit save, duplicate-name failure/retry, cancellation, confirmed replacement entry, different-location warnings, blank routine copies, late-response isolation, reference-query retry, and original-unit read-only display.
- 19 real SQLite/domain tests pass, including v4-to-v5 migration, routine persistence after file reopen, snapshot independence, name collisions, explicit replacement/removal, rollback after injected routine-slot failure, and exact-equipment reference isolation across locations/modes/conventions/dimensions/session types and backdated cutoffs.
- TypeScript, zero-warning lint, Expo compatibility, iOS/Android/web exports, and the high-severity audit gate pass. Audit currently reports 31 low/moderate findings (1 low, 30 moderate), zero high/critical; dependencies and lockfile are unchanged.
- The real app browser journey saved and reused a routine, navigated recent details and back to its draft, displayed prior completed sets, finished a shorter independent workout, renamed a routine, reused it at another gym with labels cleared, and checked dark theme and 320/390px horizontal layouts. Screenshots are in `screenshots/native-routine-*.png`; browser fixtures are isolated from the phone database.
- Physical iOS/Android keyboard, background/reopen, text scaling, screen-reader focus, and confirmation review remains pending. Browser verification and JavaScript exports do not establish those native behaviors.

## Phone review

1. Reload Expo Go on this branch. No new installation is required. If Metro is stopped, run `npm start` in `mobile`.
2. Open an existing completed workout and save it as a named routine. Check empty/duplicate names and harmless cancellation. Existing workout data must stay intact.
3. Start or resume a draft, select its location, and Choose routine. Check exercise order and set counts; all new measurements must be blank and incomplete. Add/remove sets or skip exercises freely, finish a shorter session, and verify the saved routine is unchanged.
4. Try the routine at another gym/Home. Confirm the selected location stays unchanged and equipment labels are cleared with a visible explanation. Check Setup before logging; another gym's loads must not appear as this location's references.
5. At the original location/type, open an entry under Recent sessions and return using Back to workout. Edit the old workout and return; verify the draft survives and reference values refresh. Delete only disposable test data, checking confirmation and draft preservation.
6. Expand Last time for a matching exercise. Check original loads/reps and units, then change equipment label, convention, tracking mode, plates/mass dimension, and location. Check that mismatches show no earlier matching sets and never fill current inputs. Same equipment from another session type should still appear.
7. Backdate the session and correct its time. Later sessions, including later sessions on that date, must be excluded. Existing completed-workout editing must exclude that workout itself from previous-set results.
8. Choose routine → Manage routines to rename or remove templates. Keep/Remove confirmation must affect only the template; saved workouts and any active draft remain. Save as routine on another completed workout offers explicit confirmed replacement.
9. Close/reopen the app after saving a routine and after applying a copy to a draft. Verify both survive. Check large system text, keyboard scrolling, light/dark mode, and accessibility names.

Keep the PR unmerged until device review is complete.
