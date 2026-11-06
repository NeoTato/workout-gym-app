# First-version requirements

Status: implementation blueprint, consolidated from the product discussion on October 31, 2026. Technical defaults below are explicit proposals, not existing functionality.

## Outcome and boundaries

Make it quick to record what you actually did, see previous performance on matching equipment, and understand consistency over time. Serve one person on iOS and Android, fully offline without accounts. Preserve the Coral Daylight design, device light/dark theme, accessible contrast, large logging controls, and autosave feedback.

Include gym/Home selection; equipment variations; custom exercises and routines; flexible sessions; previous-session references; exercise history and charts; calendar day details; weekly targets and streaks; weekly/monthly/annual summaries; JSON backup/restore; and CSV export. Defer cloud sync, social features, automatic progression prescriptions, rest timers, plate calculators, full Notes import, and store distribution.

## Core workout flow

1. Choose a saved gym, Home, or a new named gym. Suggest the last location but require an explicit selection/confirmation each time. Home is a location with its own equipment variations.
2. Choose a saved routine or start empty. Seed session types Push, Pull, Legs, Upper, Lower, Full Body, Core, Cardio, Mobility, and Custom; allow user-defined types. Routine and type are separate: several routines can belong to Push.
3. Load the routine as an editable session copy. Add, remove, substitute, or reorder exercises; add/remove sets without a fixed limit. Skipping exercises or finishing early never changes the routine automatically.
4. Show the latest completed session of the chosen type at that location and a short list of recent matching sessions. Show each exercise's latest completed sets for the exact equipment variation, regardless of the earlier routine type. Other gyms' sessions are viewable and labeled, but their loads never auto-fill a different equipment variation.
5. Complete sets independently. Different sets can use different loads and repetitions. Save valid changes and show pending/saved/error status. Drafts survive restarts; allow one unfinished session at a time, with Resume or Discard before creating another.
6. Finish after any completed exercise; only completed sets count as performed. Confirm removal of completed data, with undo before final save. A zero-set session can only finish through an explicit quick “Mark workout done” confirmation. Quick entries require location, session type, and date; duration and notes are optional.
7. Review/edit date, recorded duration, session type, notes, exercises, and sets later. Explicitly saving a session as a routine is the only way its changes become a template. Discard/delete requires confirmation; deleting a session removes its activity contribution.

Support measurement modes: load + reps, bodyweight reps, duration, and duration + optional distance. Load supports lbs, kg, or machine plate counts; convention is total, per hand, or per side. Bodyweight exercises may use explicit added load via a separate loaded variation. Never infer actual body mass, bar weight, or plate totals. Default measurement units can be overridden per exercise/variation; the original set unit is retained.

Gym equipment is grouped under a shared exercise but tracked separately by variation, including different machines in one gym. Gym-specific routine alternatives are optional mappings, never silent equipment equivalence. If none exists, prompt to choose/create equipment or skip the slot. Changing an equipment variation's measurement mode/convention requires a new variation to preserve comparisons. Exercise and equipment notes capture machine labels and setup details.

## Dates, counts, and streaks

- Store UTC instants for events and a separate local `YYYY-MM-DD` activity date and IANA timezone on each session. Default the date to the session's start date; crossing midnight still counts once. Let the user correct it. Device timezone changes do not re-date old workouts. Do not allow completed workouts dated in the future relative to the device's current local date.
- Use Monday–Sunday weeks, calendar months, and calendar years. Resolve local date components directly; never derive an activity date by slicing a UTC timestamp. A date-range export includes both selected local dates.
- Only completed sessions contribute. Multiple sessions on one date count as multiple sessions but one active day, including gym and home combinations. A shortened Push session is one Push session. Adding core exercises to Push adds core coverage; a separate Core session adds a Core session count.
- Default the initial weekly goal to 3 active days, editable from 1–7. Set the initial goal effective from the current week's Monday. Later goal changes take effect next Monday; a new selection replaces any pending change for that same Monday. Retain effective-dated goal history.
- A week is achieved when its unique active days meet its effective goal. Current streak includes the current week if achieved; otherwise count back from the previous week while the current week is still open. An unmet open week does not break the streak. Longest streak is the maximum consecutive achieved weeks, including an achieved current week. Unmet closed weeks break it; weeks before the first recorded activity do not contribute. Backdated edits/deletions recalculate historical results using the goals then in effect. For imported activity before the earliest goal, use that earliest goal.

## Calendar and reporting

Calendar dates show completed activity, distinguish today, and open a detail sheet/page with every session that day, location, type, duration, exercises, and completed set measurements. Distinguish days with no workouts from missing/error/loading data. Month controls navigate across years and leap years.

Week/Month/Year summaries share one calculation source and show unique active days, session count, known training duration, counts by session type, gym/Home sessions, and muscle groups trained. Weekly views show the applicable target; monthly views add weekly consistency; annual views add active days by month and longest weekly streak achieved within the selected year's intersecting weeks. Use the selected dates to identify current periods; future periods have no completed results. No single fitness score or implied decline against unfinished periods.

Count a muscle group once per session when at least one completed set belongs to an exercise tagged with that group. Groups may overlap. Quick entries contribute activity and type counts but not invented exercise coverage or load records. Unknown durations are omitted from the sum and labeled, e.g. “8h recorded · 2 sessions without duration,” not treated as measured zero.

Exercise progress shows dated completed sets and best completed load or reps/duration/distance appropriate to the measurement mode. A loaded chart shows highest completed load per session for one equipment variation and convention; convert lbs/kg to the selected display unit without changing stored measurements. Plate counts stay separate. Display reps with load records; avoid claims of improved strength based solely on a higher load with different reps. Duration or distance charts show measurements, not automatically “better” performance.

## Data portability

Settings → Data & backups provides full JSON backup, replace-only restore, and CSV export of all completed sessions or an inclusive date range. JSON includes archives, routines, targets, settings, all sessions, and any unfinished draft. CSV includes completed sets and identifiable quick-session rows; it is for spreadsheets, not restoration. Preserve original units and conventions.

Use native file selection/sharing. Present backup contents and replacement consequences before restore, validate before altering anything, and restore atomically. Show successful local file creation/sharing separately from a confirmed external cloud save: the share sheet cannot prove the user saved a backup. Exports contain personal workout data; show a brief note on the export screen. No app-controlled upload or automatic cloud sync.

## Initial data and acceptance

Seed readable exercise names from the screenshots as editable library entries, with no weights, dates, gym assignments, or fabricated historical records. Do not ship the prototype's fictional sessions in the personal database. Let the user assign measurement mode, equipment, and muscle tags when first using an exercise.

When naming an exercise, offer searchable suggestions from previously logged exercises, while allowing a new name. Suggestions must persist across sessions and app restarts, match regardless of capitalization, and avoid duplicates caused only by surrounding/repeated whitespace. Selecting a name reuses its exercise identity; equipment variations remain specific to the chosen gym. Include suggestions in both new workout logging and saved-workout exercise editing. A name merely typed into an unfinished/discarded entry is not presented as previously logged history.

First-version acceptance: log a shortened workout at a chosen gym, restart the app, finish and reopen it in the calendar; verify the same data feeds progress, type counts, streaks, JSON round-trip, and CSV. Repeat with Home, a second gym, core/duration/cardio measurements, and two sessions on one day. See the implementation plan for staged checks.
