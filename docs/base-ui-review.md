# Base UI adoption — September 6, 2026

Use `@base-ui/react@1.7.0`, pinned exactly, for the shared editor inspector controls.
The camera is the first consumer. Other settings panels retain their existing UI.

## Supply-chain review

- Official Base UI installation documentation names `@base-ui/react`; npm metadata identifies `mui/base-ui`, the same repository linked by the documentation.
- 1.7.0 was published August 4, 2026. The newer 1.8.0 was published September 4 and was deliberately not selected: the project's existing Yarn `npmMinimalAgeGate: 7d` remains enabled.
- Downloaded the 1.7.0 tarball from npm and verified SHA-512 against registry integrity metadata. Verified an npm registry signature using npm's published signing key.
- Inspected the npm provenance statement: matching tarball digest, `https://github.com/mui/base-ui`, `.github/workflows/publish.yml`, commit `254f4744f0a241c20697b9eeab33402f4469a081`. This was statement inspection, not independent verification of the complete Sigstore certificate/transparency-log chain.
- Installed with `YARN_ENABLE_SCRIPTS=false` and `--mode=skip-build`. No install hooks were present in the inspected production dependency closure.
- Reviewed the lockfile: eight additions, no unrelated version upgrades. Added packages are Base UI React/utils, Babel runtime, Floating UI core/dom/react-dom/utils, and Reselect. The React external-store dependency was already present.
- npm's bulk advisory endpoint returned `{}` for the exact Base UI dependency closure on the review date. This means no known advisories were returned; it is not a guarantee against malicious or undiscovered code.

## Inspector contract

`src/Editor/Settings/Inspector.tsx` owns compact number/slider rows, collapsible sections, selects, and switches. Numbers, sliders, sections and switches use Base UI; the select uses a native HTML select, avoiding popup/portal dependencies where unnecessary.

`onChange` previews a numeric value. `onCommit` closes the undo transaction (typing commits on blur or Enter; scrub/slider drags commit on release). Reset uses the same transaction path. Consumers own units, constraints, reset values and project state. Do not connect each continuous change to a new undo entry.

`CameraValuesEditor` keeps Lens → Movement → Focus order identical for initial, destination and custom starting states. Editing selection and section disclosure are independent of playback status. Runtime camera data and transitions are unchanged.
