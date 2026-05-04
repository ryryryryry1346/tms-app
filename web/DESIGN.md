# TMS Design Direction

This document defines the visual and interaction direction for the TMS web app.
It is inspired by clean, restrained SaaS systems, but the product should feel
like a focused test management workspace rather than a marketing site.

## Product Feel

- Quiet, operational, and fast to scan.
- Dense enough for repeated QA work without feeling cramped.
- Clear hierarchy through spacing, borders, typography, and state color.
- Minimal decoration. The interface should prioritize suites, cases, runs,
  execution status, and user actions.
- First screens should be useful product surfaces, not landing pages.

## Layout

- Prefer full-width work areas with constrained inner content.
- Use cards only for repeated items, modals, drawers, and genuinely framed
  tools. Do not nest cards inside cards.
- Tables and rows are the default for repository, run execution, and audit-heavy
  workflows.
- Keep toolbars compact and aligned with the data they control.
- Header areas should be calm: title, short supporting text, tabs, and primary
  actions.
- Avoid large decorative hero sections in app pages.

## Surfaces

- Primary surfaces use white or near-white backgrounds.
- Page background stays soft and neutral so tables and work panels remain clear.
- Use subtle borders as the primary separator.
- Shadows should be restrained and mostly act like soft elevation around large
  panels or overlays.
- Keep border radius modest: usually 8px to 12px for controls, up to 24px for
  larger shells when the surrounding UI already uses that shape.

## Typography

- Text should be practical and readable.
- Avoid negative letter spacing.
- Do not scale type with viewport width.
- Use compact headings inside panels and tables. Reserve large type for page
  titles.
- Labels, column headers, and metadata should be concise.

## Color

- Use neutral surfaces with a limited set of semantic accents.
- Blue is the primary action and navigation color.
- Green means ready, passed, success, or restored.
- Red means destructive, failed, or blocked danger.
- Amber means warning, archived, or pending confirmation.
- Gray/slate means draft, muted metadata, disabled, or inactive.
- Avoid one-note palettes dominated by a single hue family.

## Controls

- Buttons should be explicit and compact.
- Use icon buttons for common compact actions when the meaning is familiar.
- Use text buttons for domain actions where clarity matters, such as `Archive`,
  `Duplicate`, `Create run`, or `Delete permanently`.
- Menus should open from action buttons and close on outside click, `Escape`, or
  after action selection.
- Selects and popovers should be preferred over long horizontal button groups
  when actions become too many.
- Destructive actions require a confirmation flow.

## Repository

- Suites contain compact case rows or tables.
- Case row columns should support scanning: ID, title, priority, type, dates,
  status, actions.
- Inline metadata editing is appropriate for title, status, priority, type, and
  suite movement.
- Bulk actions apply to selected test cases only. Suite management belongs in
  the suite actions menu.
- Preview drawers are preferred for quick reading/editing without leaving the
  repository.

## Runs

- Runs should emphasize execution progress and status distribution.
- Run lists use compact tables with stable columns.
- Run execution pages should prioritize quick status changes, filters, progress,
  and bulk execution actions.
- Progress bars must not overlap status counts or labels.

## Editors

- TipTap is the preferred rich text editor for test case steps, expected
  results, and future rich text areas where it makes sense.
- Images, GIFs, and videos can render inline.
- Documents such as PDF, Excel, CSV, and Word should render as attachment cards
  with clear filename, type, and open/download affordance.
- Editor toolbars should remain compact and focused on frequent QA authoring
  actions.

## Loading And Empty States

- Route transitions should show a skeleton instead of a blank shell.
- Skeletons should resemble the final layout enough to prevent layout surprise.
- Empty states should explain the missing data briefly and offer the next useful
  action.
- Error states should be visible, recoverable, and specific.

## Accessibility

- Interactive controls need clear focus states.
- Icon-only buttons need accessible labels.
- Menus should expose menu semantics where practical.
- Color cannot be the only status indicator; labels should remain visible.

## What To Avoid

- Marketing-style split hero layouts inside the app.
- Decorative gradient blobs or background ornaments.
- Large cards wrapping other cards.
- Overly rounded text pills for every control.
- Long explanatory text inside product screens.
- Copying another product's brand identity directly.
