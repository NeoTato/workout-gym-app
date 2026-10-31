# Workout journal

A personal iOS/Android workout tracker for flexible gym and home sessions, equipment-specific progression, calendars, summaries, and weekly consistency goals.

## Current state

The repository contains an interactive Coral Daylight HTML design preview with fictional data and an Expo SDK 58 mobile foundation in `mobile/`. The native foundation shows an empty themed Home screen; workout persistence and exports are not implemented yet. The approved prototype remains the visual reference for the full app.

Open [design-preview.html](design-preview.html) directly in a browser. Run `node verify-preview.mjs` to verify preview interactions and capture screenshots; this requires Node with built-in WebSocket support and Chrome at the Windows path configured in that script. No dependencies are currently installed.

## Native app blueprint

- [Requirements and behavior](docs/requirements.md)
- [Architecture and decision rationale](docs/architecture.md)
- [Data model and export contracts](docs/data-model.md)
- [Implementation milestones and acceptance checks](docs/implementation-plan.md)
- [Preview design notes](DESIGN-NOTES.md)

## Run the mobile foundation

Use Node 22.17.0 (CI's version), then run:

```powershell
cd mobile
npm ci
npm start
```

Open the QR code with Expo Go for SDK 58 on a physical phone connected to the same network. The start command explicitly targets Expo Go. After an SDK update, stop the old server with Ctrl+C, run `npm ci`, then `npm start -- --clear`, and scan the new QR. On physical iOS, sign in to the same Expo account in the CLI (`npx expo login`) and Expo Go if requested. `npm run web` provides a browser smoke check. iOS simulator launch requires macOS/Xcode; use the QR workflow for an iPhone from Windows.

From `mobile/`: `npm run lint`, `npm run typecheck`, `npm test`, `npx expo install --check`, and `npm run build`. Build exports JavaScript bundles for iOS, Android, and web; it does not produce signed native install files. `npm audit --audit-level=high` is a separate merge-readiness check; SDK 58 resolves the original high-severity blockers while low/moderate findings remain. See [dependency review](docs/dependency-review.md).

The app uses React 19.3.0 and React Native 0.88.1; exact resolved versions are in `mobile/package-lock.json`. [Review guide](docs/pr-review-guide.md) explains your first PR. Dependencies and build output stay out of Git; the preview's generated screenshots are retained as design artifacts.
