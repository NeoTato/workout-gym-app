# PR 2: workout entry and local saving

## What this slice adds

Home loads real saved sessions and offers **Start workout** or **Resume workout**. A workout starts empty, with location selection, a session type, editable exercise/equipment names, and one set. Add a gym, choose Home or a saved gym, add any number of exercises/sets, and mark completed sets done. Loaded exercises support lbs/kg/plate counts and total/per-hand/per-side conventions; bodyweight exercises record reps without inventing a load. Changing measurements clears that set's completion flag so the user reconfirms the new values. Removing completed work asks for confirmation.

Every form edit writes a serialized draft checkpoint through a single ordered SQLite queue. The status distinguishes saving, saved, and failed edits with Retry. Home keeps an unfinished workout available to resume, including after app reload. Finish validates completed sets and saves normalized session/exercise/set snapshots plus equipment identities in one transaction, then removes the draft. Incomplete sets and empty exercises are excluded. Repeat Finish calls do not duplicate the session, and late autosaves cannot recreate a finished draft. Discard asks for confirmation.

Home's history rows open the saved location, type, equipment, units/convention, and each completed set. Startup/read failures show an explicit error with recovery guidance; no reset or fallback-to-empty database is performed. No prototype sessions are seeded into personal storage.

## How to test on iPhone

1. Stop any old Expo server before updating dependencies. In `mobile`, run `npm ci` if testing a freshly pulled checkout, then `npm start -- --clear`. Use Expo Go for SDK 58, signed into the same Expo account as the CLI.
2. Start a workout. Try finishing without selecting a location or completing a set; expect a clear validation message.
3. Choose Home or add a named gym, choose Push, and enter a chest exercise. Enter lbs/kg/plates and a load convention. Enter reps and mark the set done.
4. Add a second completed set, then more sets so there are at least four. Leave some incomplete. Add a Core exercise using Bodyweight reps and mark a set done.
5. Wait for “Saved on this phone.” Fully close Expo Go, reopen the project, and tap Resume workout. The draft's names, values, location, and completed flags should remain.
6. Finish. The detail screen should show only completed sets, their original measurements, and the correct location/type.
7. Return Home. Fully close/reopen Expo Go again; the saved workout should still appear and open correctly, with no unfinished duplicate.
8. Start another draft, test removal/discard confirmation, and confirm the first saved workout is unaffected. Check light/dark mode, text scaling, number keyboards, and scrolling with the keyboard open.

If the earlier duplicate-view registration error returns, preserve the exact view name and whether it followed Fast Refresh. A full close/reopen resolved it previously; no package patch or suppressed error is included in this PR.

## Implementation decisions

SQLite migration 1 introduces locations, shared exercises, location-specific equipment variations, completed sessions, session exercise snapshots, completed sets, and a single draft checkpoint. This is a thin subset of the target logical model in `data-model.md`; routine/type catalogs, goal history, timestamps/archive metadata on catalog entities, and reporting-specific fields will arrive through ordered migrations as those capabilities are built. Session types are currently the agreed built-in labels stored as snapshots; UUID-backed custom type/routine management is a later slice. The reserved local location ID `home` identifies Home; user-created gyms, sessions, exercises, equipment, and sets use UUIDs.

Draft checkpoints deliberately retain raw form strings, including incomplete input, separately from validated completed records. This extends the earlier valid-input-only draft assumption to avoid losing partially typed entries. Checkpoints are never counted as completed activity. Workout completion moves validated content into normalized tables atomically. Future backup support must include the active checkpoint and translate the incremental schema to the versioned logical backup DTO; no backup/export feature is claimed here.

The database adapter is private to the repository. A single queue serializes **all** reads and writes on its connection, so `withTransactionAsync` cannot inadvertently include another caller's query and foreign-key PRAGMAs apply on that same connection. This is the deliberate alternative to the earlier exclusive-transaction proposal, and also supports browser SQLite. Never expose the raw connection to UI code or add unqueued access. Queries bind all user values; migrations use fixed SQL. A newer schema version is rejected without resetting the file.

The SQLite browser worker requires WASM support and COOP/COEP headers, configured for the local Metro server. Native iOS/Android do not need these web headers. If serving an exported web bundle, its server must add those headers as described by [Expo SQLite SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/). This is local smoke-test support, not a web deployment or cloud sync feature.

## Verification boundaries

- `npm test`: native component behavior and semantic controls using the Expo test preset.
- `npm run test:storage`: actual on-disk SQLite close/reopen, transactional rollback under injected failure, completion idempotence, late-autosave protection, gym-specific equipment, bodyweight semantics, invalid input rejection, and newer-schema preservation. The test uses Node's SQLite engine and type-stripping flags, which emit experimental warnings on Node 22.17.0; they are not installation errors or skipped checks.
- Browser journey: isolated profile, real Expo SQLite web worker, gym creation, multiple exercises and four sets, saved draft reload/resume, atomic Finish, incomplete-set exclusion, and saved-history reload. Browser storage is isolated from the phone.
- `npm run typecheck`, `npm run lint`, `npx expo install --check`, `npx expo-doctor`, `npm run build`, and `npm audit --audit-level=high` remain required checks.

Node/browser results are evidence for SQL and UI behavior, not proof of iOS/Android native-module behavior. Physical iPhone verification is pending user review; Android device verification remains pending too. The PR stays unmerged until reviewed.

## Later PRs

Saved routines, last-session references, exercise library management, timed/distance entries, historical edit/delete/date correction, quick workout completion, calendar integration, summaries/streaks/charts, backup/restore, and CSV export remain planned. This PR establishes the durable recording path those features will read; it does not claim the full tracker is finished.
