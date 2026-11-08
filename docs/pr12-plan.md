# PR 12: Flexible workout logging

Scope: add duration-only sets (whole seconds), distance + duration sets (kilometres and whole seconds), and explicit workout-only completion. Keep load/reps and bodyweight behaviour unchanged. No running stopwatch, GPS, calories, pace rankings or cloud services.

Tracking belongs to each exercise/equipment variation. Duration/distance must never become fake reps or weights. Existing routines, previous-session references, editing, progress, JSON backup and CSV must retain the same measurements. Distance is stored in metres; entry uses kilometres. Progress shows longest completed duration or distance, not a performance/strength score.

Workout-only completion requires explicit confirmation, valid dates/location/type and no exercise content. It counts as a completed session and active day, contributes recorded elapsed time, and adds no sets or muscle coverage. Editing may add exercises; converting a detailed session to workout-only requires removing exercises and selecting the option explicitly.

Storage migration must preserve existing records and backup revision triggers. JSON v2 adds the new fields; v1 imports remain supported with explicit defaults. Older apps reject v2 rather than silently losing measurements.

Slices: (1) domain validation and migration/storage/backup/export contracts, (2) logging/history/reference/routine/progress UI, (3) real SQLite and browser journeys, full existing checks, draft PR for phone review. Leave unmerged.
