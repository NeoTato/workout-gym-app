# PR 9: exercise history and progress

Branch: `feat/exercise-history-progress`, based on merged PR 8. Leave unmerged for phone review.

Implementation and verification steps 1-5 are complete. Physical phone review and merge authorization remain pending.

1. Add pure progress models and calculations, with tests for original units, lb/kg conversion, zero loads, bodyweight reps, repeated exercises in one session, and separate equipment identities.
2. Read completed exercise history from SQLite using catalog and equipment variation IDs. Preserve gym, equipment, measurement mode, load convention, original units, session snapshots, and archived location history. Drafts never contribute; corrections and deletion recompute results. No schema or dependency change.
3. Add a searchable exercise progress library from Home and a detail page with explicit equipment/location selection, lb/kg display selection for mass loads, all-time recorded best, a labeled recent-session bar chart, and expandable session sets with links to saved workouts. Refresh on navigation focus and ignore stale requests.
4. Add progress links inside expanded saved-workout exercise cards. Keep existing collapse behavior and navigation context.
5. Verify domain, real SQLite and component tests, lint/types, compatibility, all-platform export, audit, and actual browser journeys including edit/delete refresh, dark mode, small layouts and empty/error states. Open a draft PR with review instructions and screenshots.
6. User phone review and explicit merge authorization.

Comparison policy: one equipment variation ID represents one exercise, gym, equipment name, measurement mode, load convention and dimension. Never combine machines, gyms, per-hand/per-side/total values, bodyweight and loaded modes, or plates and mass. Within a compatible mass variation, convert lb/kg only for charts and recorded-best display; keep saved sets in their original units. The chart shows heaviest recorded load per session, or highest reps per set for bodyweight, and is not a strength score or estimated one-rep max. Multiple occurrences of the same variation in a workout form one session point. Show the latest 12 session points, with chronological spacing by session rather than elapsed time; history initially shows 10 sessions with explicit expansion. No new measurement modes, coaching, cloud service, export feature or fabricated history.
