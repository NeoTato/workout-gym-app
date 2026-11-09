# Hosted Expo Go preview

For the newer live rest timer, use the [PR 15 preview and migration notes](rest-timer-review.md#hosted-phone-preview). After that preview upgrades the local database, this older pinned preview cannot open it. Export JSON before switching and continue with the newer preview.

Project: [@neotato/workout-gym-app](https://expo.dev/accounts/neotato/projects/workout-gym-app).
Stable project ID: `f9e71877-6a1a-410c-91c1-74593c6b70d7`.
Update branch: `expo-go`; environment: `preview`; initial publication: iOS only. Android testing remains deferred.

Initial hosted update, published November 9, 2026:

- [Update page](https://expo.dev/accounts/neotato/projects/workout-gym-app/updates/9147f905-a720-488b-9832-95234e281b7e)
- [Official Expo Go QR code](https://qr.expo.dev/eas-update?projectId=f9e71877-6a1a-410c-91c1-74593c6b70d7&groupId=9147f905-a720-488b-9832-95234e281b7e)
- iOS update ID: `01a1be40-26c5-7772-90fb-d1980066348b`; source commit: `e32b17ae9b11d385e64a614c7824cd434f36a378`.

The hosted manifest was fetched successfully and checked for SDK 58.0.0, owner `neotato`, slug `workout-gym-app` and scope key `@neotato/workout-gym-app`. This checks publication metadata; actual launch and database continuity still require the phone checks below.

The hosted preview downloads app code/assets from Expo instead of the computer's Metro server. It still runs inside Expo Go; it is not a signed standalone app or a cloud database. The physical iPhone must use compatible SDK 58 Expo Go and sign in as `neotato`, the account that owns this project. Expo restricts hosted Expo Go updates to the owner or members of the owning organization. See [Expo's project loading rules](https://expo.dev/changelog/expo-go-loading-changes-may-2026) and [SDK 58 update documentation](https://docs.expo.dev/versions/v58.0.0/sdk/updates/).

## Keep existing workouts when switching

1. In the development preview that currently contains your workouts, open Settings → Backup and restore → Export JSON backup. Explicitly save it in Files, outside Expo Go's app cache. JSON includes completed history, routines, goals, appearance and the unfinished draft; CSV is not restorable.
2. Open the hosted update through the Expo project/update page in Expo Go while connected to the internet. The computer does not need `npm start` for this hosted link. Check history before logging new workouts.
3. If your history is already present, keep using it; do not restore unnecessarily. If the hosted preview is empty, open Settings → Backup and restore, select the saved JSON, inspect its counts and confirm replacement. Restore replaces the current preview's dataset rather than merging.
4. Check a completed workout, routine, goals and any draft. Create one test entry, close/reopen the hosted preview and verify it persists. Stop the computer's development server and try the hosted link again over phone data/Wi-Fi.
5. Keep the exported JSON. Do not uninstall Expo Go, clear app data or delete the old preview while it is your only copy of the journal.

Workouts remain in `workout-journal.db` on the phone. Expo Go separates each project's filesystem, so switching from a development experience to a hosted project may expose a different local database even if the displayed app name is the same. Automatic access to the old scope is not promised; backup/restore is the supported transfer path. The SQLite filename, schema and restore logic are unchanged in this PR. See [Expo project storage isolation](https://docs.expo.dev/develop/user-interface/store-data/) and [SQLite persistence](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).

Later updates to this same hosted project normally reuse its local data. Signing in on another phone does not synchronize workouts. Expo hosts code/assets; workout backup files are not published with the update. A project rename, transfer, different app installation or Expo Go data deletion can affect storage continuity; preserve the owner/slug/project ID and maintain JSON backups.

## Publish a later code update

From `mobile/`, after tests/review and a concrete authorization to publish:

```powershell
npm ci
npx expo whoami
npm run publish:expo-go:ios -- --message "Describe the reviewed change" --non-interactive
```

The script pins EAS CLI 27.5.0 and explicitly selects the `expo-go` branch, `preview` environment and iOS. The project uses SDK-matched `expo-updates` installed through `expo install`; `eas update:configure` generated the update URL and appVersion runtime policy. The current CLI supports Expo Go on SDK 49+ with this managed policy. Future native/SDK changes require checking Expo Go compatibility again; do not assume a previous preview runs in any newer Expo Go version. See [CLI publishing flags](https://docs.expo.dev/eas/cli/#eas-update) and [Expo Update setup](https://docs.expo.dev/eas-update/getting-started/).

Publication is manual, not an automatic effect of merging a PR or running `npm start`. No signing certificate, paid Apple membership, native project generation or EAS Build is configured here. Network access may be needed to fetch a hosted update on launch; reliable offline cold launch remains a phone check, not a promise based on an already-open session. Once loaded, the app's workout logging remains local/offline as tested in PR 13.

## Validation and phone review

Required checks are the existing unit/component tests, actual SQLite tests, types, lint, SDK dependency alignment, audit gate and platform JavaScript exports. Configuration inspection confirms SDK 58, owner/slug/project ID and matching update URL. No database migration is introduced.

Local checks on November 9, 2026: 142 domain/component/adapter tests and 36 actual SQLite tests pass, along with types, lint, SDK alignment and iOS/Android/web JavaScript exports. Audit remains 1 low/30 moderate with zero high/critical findings. The new app dependency is `expo-updates ~58.0.21`, resolved through Expo's SDK-aware installer with its lockfile committed. No storage or backup implementation changed.

Pending physical iPhone checks: open the published update in Expo Go with Metro stopped; confirm the installed SDK matches; compare history or restore JSON; save/reopen a test workout; and check the behavior without a network after the update has loaded. Only those checks can confirm storage continuity and launch behavior on the user's phone. Android publication/testing is deferred.
