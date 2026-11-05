# PR 7: weekly, monthly, and annual workout summaries

Branch: `feat/workout-summaries`, based on merged PR 6. This is the reporting slice of milestone 5; weekly targets, achieved weeks, and streaks follow in a separate PR. Keep the new PR unmerged for phone review.

1. [x] Add pure Monday-week/calendar-month/calendar-year bounds, navigation, and aggregation. Test cross-year weeks, leap years, multiple workouts per date, duration validity, future/current periods, type/location count conservation, and per-session exercise-group deduplication.
2. [x] Add a bounded completed-session summary query plus current exercise-tag coverage. Preserve active drafts and historical activity dates; refresh after edited/deleted/backdated history. No schema or dependency change.
3. [x] Add a Home summary entry and a report screen with period selection/navigation, clear current-period status, totals, activity bars, type/location breakdowns, and exercise groups. Keep errors/loading separate from zero results.
4. [ ] Verify component/SQLite tests, types, lint, SDK compatibility, exports, audit, and real runtime date-navigation and refresh. Open a draft PR with a physical-device checklist.
5. [ ] User phone review and explicit merge authorization.

Reports use stored local activity dates and location snapshots. Sessions and active days stay distinct. Recorded time is derived from valid session start/end timestamps; unknown durations are omitted and counted explicitly. Exercise groups use current library category/subcategory metadata established in PR 4 and count each group at most once per workout. They never invent separate session types. No fitness score, unfinished-period decline, fabricated data, charting dependency, account, or remote service is added.
