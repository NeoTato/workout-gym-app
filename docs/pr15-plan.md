# PR 15: Live logging and rest timer

Stacked on the still-open hosted-preview PR 14. Keep PR 14 open until explicitly approved; timer review is a separate PR.

One rest timer per active workout. Default manual, 60/90/120-second presets and custom minutes/seconds. Start from a completed exercise set or between exercises. A compact global dock shows remaining time and +30 seconds, pause/resume, end and details/restart. Existing valid-input completion remains; optional auto-start waits for input blur and only a newly logged set. Historical edits never start rest.

Persist deadline/paused remainder and workout-scoped preferences in a transient SQLite table (schema 10). Derive countdown from the deadline, not interval ticks, to survive navigation/background/reload. Finish/discard/restore clear timer state atomically; rest is not workout measurement data and is excluded from JSON/CSV. Failed writes must retain the recoverable draft and timer.

Opt-in local completion notifications use SDK 58 expo-notifications. Request permission only when enabled. No push tokens or remote notification service. Pause/end/restart/extend reconcile only this project's scheduled reminder. Denial/failure leaves a working visual timer with an explicit status. Web provides the visual timer and explains that reminders are unavailable. Device lock-screen/sound behavior remains a physical-phone check.

Slices: pure timing/validation and storage lifecycle tests; notification adapter/provider and controls; live logging integration and input-commit tests; actual browser plus full checks; draft PR and hosted phone-review instructions. Use the existing action colors, 44+ px targets, a bounded scrollable modal and a compact dock that consumes layout space rather than overlapping inputs or Finish workout.
