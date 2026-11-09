# PR 13: First-version readiness

This is a personal offline readiness pass, not an app-store release. PRs 1–12 are merged. No login, server, cloud sync, telemetry or new product feature is in scope.

- [x] Add an isolated five-year mixed-workout fixture and cross-view consistency checks using actual SQLite. Compare history, calendar, summaries, progress, CSV, JSON restore and unfinished draft recovery; verify edits and deletion propagate. Record timings and query counts without machine-dependent timing assertions.
- [x] Run existing quality checks and a real browser offline/reload journey. No application defect was reproduced. Record limits of desktop/browser evidence; do not claim physical-device performance or lifecycle validation.
- [x] Prepare a repeatable phone checklist and current implementation status for the draft PR. Device/OS versions, iOS/Android lifecycle, accessibility, keyboards and OS file transfer remain explicit reviewer checks.

Do not add indexes or redesign history storage without measured evidence. Fixtures live only under mobile/tests and are never loaded by the app. Tests may use temporary or in-memory databases; never use the user's journal.
