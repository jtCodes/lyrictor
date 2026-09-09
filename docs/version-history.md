# Project versioning

## Core rule: publication permanently locks content

**Once a version has been published, its content remains locked forever—even after another version replaces it as the live publication, or the project is unpublished.** Changes require an editable copy with a new version identity.

Published and locked describe different things:

| State | Meaning |
| --- | --- |
| Draft | Unsaved work with no saved version ID. It may be based on a locked version. |
| Editable version | Saved content that can be updated by Save. |
| Locked version | Content frozen by publication. Renaming is allowed; content changes are not. |
| Published version | The version represented by the project's current public snapshot. Only one publication is live at a time. |
| Editing | The version currently loaded for editing. Selecting a history row does not change it. |

A project can have many locked versions, but only one current published version. Replacing or removing the public snapshot never unlocks any of them. A lock is not an undelete guarantee: owners can still delete saved versions explicitly.

## Lifecycle and actions

| Action | Result |
| --- | --- |
| Save a new or pre-versioning project | Creates Version 1. |
| Save a draft based on a locked version | Creates a new editable version with a new ID and number. |
| Save an editable version | Updates that version and assigns a new revision ID; does not add another version. |
| Save while still targeting a locked version | Creates a new editable version instead of changing locked content. This is enforced in persistence, not just the UI. |
| New version | Explicitly creates a separately editable copy of current editor content, or the saved project when it is not active. |
| Duplicate | Explicitly creates a saved editable copy of the selected version. |
| Edit a copy | Opens an unsaved draft of a selected locked version. No version is created until Save. |
| Publish this version | Reads the selected saved version, locks its content, and replaces the project's public snapshot. Unsaved editor changes are not published. |
| Publish another version | Makes that version live and locks it. Previously published versions remain locked. |
| Unpublish | Removes the public snapshot; keeps all saved versions and their locks. |
| Rename | Changes the saved version's name, including when locked; does not change content or publication metadata. |
| Delete version | Removes the selected saved version after confirmation. Current editor content and public snapshot remain intact. |

Example:

1. Save a draft: Version 1 is editable.
2. Publish Version 1: Version 1 is live and locked.
3. Edit: open a draft from Version 1. Save: create editable Version 2.
4. Save further edits: update Version 2, not Version 1.
5. Publish Version 2: Version 2 becomes live and locked. **Version 1 stays locked.**
6. Unpublish: neither version is live. **Both versions stay locked.**
7. Edit a copy of either version and save: create Version 3.

Version numbers are not reused after deletion. Deleting the active editable version clears its saved-version pointer but preserves editor content; the next Save creates a new version. There is no automatic pruning or undelete.

## Which version does Edit open?

Player and project-card Edit actions share [openProjectForEditing](../src/Project/openProjectForEditing.ts) and [resolveProjectForEditing](../src/Project/resolveProjectForEditing.ts).

For a project the user owns:

1. Preserve unsaved work already open for that project. Do not replace it with a stored snapshot.
2. Look for unlocked versions edited at or after the latest publication/lock boundary. Open the most recently edited qualifying version.
3. Otherwise, if a public snapshot exists, open a draft based on its exact content.
4. Otherwise, if locked versions exist, open a draft of the most recently locked version.
5. Otherwise, open the most recently edited editable version, or the saved project as a draft if it has no versions.

The selection function uses the maximum of the current `publishedAt` and all retained `lockedAt` timestamps as the boundary. It orders eligible versions by `updatedAt` (falling back to `createdAt`), then creation time. This differs from the history list, which always displays **newest created to oldest created**.

Opening a draft does not persist a copy. `draftFrom` identifies its source for the editor's “Draft from …” label. Its first Save creates a new version; later saves update that new version.

The shared entry point protects unsaved work in another project and rejects stale asynchronous results if the editor changes during loading. Other creators' projects retain the existing access/clone behavior; their private history is not loaded.

## History interaction

Selecting a history row only previews saved content. The player runs in an isolated frame so inspection cannot replace parent editor state. Opening history pauses parent playback, which stays paused after closing. Private preview data is held in sessionStorage and removed when the preview changes or closes.

Explicit Edit this version loads an editable version. Locked versions instead offer Edit a copy. When current edits are unsaved, a separate confirmation dialog explains the save target and offers Cancel, Discard & switch, or Save changes & switch. The selected version is read again after saving to avoid loading stale content.

Rename edits the title in place. Delete and Unpublish use separate confirmation dialogs with backdrops; they do not append forms to the bottom of the panel. Version actions use the shared dropdown component.

Published links always refer to the stable public page. Private previews do not replace that URL. Publishing the actively edited version converts the editor's remaining work into a draft based on it, preserving any inflight edits for a subsequent Save.

## Data and provenance

[ProjectVersion](../src/Project/versionHistory.ts) stores:

| Field | Purpose |
| --- | --- |
| `id` | Stable identity for one saved version. |
| `name`, `number` | User-facing name and sequential version number. Older records may lack them. |
| `revision` | Identity of the saved content revision; changes on editable-version saves. Older records may lack it. |
| `createdAt`, `updatedAt` | Version creation and latest content-save timestamps. |
| `lockedAt` | Permanent content-lock marker. Never cleared by replacement or unpublish. |
| `project` | Complete saved project content, excluding nested histories and publication identity. |

The saved project has a version pointer and `versionSequence` for allocating new numbers. Editor state separately tracks the active version and optional `draftFrom`. Draft source metadata is temporary; it is not a complete persisted ancestry graph.

The public snapshot contains `publishedAt` and `publishedVersion`: version ID, name, number/revision when available, creation/save timestamps, and local/cloud source. Flat `versionId`, `versionName`, and `versionRevision` fields remain for compatibility. Later private renames, saves, or deletion do not rewrite this captured provenance. Private history is never included in public documents.

Future comments should reference project ID, version ID, revision ID, and optionally a video timestamp. Locks make published content stable for these references. **Comments and publication-event history are not implemented.** Republishing replaces one public document; it does not create a separate release log.

## Persistence and failure behavior

### Cloud

Versions live at `users/{uid}/projects/{project-key}/versions/{uuid}`. Save transactionally writes the editable version and saved-project pointer. Publication transactionally locks the selected version and writes the public snapshot. The transaction rechecks revision identity; a version changed during preparation must be refreshed before publishing.

[Firestore rules](../firestore.rules) allow owners to manage versions but reject content updates to locked records; renaming remains allowed. Unpublishing deletes the public document and does not remove locks.

### Local

Versions live in `versionHistory` on the existing `lyrictorProjects` localStorage record. A single localStorage write commits each save; quota failure preserves the previous record.

Publishing locks the local version before writing the remote public snapshot. These stores cannot commit atomically together. If the remote write fails, the version remains locked, and the error tells the user to retry publication or edit a copy. Concurrent local writes retain localStorage's last-writer behavior.

### Compatibility and limits

- Pre-versioning projects open as drafts and acquire their first version on Save.
- A legacy saved version matching the current publication's ID and revision is treated as locked. Cloud saves preserve that legacy lock before creating a copy; local resolution persists a matching lock. Old publications gain richer provenance when republished.
- Local and cloud histories remain separate. Existing project-name identity is retained; saving under another name starts separate history.
- History reads currently load all versions. Each contains full project content, so storage use grows with explicit copies.
- Ordering uses client-generated timestamps; cross-device clock differences can affect “most recently edited.”
- Image uploads use unique filenames to protect older assets. Local audio and external media remain references; missing or expired media cannot be reconstructed from history alone.
- Version deletion preserves the public snapshot. Whole-project deletion removes the project's history and uploaded images through the existing deletion flow.

## Implementation and verification

- [versionHistory.ts](../src/Project/versionHistory.ts): local persistence, snapshots, draft creation, and edit-selection policy.
- [firestoreProjectService.ts](../src/Project/firestoreProjectService.ts): cloud saves, locking/publication transactions, and publication metadata.
- [useProjectService.ts](../src/Project/useProjectService.ts): editor Save and draft-to-version state updates.
- [VersionHistoryDialog.tsx](../src/Project/VersionHistoryDialog.tsx): preview, copy/edit, publishing, and confirmations.

Deploy the updated Firestore rules before releasing cloud locking. App builds alone do not deploy rules. The implementation work did not deploy the app or rules.

Behavior checks:

```sh
node scripts/tests/version-history.cjs
node scripts/tests/project-selection.cjs
node scripts/tests/project-json.cjs
yarn check-types
yarn build:web
```

The version tests cover first Save, editable updates, locked-version copies, permanent locks after unpublish, publication isolation, selection priority, legacy drafts, and failure handling. Firestore uses an in-memory adapter; these are not deployed-rules or emulator tests.

Rendered verification was unavailable during implementation because Edge access was not approved. Before release, verify the draft/locked labels, player/card Edit selection, embedded playback, keyboard and pointer dismissal, unsaved-edit confirmation, rename focus, and narrow/wide layouts in the running app.
