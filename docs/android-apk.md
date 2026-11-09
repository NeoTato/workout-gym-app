# Android APK preview

The `preview` EAS profile produces a signed, standalone Android APK for direct installation. It bundles the JavaScript, fonts and alarm sounds; Expo Go and a development server are not needed. This is an internal test build, not a Google Play release.

Package identity: `com.neotato.workoutjournal`. Preserve this ID and the Expo-managed signing keystore for future updates. The initial Android versionCode is 1; increase it for subsequent distributed builds. Do not commit signing keys or credentials.

From `mobile`, run `npm ci`, then `npm run build:apk`. EAS uses the existing `@neotato/workout-gym-app` project and remote Android signing credentials. No Apple account or Google Play submission is involved. The isolated `android-preview` update channel avoids loading iPhone Expo Go preview updates.

## Install and transfer data

Open the EAS build installation page on an Android phone, download the APK and allow installation from that browser when Android asks. Install and open Workout Journal. Future APKs signed with the same key and package can update it without uninstalling; uninstalling removes local app data.

The standalone app has its own local database. It does not automatically share Expo Go or iPhone data, and signing into Expo does not sync workouts. Export a fresh JSON backup from the source app and restore it using Settings in the Android app if you want that journal. Restore replaces destination data; export any destination records first. No workout database or JSON backup is part of the build upload.

## Phone review

- Launch without Metro or Expo Go, enable airplane mode, log and reopen a workout, and restart the app to confirm persistence.
- Check load/reps inputs, keyboard dismissal on Rest, set completion, categories, editing and backdated dates.
- Test the foreground alarm, all sound previews, Stop, snooze, media volume, headphones and background cleanup.
- Grant/deny notification permission and check local reminders with the app backgrounded/phone locked. This is not a system alarm; Android power and notification settings affect delivery.
- Check JSON backup/restore and CSV sharing, routine references, history/calendar/progress, appearance and narrow/large-text layouts.

Until these checks are done on a physical Android phone, the APK is a review build rather than a verified Android release.
