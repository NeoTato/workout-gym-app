# Reviewing your first pull request

The first PR adds the mobile foundation in `mobile/`. It does not implement workout logging, SQLite, calendars, or summaries yet. Those are later PRs. The HTML prototype remains the full visual reference and its fictional history is not copied into the native app.

Compiled web smoke-test screenshots: [light](../mobile-foundation-light.png) and [dark](../mobile-foundation-dark.png). These verify the compiled React Native web screen, not physical-device rendering.

## Review in this order

1. **Conversation:** read the problem/result, validation, known blockers, and phone testing instructions. A Draft label means it is not ready to merge.
2. **Files changed:** start with `mobile/src/features/home/HomeScreen.tsx` for the screen, `mobile/src/ui/theme.ts` for light/dark colors, and `.github/workflows/mobile.yml` for automated checks. The lockfile is generated dependency data; do not try to understand every line of it. Ask questions on source lines or leave a general comment.
3. **Checks:** “Lint, types, tests, bundles” verifies source quality and builds JavaScript bundles for iOS/Android/web. “Dependency audit” checks known vulnerable packages. Open a failing job to read its failing step. Do not interpret a successful bundle as an installed phone test.
4. **Try it:** from the repository root, run `cd mobile`, `npm ci`, then `npm start -- --clear`. With Expo Go for SDK 58 installed and the phone/computer on the same Wi-Fi, scan the QR code with the iPhone Camera or Android Expo Go app. The app was upgraded from SDK 57 after the user's iPhone confirmed Expo Go requires SDK 58; device evidence supersedes generic transition guidance. Stop the previous server before reinstalling and scan the new QR, not an old screenshot. On physical iOS, sign in to the same Expo account in the CLI (`npx expo login`) and Expo Go if required. If Expo Go reports another SDK mismatch, record the message before changing dependencies. `npm run ios` launches a simulator only on a suitably configured Mac; it is not the Windows/iPhone workflow.
5. Expect a Coral Daylight “Today” screen with “No workouts yet.” Switch your phone between light/dark themes and increase its text size. There should be no fake workout records. Recording controls are not included in this foundation PR.
6. Leave questions or requested changes. Each pushed fix updates the same PR and reruns checks; a new PR is not needed for every correction.

## Merging

Wait for blockers to be resolved and checks to pass, then review the result. Do not click **Ready for review** or merge a draft with known unresolved issues. A standalone native build and physical iOS/Android validation remain distinct from JavaScript bundle checks.

This PR is authored using your GitHub account. GitHub does not let authors approve their own PR, so use **Comment** when reviewing; you can still inspect, discuss, and merge it yourself when ready. Do not require another person's approval on a solo repository unless you have a second reviewer. Automated checks appear on the PR, but are only enforced as merge requirements after you configure branch protection/rulesets; this PR does not change repository settings.

When ready, choose **Squash and merge** to put one clear commit on main. Delete the feature branch after merging if no longer needed. Tell the assistant when you merge so the next feature starts from updated main. The assistant will not merge or enable auto-merge without your instruction.
