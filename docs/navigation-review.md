# Home and navigation review

Home shows the weekly active-day target and streak, a resumable draft when present, then the latest completed workout. Counts come from saved exercises and sets. History contains the month calendar and day details. Progress links to exercise progress and weekly/monthly/annual workout summaries. Settings retains appearance, backup/restore and CSV export.

The center Workout button sits in a curved cutout with clearance around its circle. It resumes an existing draft or opens workout setup. Navigation steps aside during workout entry, saved-workout editing and keyboard input. Existing routes and SQLite data remain compatible; there is no schema or backup-format change.

Saving a completed workout keeps the exercise chooser open and its expanded categories intact. Select another exercise to continue editing. Done editing returns to the completed workout. Validation and failed-save recovery still apply.

## Phone review

From `mobile/`, run `npm ci`, then `npm start`. Restart Metro after installing the new SVG dependency. Test light/dark appearance, the iPhone home indicator and Android gesture/button navigation, all four destinations, starting/resuming a draft, and repeated edits before Done editing. Check that the bottom bar does not obscure the rest timer or lists.

`react-native-svg` 15.16.0 matches Expo SDK 58 and is included in Expo Go. The previously installed standalone Android APK needs a new native build for this dependency. This change does not publish the hosted iPhone preview or build/distribute a replacement APK.

## Validation

Unit coverage includes navigation destinations, selected states, repeated-action protection, draft resume, editor visibility, Home ordering and repeated saved-workout edits. Run the standard type, lint, Jest, SQLite, SDK dependency and all-platform export checks documented in README. Physical-device visual review remains required before merging.
