# PR 14: Hosted Expo Go preview

Publish the current workout app to the user's `neotato` Expo account so Expo Go can download its code without a running computer. No account system, database server, workout upload or cloud sync is added.

- Link the existing slug to an EAS project owned by neotato and keep that project identity stable.
- Use SDK 58-compatible update tooling, validate resolved configuration, and publish an iOS preview with an explicit preview environment/branch. Android testing remains deferred.
- Keep SQLite filename/schema and backup/restore unchanged. Explain Expo Go project storage isolation: export JSON from the development preview before switching, inspect existing history in the hosted preview, and restore only if necessary.
- Run required checks, document the hosted link and repeatable publication commands, and open a draft PR. Phone verification must confirm launching with the computer stopped and continuity of saved data.

Only code/assets are published. A hosted preview does not promise cloud backup, compatibility with future Expo Go SDKs, or reliable offline cold launch. Do not erase or automatically replace a local database during the switch.
