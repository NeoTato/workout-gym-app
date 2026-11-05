# PR 8: weekly goals and streaks

Branch: `feat/weekly-goals-and-streaks`, based on merged PR 7. Complete the weekly-consistency slice of milestone 5; keep this PR unmerged for device review.

1. [x] Add pure effective-goal and weekly-streak calculations. Verify distinct dates, achieved/open/missed weeks, closed gaps, earliest-goal fallback, cross-year weeks, and selected-period consistency without iterating every empty historical week.
2. [x] Add schema version 6 with effective-dated weekly goals. Seed 3 days from the current Monday. Validate integer targets 1-7; schedule changes only for next Monday, replace the same pending change, and cancel it when returning to the current target. Preserve historical goals, workouts, and drafts.
3. [x] Add Home weekly progress and a goals/streaks screen with current/longest streaks, recent weeks, and a centered target chooser. Clearly separate achieved, open, closed unmet, future, and pre-activity weeks.
4. [x] Add effective targets to weekly summaries, complete-week consistency to monthly summaries, and longest streak among weeks intersecting a selected year. Keep current exercise-type counts and activity totals unchanged.
5. [x] Verify component/SQLite tests, types, lint, compatibility, exports, audit, and real runtime save/cancel/scheduling/navigation. Open a draft PR with a phone checklist.
6. [ ] User phone review and explicit merge authorization.

Calendar math uses stored local activity dates and Monday-Sunday boundaries. Two workouts on one date count once toward the target. An unmet current week remains in progress and retains a streak ending last week; only an unmet closed week breaks it. Goals before the earliest effective record use that earliest target. Backdating, editing, or deleting workouts recalculates against the target effective then.

Monthly and annual consistency uses complete weeks intersecting the selected period, including adjoining months/years. This differs from period workout totals, which remain strictly within their date bounds; the UI must explain this distinction. No daily attendance requirement, fitness score, notification permission, account, dependency, or seeded workout history is added.
