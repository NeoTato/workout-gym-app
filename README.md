# Workout journal

A personal iOS/Android workout tracker for flexible gym and home sessions, equipment-specific progression, calendars, summaries, and weekly consistency goals.

## Current state

The repository contains an interactive Coral Daylight HTML design preview with fictional data. It is not yet an Expo application, does not persist workouts, and does not implement exports. The approved design is the visual reference for the native app.

Open [design-preview.html](design-preview.html) directly in a browser. Run `node verify-preview.mjs` to verify preview interactions and capture screenshots; this requires Node with built-in WebSocket support and Chrome at the Windows path configured in that script. No dependencies are currently installed.

## Native app blueprint

- [Requirements and behavior](docs/requirements.md)
- [Architecture and decision rationale](docs/architecture.md)
- [Data model and export contracts](docs/data-model.md)
- [Implementation milestones and acceptance checks](docs/implementation-plan.md)
- [Preview design notes](DESIGN-NOTES.md)

These documents specify the next implementation. Native app commands and dependency versions will be recorded when the Expo scaffold exists; they are not available yet.
