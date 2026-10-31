# Foundation dependency review

SDK 57 is selected for the Expo Go transition documented on October 31, 2026. The starter advertised SDK 57 but initially emitted SDK 58 dependencies; the manifest was aligned to the explicitly versioned `expo-template-blank-typescript@57.0.33`. React and React DOM are both 19.2.3. Animation peers use Expo's bundled versions. The React Native Testing Library renderer is pinned to 1.2.0 because newer renderer releases require a different React reconciler.

The initial dependency audit has unresolved high-severity advisories. The PR must stay a draft until these are resolved through compatible, tested dependencies or a separately reviewed SDK/testing-device plan. CI retains an independent `npm audit --audit-level=high` job; a failing audit is not waived by passing UI tests or bundle checks.

- `decode-uri-component` through `query-string@7.1.3` / Expo Router: malformed percent-encoded input can cause excessive decoding work. The fixed decoder 0.5.1 is ESM, while the older query-string API consumes a CommonJS decoder. Do not blindly override the decoder across that module boundary. [Upstream advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f).
- Zod 3 through Expo CLI: npm reports an oversized-collection validation advisory, with the advertised fix on the Zod 4 line. A cross-major override of CLI internals is not accepted without compatibility evidence. [Upstream advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- Additional low/moderate findings affect build/test/lint dependencies including glob, minimatch, and deepmerge. Full results remain visible through `npm audit`. These are not claimed to be fixed or proven harmless.

No backend, imported workout files, user query parsing, or personal workout database is added in this PR, but that limited current exposure is not a reason to suppress the findings. `npm audit fix` was attempted without force; it did not resolve the SDK-constrained findings. Do not use forced framework upgrades, downgrade tooling to obsolete versions proposed by npm, skip audit jobs, or add untested global transitive overrides just to get green checks.

Next remediation choices are a compatible upstream backport or a deliberate SDK upgrade with an Expo development build/device compatibility check. Refresh the audit and this document when applying a fix; counts and affected dependency paths can change as advisories are updated.
