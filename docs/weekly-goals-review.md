# Weekly goals and streaks review

PR 8 adds schema version 6 and a weekly active-day target, initially three days. Target changes start next Monday. Changing a pending target replaces it; selecting the current target cancels the pending change. Past targets remain unchanged.

Gym and Home sessions both count, with any split. Multiple completed workouts on the same local activity date count as one active day. Drafts and future dates do not count. A current unmet week keeps the prior streak open; a closed unmet week breaks it. Editing, backdating, and deleting workouts recalculate progress. Earlier imported activity uses the earliest recorded target.

Home shows this week's progress. Goals and streaks shows current/longest streaks, recent weeks, and a centered chooser for 1-7 days. Weekly summaries show that week's effective goal. Monthly reports show achieved weeks with expandable details; annual reports show achieved weeks and the longest streak among weeks intersecting that year. These consistency results use full Monday-Sunday weeks, including adjoining dates, while report activity totals retain strict period boundaries.

## Phone checklist

Stop Metro with Ctrl+C and run `npm start -- --clear` from `mobile/`. This adds new route/component files and a database migration. Dependencies are unchanged.

- Check existing workouts, routines, locations, and an active draft remain available after opening the updated app.
- Open Goals and streaks from Home. Check weekly progress, current/longest streaks, and the recent weeks list in both themes.
- Open Change weekly target. Choose 4, then Cancel: nothing changes. Save 4: the current target stays unchanged and a next-Monday change appears.
- Change the pending target to 2, then select the current target to cancel the pending change. Restart the app and check persistence.
- Log workouts on separate days using corrected dates. Each day adds one; an additional workout on the same day does not add another active day. Gym/Home and different splits all count.
- Meet a weekly goal and check the green Goal met state and streak. Backdate or delete a workout and confirm Home, streaks, and reports refresh.
- Check Week/Month/Year consistency, expand monthly weeks, and navigate past/future periods. Future periods show no completed results.
- Confirm the target popup stays centered and scrolls on small screens or larger text. Test iOS/Android touch and screen-reader labels before merge.

## Automated evidence

81 Jest tests and 24 real SQLite tests pass. Coverage includes effective goal history, open/closed weeks, duplicate dates, missing weeks, cross-year and future periods, scheduling/replacing/cancelling changes, failed-save recovery, stale responses, version-five migration, file reopen, and history corrections. Type checking, lint, SDK compatibility, all-platform bundle export, and the high/critical audit gate pass. The unchanged dependency tree has 1 low and 30 moderate audit findings.

JavaScript exports and browser verification do not replace physical iOS/Android review. Leave this PR unmerged until the phone checklist is reviewed.
