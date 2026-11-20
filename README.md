# Workout journal

A personal iOS/Android workout tracker for flexible gym and home sessions, equipment-specific progression, calendars, summaries, and weekly consistency goals.

## Current state

The repository contains interactive Coral Daylight HTML design previews with fictional data and an Expo SDK 58 app in `mobile/`. The native app supports gym/Home selection, compact collapsible exercise/set logging, persistent exercise-name suggestions, local draft recovery, and saved-workout history using SQLite. Completed workouts support explicit editing and confirmed deletion. See the [native UI review checklist](docs/ui-overhaul-review.md) and [saved-workout behavior](docs/workout-editing-review.md). Reusable routine templates and matching previous-session references are implemented; see the [routine review checklist](docs/routines-and-references-review.md). The month calendar and day details are implemented; see the [calendar review checklist](docs/calendar-review.md). Week/Month/Year reports are implemented; see the [summary review checklist](docs/summary-review.md). Weekly active-day targets and streaks are implemented; see the [goals review checklist](docs/weekly-goals-review.md). Exercise history and equipment-specific progress charts are implemented; see the [exercise progress review checklist](docs/exercise-progress-review.md). Settings, persisted System/Light/Dark appearance and JSON backup/restore are implemented; see the [backup review checklist](docs/backup-review.md). CSV reporting with all-history/date-range previews and sharing is implemented; see the [CSV review checklist](docs/csv-export-review.md). Timed/cardio sets and explicit workout-only recording are implemented; see the [flexible logging review checklist](docs/flexible-logging-review.md). No fictional workout history is seeded into the native database. The [first-version readiness guide](docs/first-version-readiness.md) records scale checks and the remaining iOS/Android review.

Open [design preview](previews/coral-daylight/design-preview.html) directly in a browser. Run `node scripts/verify-preview.mjs` to verify preview interactions and capture screenshots; this requires Node with built-in WebSocket support and Chrome at the Windows path configured in that script. Preview verification needs Node and Chrome without a separate dependency installation.

## Native app blueprint

Before the next native UI change, open [the interactive UI-overhaul preview](previews/ui-overhaul/ui-overhaul-preview.html) in a browser. It compares the proposed action-color hierarchy on setup, logging, and saved-workout screens, with light/dark appearance and fictional sample data. Run `node scripts/verify-ui-overhaul.mjs` for its Chrome interaction/responsive checks. This preview does not modify the Expo app.

The matching [history, summary, and consistency preview](previews/ui-overhaul/activity-preview.html) shows calendars, day details, weekly/monthly/annual reporting, and weekly goals/streaks using one fictional history. Run `node scripts/verify-activity-preview.mjs` to verify its interactions and shared counts.

- [Requirements and behavior](docs/requirements.md)
- [Architecture and decision rationale](docs/architecture.md)
- [Data model and export contracts](docs/data-model.md)
- [Implementation milestones and acceptance checks](docs/implementation-plan.md)
- [Preview design notes](docs/design-notes.md)

## Run the mobile foundation

For opening the iPhone preview away from the computer, see [hosted Expo Go setup and database transfer](docs/hosted-expo-go.md). Hosting delivers code/assets, not workout storage or cloud sync. Export JSON from the existing preview before switching; Expo Go may use a separate project storage scope.

Use Node 22.17.0 (CI's version), then run:

```powershell
cd mobile
npm ci
npm start
```

Open the QR code with Expo Go for SDK 58 on a physical phone connected to the same network. The start command explicitly targets Expo Go. After an SDK update, stop the old server with Ctrl+C, run `npm ci`, then `npm start -- --clear`, and scan the new QR. On physical iOS, sign in to the same Expo account in the CLI (`npx expo login`) and Expo Go if requested. `npm run web` provides a browser smoke check. iOS simulator launch requires macOS/Xcode; use the QR workflow for an iPhone from Windows.

From `mobile/`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:storage`, `npx expo install --check`, and `npm run build`. Build exports JavaScript bundles for iOS, Android, and web; it does not produce signed native install files. `npm audit --audit-level=high` is a separate merge-readiness check; SDK 58 resolves the original high-severity blockers while low/moderate findings remain. See [dependency review](docs/dependency-review.md). [PR 2 review instructions](docs/workout-saving-review.md) cover native draft/history persistence and remaining scope.

The app uses React 19.3.0 and React Native 0.88.1; exact resolved versions are in `mobile/package-lock.json`. [Review guide](docs/pr-review-guide.md) explains your first PR. Dependencies and build output stay out of Git; the preview's generated screenshots are retained as design artifacts.

Preview and review images are organized in [`screenshots/`](screenshots/). Verification scripts save regenerated screenshots there.

## Repository layout

Offline notes-to-draft import: [formats, assumptions and review steps](docs/notes-import-review.md).

Android standalone preview: [APK build, installation and data transfer](docs/android-apk.md).

Live workout rest timer: [preview, behavior and phone review steps](docs/rest-timer-review.md).

```text
assets/                       Shared preview fonts and icon metadata
docs/                         Requirements, architecture, and design notes
mobile/                       Expo iOS/Android application
previews/coral-daylight/       Original interactive design preview
previews/ui-overhaul/          Proposed UI overhaul preview
screenshots/                  Preview and app review images
scripts/                      Browser verification scripts
```
