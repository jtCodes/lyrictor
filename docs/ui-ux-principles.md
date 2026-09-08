# UI/UX principles and review standard

Research reviewed: September 7, 2026.

This standard applies to every interface: editors, forms, menus, dialogs, timelines, navigation, and empty or loading states. It is a general design foundation, not a catalog of fixes for particular components.

## Primary goal: reduce friction to creativity

Help people turn an idea or feeling into something they can see, try, and refine with as little technical effort as possible. Preserve enough expressive freedom for users to create outcomes we did not anticipate.

This is the user's product direction and the purpose of every principle below. A tidy interface is valuable when it helps people create and stay in flow.

- **Shorten the path from intent to result.** Reduce unnecessary searching, setup, clicks, and translation into technical concepts.
- **Make experimentation easy.** Provide useful starting points, trustworthy preview, and straightforward undo, reset, and refinement.
- **Protect creative flow.** Avoid interruptions, lost context, unpredictable interactions, and delays that make users manage the tool instead of their work.
- **Keep expressive power accessible.** Reveal depth when useful; retain precise control without requiring expertise to begin. Automation should remain understandable and editable.
- **Preserve confidence in the result.** Performance improvements should keep feedback responsive and preview quality reliable enough to make creative decisions.
- **Question the implementation.** Features, libraries, and data models are means to the goal. Reconsider them when they impose unnecessary barriers.

**Decision test:** does this change help someone express, explore, or refine an idea with less effort while preserving meaningful creative choices?

The sources below establish general principles. The implementation rules and review prompts are this project's application of those principles; they are not claims that research prescribes a particular pixel value, library, or layout. This document does not certify that existing screens already meet the standard.

## 1. Make relationships visible

People infer relationships from proximity and shared boundaries. A container can communicate a stronger grouping than spacing alone; unnecessary containers also introduce visual noise. [NN/g: Common region](https://www.nngroup.com/articles/common-region/)

**Required:** elements that belong together must look like they belong together. Elements with different owners must have a perceptible separation.

- Keep labels, values, units, and local actions close to the thing they describe or affect.
- Use smaller gaps within a group and larger gaps between groups.
- Use alignment and spacing first; add indentation, a guide, or a subtle boundary when ownership remains ambiguous.
- Visually contain children under their parent. Do not style a child as an unrelated neighboring section.
- A border or background must communicate an actual relationship. Avoid wrapping every row in its own card.

**Review:** without reading helper text, can someone identify which controls belong to which object?

## 2. Express hierarchy and importance deliberately

Size, contrast, and grouping guide the order in which people attend to information. Giving everything equal emphasis makes prioritization difficult. [NN/g: Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)

**Required:** visual rank must match conceptual rank and task importance.

- Distinguish the current context, primary sections, subsections, controls, and supporting details.
- Give siblings consistent treatment. Give children subordinate treatment through placement as well as typography.
- Keep a heading closer to its content than to the preceding group.
- Combine redundant context labels when they describe one selection. Keep genuinely different contexts distinguishable.
- Reserve strong emphasis for information and actions that deserve it. Repeated bold headings, all-caps labels, and bright buttons reduce the usefulness of emphasis.

**Review:** squint at the screen. Do the visible groups and emphasis still reflect the intended structure?

## 3. Make scope, state, and consequences understandable

The interface should expose current state, use familiar language, and support recovery from mistakes. These are usability principles, not optional explanatory copy. [NN/g: Usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)

**Project application:** before laying out controls, identify what each one changes: a whole document, one object, a selection, a sub-object, or a temporary state.

- Make the active editing target evident where editing occurs.
- Separate broader-scope controls from local controls. Placement must not imply a narrower effect than the control actually has.
- Distinguish observed status from editing selection when they can differ.
- Make actionable elements look actionable, and distinguish them from passive information.
- Make creation distinguishable from editing an existing object.
- Associate actions with their targets. A delete action must make clear what will disappear.
- Give immediate feedback and a practical recovery path. Preserve precise entry and reversible experimentation where appropriate.

**Review:** before clicking, can the user predict what will change, where, and whether it can be undone?

## 4. Give similar things consistent appearance and behavior

Shared visual characteristics make elements seem related. Reusing a visual treatment for incompatible meanings creates misleading associations. [NN/g: Similarity](https://www.nngroup.com/articles/gestalt-similarity/)

**Required:** comparable controls use comparable labels, alignment, dimensions, units, states, and interaction behavior.

- Reuse established components and layout patterns when their meaning matches the task.
- Keep hover, focus, selected, disabled, loading, and error states distinct and consistent.
- Use `LyrictorLoadingIndicator` for indeterminate loading across the app. Use its compact variant inside controls and the full staff in loading regions. Keep determinate progress bars for measurable work.
- Use the same term for the same concept. Do not change vocabulary simply because a different component renders it.
- Preserve a predictable scan line for labels and values. Choose alignment by content role; ordinary form labels should not drift between left and center alignment.
- A necessary exception should communicate a real difference, not an implementation accident.

**Review:** would someone familiar with another part of the product correctly predict this control's behavior?

## 5. Reduce effort without hiding essential context

Progressive disclosure can defer specialized controls while preserving access to them. It works only when common tasks remain easy and the path to more detail is discoverable. [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

**Required:** optimize for finding and using settings, not merely fitting the most controls on screen.

- Keep frequent actions readily available. Group secondary details behind clearly named disclosures when useful.
- Do not require several nested expansions for a routine task.
- Make the contents and scope of a disclosure predictable from its heading and visible grouping.
- Retain meaningful values or state summaries when hiding details would otherwise conceal important configuration.
- Remove duplicate headers, repeated explanations, and decorative padding before shrinking text or interaction targets.
- Compact controls still need readable labels, clear separation, and usable keyboard and pointer interaction.

**Review:** count the scanning, clicks, and context changes needed for a common task. Does each step earn its place?

## 6. Keep the workspace stable during use

Unexpected movement can make users lose their place or activate the wrong control. Expected changes following a deliberate action differ from unrelated layout shifts. [web.dev: Layout stability and CLS](https://web.dev/articles/cls)

**Project application:** dynamic content must not make adjacent controls move unpredictably.

- Allow for changing counters, labels, validation, loading content, and scrollbars in the layout.
- Reserve suitable space for frequent status changes; do not alternate between structurally different toolbars as values update.
- Keep persistent navigation and actions anchored where users expect them. Scrollable content must remain reachable beyond any sticky region.
- Preserve useful scroll position, focus, selection, and disclosure state across routine updates.
- Let explicit navigation change context; background updates should not unexpectedly take over the user's editing target.
- Support deliberate resizing and expansion. Stability does not mean freezing every dimension or clipping content to a fixed height.

**Review:** watch transitions, not just screenshots. Do targets move under the pointer or does background activity interrupt editing? A good CLS score alone does not answer these questions.

## 7. Make interaction structure accessible

Meaningful headings and labeled regions convey relationships beyond visual styling. [W3C WAI: Page structure](https://www.w3.org/WAI/tutorials/page-structure/)

**Required:** semantic structure and keyboard behavior must agree with the visible interface.

- Associate labels with controls. Give icon-only actions descriptive accessible names.
- Use semantic groups and heading levels that reflect the actual hierarchy.
- Expose selected, expanded, and disabled states programmatically.
- Keep keyboard focus visible, navigation logical, and controls operable without a pointer. Do not remove keyboard focus indicators to solve a pointer styling annoyance.
- Do not communicate a meaningful state through color alone.

For collapsible sections, the heading control must identify and expose the state of its associated panel. Adjacent help or action buttons must remain separate interactive controls, not buttons nested inside the disclosure button. [W3C APG: Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

**Review:** can the same ownership, order, and operation be understood through keyboard navigation and accessible names?

## 8. Use help to add detail, not repair structure

Custom content shown on hover or focus needs predictable access and dismissal; it should remain available while being read. [W3C: Content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)

**Project application:** tooltips are suitable for secondary explanations. The layout and visible labels must still establish ownership and essential meaning.

- Put help beside the concept it explains.
- Keep essential consequences, errors, and required input information visible where needed.
- Support keyboard access, hover persistence, and dismissal. Provide an appropriate route for touch users when the information matters.
- Use a suitable popover or another explicit control for interactive content.
- If explanatory text is repeatedly needed to clarify what belongs where, revisit the grouping first.

**Review:** if tooltips were unavailable, would the user still understand the main task and the scope of its controls?

## Design and review process

This is part of the work, not a new user approval step. Scale the effort to the change.

### Before implementation

1. State the creative outcome the user wants and the friction this change should remove.
2. Map the owners, children, states, and actions involved. A short outline is enough.
3. Choose grouping and hierarchy that reveal those relationships.
4. Check relevant existing components. Reuse their strengths; do not repeat a misleading pattern merely for consistency.

### Before handoff

Inspect the rendered interface when tools and the running app permit it. Exercise relevant states rather than checking only the initial view.

| Check | What must be evident |
| --- | --- |
| Creative flow | The path from intent to trying and refining a result is easier, with meaningful creative choices preserved. |
| Ownership | Related controls form a visible group; local and broader scope are distinguishable. |
| Hierarchy | Parent, child, and sibling relationships survive a quick scan. |
| Disclosure | Expanding or collapsing affects the group the user would expect. |
| Consistency | Comparable controls look and behave alike across affected views. |
| Actions | Selection, status, creation, editing, and removal have clear roles and targets. |
| Density | Useful work is easy to reach without illegible text, cramped targets, or redundant containers. |
| Dynamic behavior | Selection changes, loading, errors, and changing values do not cause surprise movement or lost work. |
| Resizing and overflow | Narrow and wide layouts, long labels, scrolling, and sticky areas remain usable. |
| Input and recovery | Keyboard access, focus, precise entry, cancellation, and undo behave appropriately. |

Use meaningful code checks for changed behavior. Passing a build or server-render test does not verify spacing, hierarchy, clipping, or ease of use. Report what was actually checked; if rendered verification was unavailable, say so and do not claim visual validation.

### When feedback reveals a problem

Identify the violated principle before adjusting the screen. Review other states of the affected composition for the same problem. Prefer fixing the responsible shared pattern when appropriate, while keeping the work within scope. The user should not have to rediscover a generic defect in every panel.

Apply judgment: these principles describe outcomes, not a mandate to add a border, indent every level, shrink every header, or introduce an accordion everywhere. A sound implementation should make the user's next action easier to understand.
