# PR 6: calendar and day details

## Behavior

Home now shows a Monday-first month calendar with previous/next controls, a return-to-current-month action, today's outline, selected-day state, and numeric completed-workout markers. Gym/Home filters apply to both markers and the compact month list. Multiple sessions on one date count separately as workouts and once as an active day. The list shows at most five recent entries from the selected month; every session remains accessible through its date.

Tapping a day opens a dedicated details page with all matching completed workouts, their time/duration/location metadata, and independently expandable exercise sets. The date appears once at the top; overnight session end dates remain explicit. View / edit opens the existing completed-workout editor. Back to day and Back to calendar preserve the calling month, filter, selection, and mounted Home scroll view.

Both views refresh on focus after editing, backdating, or deleting a workout. Home keeps its mounted calendar during refresh so browsing state is retained. Cached results are labeled if refresh fails; day interaction is disabled until refresh succeeds. Day queries distinguish loading, valid empty dates, and retryable failures. Late responses for an earlier date cannot replace a newly selected day's results. An active workout draft is unaffected by browsing or editing history.

## Data rules and scope

Markers use saved `activity_date` values, not dates inferred from UTC timestamps or the viewing device timezone. Crossing midnight still counts once on the recorded activity date. Location filtering uses the saved location-kind snapshot, so removed gyms remain visible in their historical dates. Draft checkpoints never enter the calendar.

Home already loads completed summary rows; month filtering uses these summaries in memory. Exercise/set records are read only for the selected day. Schema version stays 5: no migration, dependency, account, server, or sample personal history is added. Bounded summary queries and pagination can follow multi-year performance evidence.

This PR covers the calendar/day slice of milestone 4. Exercise charts/progress pages, period reports, goals/streaks, and export remain later work. Existing routines, equipment references, and workout editing remain available.

## Validation

- 69 component/domain tests pass, including Monday offsets, leap years, year rollover, month bounds, separate session/day counts, location filtering, retained month/filter after refreshed data, expandable day sets, error versus empty state, and stale-response isolation.
- 20 real SQLite tests pass. Day-query coverage includes multiple gym/Home sessions, removed gyms, invalid dates/filters, active-draft exclusion/preservation, and changed results after backdating or deletion. Existing migration, transaction, routine, and reference coverage stays green.
- TypeScript, zero-warning lint, Expo compatibility, iOS/Android/web exports, and the high-severity audit gate pass. Dependencies and lockfile are unchanged. Audit reports 1 low and 30 moderate findings, zero high/critical.
- The real app browser journey created older and same-day sessions, navigated calendar/day/editor and back, checked collapsed/expanded sets, backdated and deleted saved workouts, verified refreshed counts, visited empty days, retained an unrelated active draft, and checked dark mode and 320/390px horizontal layouts. Images are in `screenshots/native-calendar-*.png`; browser fixtures are isolated from phone data.
- Physical iOS/Android touch, text scaling, VoiceOver/TalkBack focus restoration, keyboard/date-picker behavior, background/reopen, and native safe areas remain pending. Browser checks and JavaScript exports do not establish those device behaviors.

## Phone checklist

1. Reload Expo Go on this branch. No dependency installation or database reset is required. If Metro is stopped, run `npm start` inside `mobile`.
2. Browse months across December/January and February in a leap year. Confirm today is outlined and empty months contain no invented workouts.
3. Log separate gym and Home workouts on one date. Verify the date marker shows two workouts and the month count shows one active day. Test All/Gym/Home filters, including a removed gym with older saved history.
4. Tap the date. Both workouts must appear under All; a filtered day must show only matching sessions. Expand and collapse exercise sets and verify original weights, reps, categories, and subcategories.
5. Use View / edit to correct a workout's date or delete disposable test data with confirmation. Return to the day and calendar. Markers, counts, month list, and empty states must refresh correctly while the selected month/filter stays in place.
6. Leave an unfinished draft active while browsing and editing history. Resume it afterward; location, exercises, and entered sets must stay intact.
7. Check same-day and overnight workouts and change the phone's timezone before reopening older history. Calendar dates must retain their recorded activity dates.
8. Review narrow screens, large system text, light/dark mode, calendar cell touch targets, descriptive day labels/selection, and screen-reader focus when returning from detail pages.

Keep the draft PR unmerged until device review and explicit merge authorization.
