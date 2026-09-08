# Editable project versions

The first Save creates Version 1. Subsequent Saves update the version currently being edited; they do not add history entries. New version creates a separately editable copy of the current editor content. Duplicate copies the selected saved version. Names can be changed without changing project identity. Versions are listed by creation time, newest first, regardless of which was most recently edited.

The editor header identifies the editing version and saved/unsaved state. The custom Versions dialog keeps selection separate from editing: selecting a row previews saved content in an isolated player frame without replacing the editor. Editing and Published badges have separate meanings and can appear on the same row. Edit this version explicitly loads that version, with Save, Discard, or Cancel when current edits are unsaved. The chosen version is read again after saving to avoid loading stale contents.

Publish this version reads the selected version from storage and copies it to the public document. Each save has a revision identity, so the panel distinguishes the published contents from subsequent edits to the same version. Saving, duplicating, renaming, and deleting never implicitly update the live page. Published links keep the stable public URL; private version previews are session-only player routes.

Deletion requires confirmation. It removes the chosen saved version, preserving current editor content and the published snapshot. If the editing version is deleted, the editor becomes an unversioned draft; its next Save creates a new version instead of overwriting another. Version numbers are not reused. There is no undelete or automatic pruning.

## Persistence

- Cloud: owner-only editable documents at `users/{uid}/projects/{project-key}/versions/{uuid}`. Save atomically writes the version and saved-project pointer in a Firestore transaction.
- Local: `versionHistory` on the existing `lyrictorProjects` record. Version and saved-project writes use one localStorage commit; quota failures preserve previous data.
- Each version contains complete project content, without nested histories or public identity. Public documents exclude private history.
- Uploaded images have unique filenames to prevent later uploads from replacing older assets. Audio and external media remain references; unavailable local or external media cannot be recovered from version content alone.
- The preview iframe has its own application stores and receives only its selected project through sessionStorage. Closing or changing the preview removes that session entry.
- Existing project-name identity is retained. Saving under another project name starts separate history. Local and cloud version collections remain separate. History reads currently load all versions; storage use grows with explicitly created copies. Concurrent local writes retain localStorage's last-writer behavior.

## Release and verification

Deploy `firestore.rules` before releasing this app: cloud saves now require owner-only read/write access to the private versions subcollection. Neither app nor rules were deployed in this task.

Behavior checks: `node scripts/tests/version-history.cjs`, `node scripts/tests/project-selection.cjs`, and `node scripts/tests/project-json.cjs`. The version checks cover first-save creation, active-version updates, manual copies, revision identities, ordering, renaming, deletion, local quota failure, cloud transaction failure, unique image paths, and publication isolation. Firestore uses an in-memory adapter; this is not a deployed-rules or emulator test.

Rendered verification was unavailable because computer access to Edge was not approved. Before release, exercise the panel at narrow and wide sizes, keyboard focus/dismissal, playback in the embedded web and Electron players, long names, loading/errors, and unsaved-edit confirmation.

Published snapshots include `publishedVersion` provenance: saved version ID, name, number (when available), revision (when available), creation/update timestamps, and local/cloud source. `publishedAt` records publication time. These values are captured at publication and remain unchanged by later private renames, saves, or deletion. Existing flat version fields remain for compatibility. Older published documents acquire the additional metadata when republished.
