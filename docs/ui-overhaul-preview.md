# UI overhaul: HTML review before native implementation

Open `ui-overhaul-preview.html` directly in a browser. It loads local fonts and needs no installation or dev server. No native app files or workout data are changed.

## Proposed direction

- Coral filled primary action, one per screen: Continue, Finish, Back to Home.
- Green outlined/soft actions for Add set/exercise; green text/checks for completion and save status.
- Red text for Remove/Delete/Discard. Destructive confirmation is separate from initiating the action.
- Neutral text/outlined secondary actions: Back, Edit, Cancel.
- Compact set rows, exercise setup behind a menu, collapsible optional exercises, and a footer for the main action. These are proposals for review, not implemented native features.

Keep readable text and explicit labels/icons alongside color. Check light and dark modes rather than treating the palette as fixed hex values everywhere.

## Review interactions

1. Toggle Current colors / Proposed. The comparison changes color hierarchy on the same proposed layout; Current colors is not a screenshot or exact reproduction of the current app.
2. Toggle appearance. On a narrow window, select Setup, Log workout, or Saved; desktop shows all three.
3. Choose a location/session type; open the date details; Continue and Edit details move between preview screens.
4. Enter a valid missing rep value: completion becomes green. Clear a required value: completion disables. Add set copies values without completion.
5. Remove a completed set: Keep it / Remove confirm the distinction. Delete/Discard similarly demonstrate confirmation. Exercise menus expose secondary settings.
6. Finish builds the saved sample from checked sets. All interactions are temporary and fictional; reload resets the preview. Some secondary actions deliberately show an explanatory notice rather than implementing the whole app.

## Verification

`node verify-ui-overhaul.mjs` uses the existing dependency-free Chrome DevTools test approach. Checks cover light/dark, distinct semantic action colors, the comparison toggle, completion validity, copied-set behavior, confirmation and cancellation, Finish, Escape closing dialogs, gym selection, and no horizontal overflow at 320px/390px. Screenshots: `ui-overhaul-desktop.png`, `ui-overhaul-dark.png`, `ui-overhaul-mobile.png`.

Native implementation is pending user review. Preserve the merged app's SQLite/draft behavior, explicit saved-workout Save/Cancel, and timezone-aware validation when transferring an approved design.
