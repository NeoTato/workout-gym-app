# Data model and portability contracts

Status: the entity blueprint below describes future capabilities as well as implemented ones. The native app on PR 10 uses SQLite schema version 8, adding persisted appearance to the revision-protected store. The **JSON backup version 1** section defines the actual interchange contract, limited to records the app currently stores. The original unshipped envelope was refined before its first implementation; future additions require explicit format migrations. The requirements document defines user behavior.

## Record conventions

Entity tables use UUID text `id`, UTC ISO-8601 `createdAt`/`updatedAt`. Catalog entities also have nullable `archivedAt`; snapshots and historical sessions do not inherit catalog edits. SQL uses snake_case and TypeScript/JSON uses camelCase. Booleans map to SQLite 0/1; JSON arrays of strings use JSON text columns. Names are nonempty trimmed text, not identities; allow duplicate names when IDs differ. Use integers for counts/reps/seconds and finite numbers for load/distance. Units are `lb`, `kg`, `plates`; load convention is `total`, `per_hand`, `per_side`. Do not multiply per-side loads automatically.

Store local dates as validated `YYYY-MM-DD`, instants as UTC strings, and IANA timezone separately. Never compare display-formatted dates. Monetary-style integer scaling is unnecessary for workout loads; compare converted measurements with a small numeric tolerance in tests rather than rounding stored values. Display conversion: 1 lb = 0.45359237 kg. Store distance in meters; formatting in km/mi is a preference. Round only for display/export formatting, not database updates.

## Entities

| Table / JSON collection | Fields beyond entity conventions | Rules |
|---|---|---|
| `locations` / `locations` | name, kind: `gym` or `home`, notes | Exactly one unarchived Home, created on first launch; cannot archive it. Multiple gyms allowed. No GPS permissions required |
| `session_types` / `sessionTypes` | name | Seed standard types, allow custom names; archive rather than delete when referenced |
| `exercises` / `exercises` | name, measurementMode, notes | Modes: `load_reps`, `reps`, `duration`, `distance_duration`. Library grouping, not a machine history |
| `exercise_muscle_groups` / `exerciseMuscleGroups` | exerciseId, groupName | Composite primary key; group names from an editable tag list, with no automatic inference from routine type |
| `equipment_variations` / `equipmentVariations` | exerciseId, locationId, name, measurementMode, loadConvention nullable, preferredLoadUnit nullable, notes | Required for every logged exercise, including bodyweight/Home. Measurement mode and convention immutable after use; new machine/convention means new ID. Preference may change lbs/kg, not plate-count dimension |
| `routines` / `routines` | name, sessionTypeId, notes | Template; changing it never changes prior sessions |
| `routine_slots` / `routineSlots` | routineId, exerciseId, position, suggestedSetCount nullable | Unique `(routineId,position)`, integer position; no hard cap on set count |
| `routine_alternatives` / `routineAlternatives` | routineSlotId, locationId, equipmentVariationId | Composite primary key `(routineSlotId,locationId)`; chosen equipment belongs to that location and to the slot's exercise. Substituting a different exercise is an explicit session edit |
| `sessions` / `sessions` | locationId, sessionTypeId, sourceRoutineId nullable, status: `active` or `completed`, entryKind: `logged` or `quick`, activityDate, timezone, startedAt, endedAt nullable, recordedDurationSeconds nullable, locationNameSnapshot, locationKindSnapshot, sessionTypeNameSnapshot, routineNameSnapshot nullable, notes | At most one active row, enforced with a partial unique index. Source routine is provenance only. Quick entries have no sets. Completion/update is atomic |
| `session_exercises` / `sessionExercises` | sessionId, exerciseId, equipmentVariationId, position, exerciseNameSnapshot, equipmentNameSnapshot, measurementModeSnapshot, loadConventionSnapshot nullable, muscleGroupsSnapshot: string[], notes | Unique `(sessionId,position)`; snapshot from library/variation when added to session. Explicit exercise substitution replaces its reference and snapshot, never relabels old completed sets silently |
| `sets` / `sets` | sessionExerciseId, position, completed, loadValue nullable, loadUnit nullable, reps nullable, durationSeconds nullable, distanceMeters nullable, notes | Unique `(sessionExerciseId,position)`. Draft rows can contain null fields; completed rows must satisfy their snapshot measurement mode |
| `weekly_goals` / `weeklyGoals` | effectiveWeekStart, targetDays | Unique validated Monday local date; target integer 1–7. Preserve history; same effective date updates a pending goal rather than creating duplicate rows |
| `settings` / `settings` | theme: `system`, `light`, `dark`; preferredWeightUnit: `lb` or `kg`; preferredDistanceUnit: `km` or `mi`; lastLocationId nullable | Singleton object/row, not generic arbitrary JSON. No credentials or external account state |

`routine_alternatives` and `exercise_muscle_groups` use their composite keys without UUID/timestamp fields. Settings uses a fixed singleton key internally, not a UUID. Library exercises can change display names/tags; new session snapshots use those edits, old snapshots do not. Historical grouping is by stable exercise/type IDs while individual session details retain their labels. Summary type labels use the current catalog name, falling back to the snapshot if archived/unavailable; renaming never splits counts.

Relationships: location → equipment variations and sessions; exercise → variations and routine slots; routine → slots → location alternatives; session → session exercises → sets. Foreign keys restrict removal of referenced catalog entries; session deletion cascades to its exercises/sets, routine deletion cascades to its own slots/alternatives only. Prefer archive in all catalog UI. Session location and variation location must match; an explicit location correction requires reselecting equipment before save. Preserve completed units/convention when correcting a session.

Indexes: sessions `(status,activityDate)`, `(sessionTypeId,locationId,activityDate)`, session exercises `(equipmentVariationId,sessionId)`, all child foreign keys, equipment `(locationId,exerciseId)`, and the unique ordering/goal constraints above. Add a singleton database metadata row with committed revision for stale restore detection; this is internal and excluded from backups. Increment its revision in the same transaction as every user-data mutation.

## Measurement and snapshot invariants

- Completed `load_reps`: nonnegative load, required compatible unit/convention, positive integer reps. Plate counts never convert to mass. A variation selects either mass units (`lb`/`kg`) or plate-count units; switching dimension requires a new variation.
- Completed `reps`: positive integer reps; no inferred load. Completed `duration`: positive integer seconds. Completed `distance_duration`: positive integer duration and optional positive distance in meters. Unused measurement fields must be null, not zero placeholders.
- Completed sets satisfy all required fields. An empty/unparseable edit remains an unsaved form value and cannot mark a set complete. Notes accept plain text; SQLite receives bound values only.
- Completed logged sessions contain at least one completed set; keep no incomplete sets or empty exercise rows after Finish. Quick sessions have no session exercise/set rows. Session date can be backdated; duration may remain unknown for quick entries. `endedAt >= startedAt` for logged sessions; recorded duration is separately editable and nonnegative.
- Snapshots include muscle tags and measurement semantics. Catalog rename/archive, routine reordering, and changing preferred display units do not rewrite historical meaning. Routine snapshots and original IDs survive JSON backup/restore.
- Derived counts, charts, streaks and personal bests are not independently persisted. Recalculate from completed records and historical goals, avoiding stale caches after edits or restore. A set of matching completed sets is the sole basis for last-time auto-fill.

## JSON backup version 1

This is the first implemented native format. It does not include the blueprint's future unit preferences, notes, session-type catalog, timed/distance measurements, quick sessions, muscle-tag snapshots or routine alternatives. Appearance can follow System or stay Light/Dark, units are stored on exercises, and exercise categories/subcategories are current catalog metadata. The appearance setting is included.

Minimal valid envelope:

```json
{
  "format": "workout-journal-backup",
  "formatVersion": 1,
  "exportedAt": "2026-10-31T10:00:00.000Z",
  "appVersion": "0.1.0",
  "data": {
    "locations": [{ "id": "home", "name": "Home", "kind": "home", "archived": false }],
    "exercises": [],
    "equipmentVariations": [],
    "routines": [],
    "routineSlots": [],
    "sessions": [],
    "sessionExercises": [],
    "sets": [],
    "weeklyGoals": [{ "effectiveWeekStart": "2026-10-26", "targetDays": 3 }],
    "draft": null,
    "settings": { "appearance": "system" }
  }
}
```

Exact collection fields (all required; JSON booleans, camelCase names):

| Collection | Fields |
|---|---|
| locations | id, name, kind, archived |
| exercises | id, name, measurementMode, category, subcategory |
| equipmentVariations | id, exerciseId, locationId, name, measurementMode, loadConvention, loadDimension |
| routines | id, name, sessionType, locationId, locationNameSnapshot |
| routineSlots | routineId, position, exerciseId, name, equipment, bodyweight, unit, convention, category, subcategory, setCount |
| sessions | id, activityDate, timezone, startedAt, endedAt, locationId, locationNameSnapshot, locationKindSnapshot, sessionTypeNameSnapshot, status |
| sessionExercises | id, sessionId, exerciseId, equipmentVariationId, position, exerciseNameSnapshot, equipmentNameSnapshot, bodyweight, loadUnit, loadConvention |
| sets | id, sessionExerciseId, position, loadValue, reps |
| weeklyGoals | effectiveWeekStart, targetDays |
| settings | object with appearance: `system`, `light` or `dark` |
| draft | null or the complete WorkoutDraft: id, startedAt, activityDate, timezone, locationId, sessionType, exercises; optional endedAt, setupComplete, timing |

Draft exercises contain id, name, equipment, bodyweight, unit, convention, sets; optional catalogId, category, subcategory. Draft sets contain id, weight, reps, completed; weight/reps remain exact strings so unfinished invalid/blank input survives. Optional timing contains startDate/startTime/endDate/endTime; pending times may be blank. Completed draft sets still require valid measurements. See the executable contract in `mobile/src/domain/backup.ts`.

IDs accept 1-128 ASCII letters, digits, underscores or hyphens (including existing UUIDs and the built-in `home`). Positions are nonnegative safe integers and unique within each parent. Measurement modes are `load_reps` or `reps`; dimensions are `mass`, `plates` or `bodyweight`. Bodyweight completed loads are null; numeric zero remains zero. Exactly one unarchived built-in Home and at least one Monday goal are required. New exports include settings. Earlier PR 10 preview backups without this field remain accepted and default to System; malformed settings are rejected. Unknown fields, invalid references and unsupported versions are rejected rather than silently discarded.

`appVersion` comes from actual app configuration. Backup `formatVersion` is independent of SQLite `user_version` and the app release version. Deterministic ordering by ID/composite key makes round-trip comparison practical; collection ordering never replaces explicit exercise/set positions. No internal revision, SQL, paths or generated summaries are accepted in the envelope.

Create JSON from a consistent database read transaction after queued writes finish. Generate a `.json` file using UTF-8 and `application/json`; filename `workout-journal-<UTC timestamp>.json`. Offer the OS share sheet. Canceling sharing does not delete workout data; distinguish “file prepared” from “saved to another app.” Do not treat a cache file as durable backup or display an unverifiable last-cloud-backup timestamp.

Restore protocol:

1. Pick JSON with DocumentPicker and copy to cache. Treat picker cancellation as cancellation, not failure. Reject files over 50 MiB before parsing as a conservative v1 memory guard; explain the limit without changing local data.
2. Validate the exact recognized format/version, required field types, IDs, finite numeric values, timestamps/dates/timezones, enum values, unique IDs/compound keys, ordering positions, references, Home/goal invariants, one-active-draft limit, and completed-set/session rules. Preserve recorded local dates across travel: for backup temporal validation, compare a completed session's date to `exportedAt` interpreted in that session's timezone, rather than rejecting valid records because the importing device is currently a day behind. Reject unknown format versions; do not partially import or guess how to repair data. Version 1 is the only initial accepted version; future versions need explicit migrations.
3. Show record counts, date range, whether a draft is included, and that restore replaces the entire local dataset. Offer full backup export of the current data before confirmation. Require explicit Replace confirmation, never implicit consent from picking a file.
4. Block writes during confirmed replacement. Match the inspection token to the cached bytes' digest and database revision; if either changed, repeat inspection and confirmation. Use a transaction to delete children before parents and insert parents before children, map DTOs to the current schema, run foreign-key/invariant checks, and commit. Update metadata revision in that transaction. Never execute SQL, paths, or code from the JSON.
5. On validation, storage, or transaction failure, roll back all changes and retain the original dataset. On success, clear in-memory draft state, reload Home queries, and resume the restored draft if present. IDs and goal history retain their original values. Re-importing replaces rather than appends, so it cannot duplicate sessions.

Full restore includes appearance, pending goal changes and the unfinished workout. It does not downgrade the database migration version or restore caches, browser fixtures, telemetry, or generated summaries. No merge mode or CSV import in v1. A new database keeps its own internal metadata row and current migration version, regardless of backup creation date. Revision triggers increment for all writes to the nine record tables, draft checkpoint and settings; failed transactions roll those increments back too. Browser downloads/file inputs provide the equivalent web workflow without uploading files.

## CSV export version 1

PR 11 implements CSV reporting for the current loaded/bodyweight workout records. Export only completed sessions, using stored activity dates and original measurements. All-history and inclusive from/to dates are supported; validate `from <= to`. Export one row per completed set, ordered by activity date, session startedAt/ID, exercise position, and set position. A completed session without sets emits one `session` row so it is not lost; quick-workout logging is not implemented yet. Repeat session metadata on set rows; totals in a spreadsheet must group by `session_id`, not count every CSV row as a session.

Fixed header:

```text
record_type,session_id,activity_date,timezone,started_at,ended_at,session_type_id,session_type,routine,gym_or_home,location_id,location_kind,exercise_id,exercise,equipment_id,equipment,measurement_mode,load_convention,set_number,load_value,load_unit,reps,duration_seconds,distance_meters,session_duration_seconds,session_notes,exercise_notes,set_notes
```

`record_type` is `set` or `session`. Labels use session snapshots, including removed gyms. The current app has no session-type catalog ID, source-routine provenance, exercise duration/distance or notes; those columns stay empty. `session_duration_seconds` is derived from saved start/end instants. `set_number` is 1-based display order. Preserve null as empty, zero as `0`, decimal point as `.`, and original units. Bodyweight load, unit and convention cells are empty. Exclude drafts and incomplete sets. Empty results produce a header-only file, explained in the preview before sharing.

Use UTF-8 with a BOM for common spreadsheet compatibility, CRLF rows, and RFC-style quoting: double embedded quotes and quote all text cells, including those containing commas, quotes or newlines. For user-controlled text cells, prefix a single apostrophe when the value begins with a spreadsheet formula/control trigger (`=`, `+`, `-`, `@`, tab, CR, LF), including full-width variants and checking after leading whitespace/control characters. Do not alter numeric measurement cells. CSV is intentionally presentation-oriented; JSON preserves exact text for restoration. Test quoted multiline notes, non-Latin names, Unicode, and formula-like exercise names. Generate a `.csv` file with `text/csv` and filename `workout-history-<UTC timestamp>.csv`, then share through the native adapter.
