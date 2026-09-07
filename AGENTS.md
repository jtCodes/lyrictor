# Project instructions

## Primary product goal

**Reduce friction to creativity.** Help users turn an idea or feeling into something they can see, try, and refine with as little technical effort as possible. Preserve expressive freedom, including outcomes the product's creators did not anticipate.

Judge feature, architecture, performance, and UI decisions by that goal. Clear hierarchy and consistent controls serve creative flow. Favor understandable actions, immediate trustworthy feedback, reversible experimentation, and access to precision when needed. Simplifying the interface must not unnecessarily restrict what users can create. Specific features and implementations are means to this goal and may change.

## UI and interaction work

Read [docs/ui-ux-principles.md](docs/ui-ux-principles.md) before designing, changing, or reviewing any user-facing interface. Apply it to the whole affected interaction, including shared components and relevant states.

- Establish the user's task, control ownership, and action scope before arranging components.
- Make relationships visible through grouping and hierarchy. Do not rely on explanatory text to repair misleading structure.
- Treat basic usability as part of implementation responsibility; do not wait for the user to identify each grouping, consistency, spacing, or interaction defect.
- Reuse appropriate shared components, but review their composition. Existing UI is not automatically a good reference.
- Follow the guide's review process before reporting completion. Code checks do not establish visual usability; state explicitly when rendered verification was unavailable.
- Interpret feedback as evidence of an underlying design problem. Fix that problem within the requested scope instead of mechanically reproducing the user's proposed arrangement.

These instructions do not introduce an approval step or require a new design document for every small change. Use judgment and continue work within the user's authorized scope. Current user instructions take precedence.

## Render effects and preparation

When adding or changing blur or expensive render effects, follow
[docs/render-preparation.md](docs/render-preparation.md). Reuse the shared renderer,
preparation lifecycle, cache budget, and playback gate. Keep only pixel drawing,
asset readiness, cache validity, and timeline candidate rules in the feature adapter;
do not create another per-element worker/cache/playback orchestration path.
