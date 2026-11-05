# PR 6: calendar and day details

Branch: `feat/workout-calendar`, based on merged PR 5. Implement the approved calendar preview using only completed SQLite workouts. Keep the PR unmerged for phone review.

1. [ ] Add pure Monday-first month/date/filter helpers. Verify leap years, year rollover, empty months, recorded activity dates, multiple sessions per day, and gym/Home filtering.
2. [ ] Add a day-detail store query and location-kind snapshots in workout list read models. Test multiple sessions, archived locations, draft exclusion, edits/deletions/backdating, and invalid inputs without a database reset or migration.
3. [ ] Add the Home month calendar, completion counts, today/selection indicators, location filters, and compact month workout list. Preserve selected month/filter and scroll position when returning from details.
4. [ ] Add a day-details page with every matching session, time/location metadata, collapsible exercise/set details, and links to the existing editor. Returning after edits/deletion refreshes both the day and calendar; empty, loading, and error states stay distinct.
5. [ ] Verify component/storage tests, types, lint, compatibility, exports, audit, and real runtime interactions in light/dark and narrow layouts. Open a draft PR and provide the physical-device checklist.
6. [ ] User phone review and explicit merge authorization.

The calendar uses each session's stored local activity date, never a UTC timestamp slice. Crossing midnight counts once. Gym/Home filtering uses saved location-kind snapshots, including removed gyms. Multiple workouts on one date count as several sessions and one active day. Existing history summaries are already loaded by Home; month filtering is initially in memory, while full exercise/set data is queried only for a selected day. Revisit bounded summary queries with multi-year performance evidence.

Summaries by week/month/year, weekly targets/streaks, exercise charts, and export remain later PRs. No dependency, sample personal data, account, or schema migration is required.
