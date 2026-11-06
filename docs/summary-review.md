# PR 7: weekly, monthly, and annual workout summaries

## Behavior

Home offers Workout summaries. The report defaults to the current month and supports Week/Month/Year selection, previous/next periods, and a return-to-current-period action. Weeks run Monday-Sunday; months and years use calendar boundaries, including leap years and cross-year weeks. Results show all locations and only completed sessions, using saved local activity dates rather than UTC timestamp slices.

Each period shows workout-session count, unique active dates, recorded time, activity bars, session-type counts, Gym/Home counts, and exercise-group coverage. Push/Pull/Legs always have visible count rows; other session types appear when used. Multiple sessions on one date increase workouts but count once as an active day. Type and location counts each sum to the workout total. Weekly activity is shown by day, monthly activity by clipped calendar weeks, and annual activity by month.

Current periods use the selected date range without an extra status label, past periods are labeled, and future periods contain no completed results. No comparisons to unfinished periods, fitness scores, or implied strength/consistency judgments are added. Recorded time comes from valid saved start/end timestamps; invalid or unknown durations are omitted and counted explicitly rather than treated as measured zero.

Exercise groups use current library category/subcategory metadata. Each group counts at most once per session, even if multiple exercises or sets share it. Groups can overlap. Extra Core exercises in a Push session contribute Core exercise coverage while leaving the Push session count unchanged. This is not a historical tag snapshot or an exercise-count total, and the UI labels the current-category basis.

Reports refresh on focus after history edits, backdating, or deletion. Loading, errors/retry, and valid zero results remain separate. Late responses for an older period cannot replace a newly selected report. Active drafts, routine templates, and saved measurements are unchanged.

## Storage and scope

The store reads completed summaries and distinct exercise-group coverage only for the selected date range, capped at today. Aggregation is shared pure domain logic, so each view uses the same counting rules. Schema stays at version 5. There are no dependency/lockfile changes, external services, accounts, analytics, chart packages, or sample personal records.

This is the period-reporting slice of milestone 5. Effective-dated weekly targets, weekly achieved states, current/longest streaks, and their monthly/annual consistency additions follow in the next PR. Exercise progress charts and export remain later work. They are not represented by placeholder product controls here.

## Validation

- 75 component/domain tests pass. New coverage includes cross-year Monday weeks, leap months, navigation bounds, current/past/future periods, count conservation, group deduplication, invalid duration accounting, period controls, error-versus-empty behavior, and stale-response isolation.
- 21 real SQLite tests pass. Report tests verify multiple gym/Home workouts on one date, current-tag group counts, draft exclusion/preservation, and recomputed results after backdating/deletion. Existing routines, calendar, migrations, and transaction tests stay green.
- TypeScript, zero-warning lint, Expo compatibility, iOS/Android/web exports, and the high-severity audit gate pass. Audit currently reports 1 low and 30 moderate findings, zero high/critical; no audit force-fix was applied.
- The real app browser journey logged older/current sessions, compared Week/Month/Year totals, checked session types versus extra Core exercise coverage, recorded time, future/past navigation, report refresh after a date correction, active-draft preservation, dark theme, and 320/390px layouts. Screenshots are in `screenshots/native-summary-*.png`. Fixtures are isolated from phone data.
- Physical iOS/Android large text, touch targets, screen-reader focus, safe areas, background/reopen, and date-correction review remain pending. Browser checks and JavaScript exports do not establish those native behaviors.

## Phone checklist

1. Reload Expo Go on this branch. No dependency installation or database reset is needed. On Home, tap Workout summaries.
2. Check a known month: workout total, distinct dates, Push/Pull/Legs and other used types, Gym/Home totals, and recorded time should match saved history. Two workouts on one date should produce two workouts and one active day.
3. Add Core exercises to a Push workout. Confirm Core exercise coverage increases without inventing a separate Core session. Verify several Chest exercises in one session count once toward Chest coverage.
4. Switch Week/Month/Year, navigate periods across December/January and leap-year February, and use Back to this period. Current periods should have no extra status label; future periods should have no completed results. A year should show twelve months.
5. Backdate, edit, or delete disposable test history, then return to summaries. The affected periods and calendar must agree. Leave a separate unfinished workout active and verify it resumes unchanged afterward.
6. Check dark/light mode, larger system text, narrow layouts, accessible count labels, and report navigation. Review unknown-duration wording if such records are introduced through future data portability features.

Keep the new PR a draft until user device review and explicit merge authorization.
