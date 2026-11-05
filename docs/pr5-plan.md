# PR 5: reusable routines and previous-session references

Branch: `feat/routines-and-references`, based on merged PR 4. Follow milestone 3 of the approved roadmap in thin slices. Keep the PR unmerged for device review.

## Scope and contracts

- Save a completed workout as a named routine. A routine holds ordered exercise/setup choices and suggested set counts, never performed measurements or completion flags. Rename, replace explicitly from another completed workout, or remove a routine without altering workout history.
- Select a routine in workout setup after choosing a location. Copy exercises into an independent draft with fresh IDs and blank, incomplete sets. Existing draft exercises are retained. Reusing at another location clears equipment labels and explains that Setup needs checking. Choosing a routine never silently changes the selected gym.
- Show up to three recent completed workouts of the selected session type at the selected location. Link to saved details without discarding the active draft.
- Show last completed sets for the exact exercise, gym, equipment label, tracking mode, load convention, and mass/plates dimension, regardless of prior session type. Exclude the current session and sessions later than the draft's activity date/start. Show original units read-only; never fill new measurements or mark them complete.
- Surface loading/query failures separately from valid empty results. Preserve SQLite migration and transaction guarantees, saved edits/cancel, and existing history.
- Calendar, charts, summaries/streaks, custom session types, timed/distance tracking, advanced routine alternatives, and arbitrary routine slot editing remain later slices. Routines are created/replaced through the existing flexible workout editor.

## Ordered tasks and acceptance

1. [x] Add previous-session store queries and real SQLite tests. Test location/machine/mode/convention/dimension isolation, cross-type references, backdating, exclusion of current/draft entries, and failed reads.
2. [x] Add routine domain copying and versioned persistence. Test fresh IDs, blank measurements, set counts, independent snapshots, duplicate names, rename/removal, replacement, migration, and different-gym equipment handling.
3. [x] Connect routine saving/management and selection to existing screens. Test cancellation, validation, failed actions/retry, and preservation of active drafts and saved workouts.
4. [x] Connect recent-session and exact-equipment references with focus refresh and stale-response protection. Test dependency changes, failures, empty states, and absence of automatic measurement copying.
5. [ ] Review keyboard, narrow layouts, light/dark, and accessibility in the actual runtime. Run component/storage tests, types, lint, compatibility, exports, and audit. Update review docs and open a draft PR for phone testing.

## Implementation decisions

Routine templates keep one source location, with explicit clearing of equipment labels when copied elsewhere. Multi-location alternatives require separate UI and remain future work. Removing a routine affects templates only. Exercise categories continue as library metadata as established in PR 4; routine copies carry the selected classification without changing session-type counts.

Use the existing serialized SQLite connection for all reads and writes. No new dependency, service, account, telemetry, or sample user data is required.
