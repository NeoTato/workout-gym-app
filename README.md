# Workout Journal

A personal workout tracker for iOS and Android. Log gym or home sessions, track progressive overload, and build consistency with flexible routines and weekly goals.

## Features

- Log loaded, bodyweight, timed, and cardio sets—or record a workout without individual exercises.
- Paste workout notes, review the detected exercises and sets, and add them to your workout.
- Organize exercises by category and subcategory, reuse routines, and reference previous sessions.
- Use a rest timer with selectable alarm sounds, snooze, and notifications.
- Browse your calendar, exercise progress, weekly/monthly/yearly summaries, and streaks.
- Edit completed workouts, including date and time. Saving keeps the exercise chooser open for further edits.
- Back up and restore with JSON, export CSV reports, and choose Light, Dark, or System appearance.

Home shows your weekly progress, unfinished workout, and latest completed workout. Bottom navigation connects Home, History, Progress, and Settings, with a raised **＋ Workout** button in the center.

## Try the app

**Android:** [Download APK — v0.1.0, build 2](https://expo.dev/artifacts/eas/A93Zm9cVJD92k2t5oO6LbOB_X65sS8tu0e2aGwE_P1A.apk). Install over the existing app to retain its data. It runs without Expo Go or a development server. See the [Android installation guide](docs/android-apk.md).

**iPhone:** [Open the hosted preview QR](https://qr.expo.dev/eas-update?projectId=f9e71877-6a1a-410c-91c1-74593c6b70d7&groupId=af420a75-6df3-430f-b749-2bff679c034d) using SDK 58 Expo Go, signed in as the project owner or an authorized organization member. Internet is needed to download the preview; your computer can be off. See the [hosted preview guide](docs/hosted-expo-go.md).

Workouts are stored locally in SQLite. Hosting delivers app code, not cloud backup or synchronization. Export a JSON backup before switching installations or devices. Uninstalling the app removes its local data.

## Run locally

Use Node.js 22.17.0 and Expo Go for SDK 58.

```bash
cd mobile
npm ci
npm start
```

Scan the QR on a phone connected to the same network. If Expo requests authentication, run `npx expo login` and sign in to Expo Go with the matching account. For a browser preview, run `npm run web`.

## Development checks

Run from `mobile/`:

```bash
npm run typecheck
npm run lint
npm test
npm run test:storage
npx expo install --check
npm audit --audit-level=high
npm run build
```

`build` exports iOS, Android, and web bundles. To create an installable Android APK through EAS, use `npm run build:apk` with the configured Expo account. Device testing remains part of PR review.

## Project structure

```text
mobile/        Expo SDK 58 application
docs/          Requirements, architecture, and feature review guides
previews/      Interactive HTML design studies with fictional data
assets/        Shared preview assets
screenshots/   Design and app review images
scripts/       Preview verification scripts
```

## Documentation

- [Requirements](docs/requirements.md), [architecture](docs/architecture.md), and [data model](docs/data-model.md)
- [Implementation roadmap](docs/implementation-plan.md) and [PR review guide](docs/pr-review-guide.md)
- [Navigation and editing review](docs/navigation-review.md)
- [Notes import](docs/notes-import-review.md), [rest timer](docs/rest-timer-review.md), and [backup/restore](docs/backup-review.md)
- [Interactive navigation design](previews/navigation/index.html) and [original design](previews/coral-daylight/design-preview.html)
