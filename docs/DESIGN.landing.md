---
version: 1.2
name: Flowboard-workspace-landing
mode: persuade
platform: web
description: |
  Flowboard's English marketing surface extends the authenticated workspace
  grammar with a "routing glass" treatment: optical glass layers, transparent
  routing sheets, and an atmospheric indigo flow field, all built on the same
  white canvas, indigo actions, slate surfaces, rounded cards, soft shadows,
  and explicit workflow states as the product.
---

# Flowboard landing design system

## Overview

The landing is a persuasion surface for the owner or operations leader of a
customer-onboarding team. It answers three questions in the first viewport:

1. What is Flowboard?
2. Why does it matter to a team?
3. What can I do next?

The visual language is intentionally continuous with the dashboard and login
surfaces. A visitor should recognize the same product before and after signing
in: Inter, white workspace surfaces, indigo actions, pill controls,
rounded cards, slate metadata, and a clear status vocabulary.

Light is the default landing mode. The navbar theme toggle switches the complete
surface to the dark app extension; sections never mix light and dark tokens.

## Routing glass direction (v1.2)

The v1.2 redesign treats the landing as a table of operation layers made from
optical glass and transparent routing sheets. Indigo is the active path
connecting customer → checklist → reply → handover. The hero lets a visitor
trace a handover; subsequent sections reveal and disassemble the operational
layers through scroll and spatial composition.

This direction extends the base grammar with three sanctioned additions:

- **Micro-labels** at 9–10px for stage detail, signal captions, and locale
  pills. These are display-only metadata and never carry body content.
- **Display radii** of 19px, 23px, and 30px for the hero console, route
  orbit, and stage panels. These are larger than the 16–20px card scale
  because they read as optical glass objects, not workspace cards.
- **Atmospheric indigo alpha tints** — `rgba(129, 140, 248, 0.26–0.28)`
  for radial highlights and `rgba(20, 18, 62, 0.34)` for deep glass shadow
  on the dark handover panel. These are decorative-only and never replace
  the documented status palette.

A lightweight WebGL/canvas flow field (`FlowField.svelte`) sits behind the
hero as a decorative atmospheric layer. It has a canvas fallback, ignores
pointer events, and is suppressed under `prefers-reduced-motion`.

## Product truth

- Primary audience: owner or operations leader responsible for customer onboarding.
- Primary action: **Start free** → `/register`.
- Secondary action: sign in or open the existing workspace.
- Product mechanism: workflow stages, customer cards, required checklists, staff reminders, WhatsApp actions, and human handover.
- Customers do not log into the board.
- Demo records are synthetic and must be clearly labeled. Do not invent testimonials, customer logos, benchmarks, or business proof.

## Visual language

### Material

- White canvas, slate-sunken sections, pure-white cards, indigo actions, and soft card shadows.
- Full pills are reserved for buttons, tags, and compact controls.
- Cards and product records use 16–20px radii; the landing has no sharp rectangular panels.
- Status colors carry workflow meaning: indigo queued, amber in progress, rose urgent or handover, green done.
- Typography is Inter throughout. Metadata may use uppercase tracking, but not decorative monospace.

### Signature artifact

The hero record is the load-bearing product demonstration:

- record label: `Demo record / 04—07`
- customer: `Siti Aminah`
- case identifier: `FB-0427`
- route: `Intake → Confirm → Follow-up → Complete`
- current signal: a rose marker on the active stage
- next action: review the customer reply
- interaction: `Trace handover` reveals the staff action in an `aria-live` region

The record is illustrative, not a claim about a real customer.

## Palette

These values mirror `app/ds.css` so marketing, auth, and workspace surfaces read
as one product. `app/app.css` exposes the same roles to landing utility classes.

### Light default

| Token | Value | Use |
|---|---|---|
| Canvas | `#ffffff` | Page background |
| Canvas sunken | `#f8fafc` | Section bands and panel headers |
| Lane | `#f1f5f9` | Soft controls and status context |
| Card | `#ffffff` | Product records and CTA surfaces |
| Primary | `#4f46e5` | Main action |
| Primary hover | `#4338ca` | Main action hover |
| Primary soft | `#eef2ff` | Selected and explanatory surfaces |
| Ink | `#0f172a` | Headlines and primary labels |
| Body | `#334155` | Paragraph text |
| Mute | `#64748b` | Supporting text |
| Faint | `#94a3b8` | Metadata and quiet marks |
| Hairline | `#e2e8f0` | Rules and card borders |
| Queued / intake | `#4f46e5` | Queued or informational state |
| In progress / attention | `#f59e0b` | Waiting or active work |
| Urgent / handover | `#f43f5e` | Attention and active handover |
| Done | `#22c55e` | Completed state |

### Dark extension

| Token | Value | Use |
|---|---|---|
| Canvas | `#0f172a` | Page background |
| Canvas sunken | `#0b1220` | Section bands and panel headers |
| Lane | `#111c2f` | Soft controls and status context |
| Card | `#172033` | Product records and CTA surfaces |
| Primary | `#818cf8` | Main action |
| Primary hover | `#6366f1` | Main action hover |
| Primary soft | `#1e1b4b` | Selected and explanatory surfaces |
| Ink | `#f8fafc` | Headlines and primary labels |
| Body | `#cbd5e1` | Paragraph text |
| Mute | `#94a3b8` | Supporting text |
| Faint | `#64748b` | Metadata and quiet marks |
| Hairline | `#26364d` | Rules and card borders |
| Queued / intake | `#818cf8` | Queued or informational state |
| In progress / attention | `#fbbf24` | Waiting or active work |
| Urgent / handover | `#fb7185` | Attention and active handover |
| Done | `#4ade80` | Completed state |

## Typography

- Primary face: Inter, 500–800 weights loaded in `app/app.html`.
- Hero heading: 44–68px fluid, 800 weight, approximately `-0.04em` tracking.
- Section heading: 30–48px fluid, 800 weight, approximately `-0.035em` tracking.
- Body: 18px, 1.6 line height, maximum 65–75 characters per line.
- UI labels: 13–15px, 600–700 weight.
- Metadata: 11–12px, 700 weight, modest uppercase tracking when it describes a system label or state.
- Micro-labels (v1.2): 9–10px, 600–700 weight, display-only metadata for
  stage detail, signal captions, and locale pills. Never used for body
  content or primary labels.

## Shape and depth

- Buttons, tags, and compact controls use `rounded-full`.
- Cards and product records use `rounded-2xl` and `border border-hairline`.
- Card depth uses `shadow-card`; primary actions use `shadow-primary`.
- The routing-glass objects (hero console, route orbit, stage panels) use the
  v1.2 display radii 19px / 23px / 30px. These are optical-glass surfaces, not
  workspace cards, and are documented above under "Routing glass direction".
- Atmospheric indigo alpha tints are decorative-only and never replace the
  status palette.
- No glass panels on workspace cards, no hard-offset shadows on cards, and no
  decorative glow that competes with status color.

## Composition

### Navigation

- Floating rounded navigation island with backdrop blur (and a fallback for
  reduced transparency) instead of a full-width glued bar.
- Subtle inner highlight and tinted shadow; hairline border preserved.
- Flowboard's indigo `F` mark and wordmark match auth and workspace branding.
- Links use the same semibold slate text as dashboard navigation.
- Primary action is a pill. Theme toggle and language switcher remain
  available on desktop and mobile.
- Mobile navigation becomes a rounded drawer with the same action order.

### Hero

- Full-viewport composition with the atmospheric `FlowField` behind the content.
- Two-column desktop composition: product thesis and actions at left, a spatial
  routing console at right with 3D perspective and a four-stage route orbit.
- The console shows the actual mechanism (customer, stage route, next action)
  instead of a decorative illustration.
- Primary CTA is indigo with an arrow affordance; the secondary action is a
  white bordered control.
- `Trace handover` toggles a real local demo state, remains keyboard
  reachable, and announces the changed state in an `aria-live` region.

### Signals panel

`FeatureGrid.svelte` is an asymmetric 12-column bento panel, not a six-card
grid. It shows three operational signals through visual demonstrations:

- Context: one large panel showing the customer journey with stage markers.
- Execution: a supporting panel showing required checklist items.
- Attention: a dark handover panel showing reply and handover context.

Each panel uses a status marker, concise copy, and a lightly tinted status
surface. A `view-timeline` entry animation is used where supported.

### Operating rhythm

`HowItWorks.svelte` shows three sequential stations as stacked, sticky journey
cards with scroll-driven motion:

1. Shape the journey — workflow builder demonstration.
2. Make the work explicit — checklist sheet demonstration.
3. Follow the signal — visible handover demonstration.

A two-column owner/staff responsibility bridge explains the division of
responsibility without adding another repeated card grid. On mobile, rotations
and sticky overlap are removed for readability.

### Workflow record

`UseCases.svelte` is an interactive workflow stage explorer with previous/next
controls, keyboard arrow-key navigation, and tablist/tab semantics. The active
stage panel is supported by mechanism cards for assignee attachment, required
work visibility, and message context. An attention panel explains that the next
action appears where the team works. It uses the same lane/card relationship as
the dashboard without claiming real business metrics.

### Closing CTA

`CTASection.svelte` uses a primary-soft rounded card, the same treatment as a
selected or explanatory workspace surface. The indigo button remains the single
strong action.

### Footer

The footer uses the same card surface, typography, border, and semibold link
language as the app shell. Links remain short and factual.

## Interaction and state

- `ModeWatcher` applies the `dark` class to `<html>`, defaults to light, and persists the user's preference.
- `ThemeToggle` is a real control with an accessible label and visible focus ring.
- `Trace handover` toggles a real local demo state and announces the result with `aria-live`.
- Buttons preserve keyboard focus, touch targets, loading behavior, and auth-aware destinations.
- Reveal motion stays short and respects reduced motion through the existing `reveal` action.

## Responsive behavior

- Desktop: two-column hero and asymmetric product panels.
- Tablet: the record moves below the thesis when the available measure becomes cramped.
- Mobile: one-column cards, readable full-width records, and a nav drawer with the same action order.
- No content depends on hover. The handover trace is clickable and keyboard reachable.

## Accessibility

- Every visual artifact has a useful `aria-label` when it communicates product state.
- Synthetic records are labeled `Illustrative`.
- Status colors always accompany text labels; color is never the only state channel.
- Light and dark palettes keep body text readable and primary controls high contrast.
- Focus rings use the active theme's `--focus` token.
- Reduced motion keeps content visible and removes nonessential transforms.

## Anti-patterns

- No generic six-card feature grid.
- No fake metrics, testimonials, customer logos, or invented benchmarks.
- No developer-tool boilerplate, command-line claims, or framework-first hero copy.
- No glow-heavy gradients or arbitrary decorative shadows on workspace cards.
  (Routing-glass objects may use the documented atmospheric indigo alpha tints.)
- No glass panels on workspace cards or authenticated surfaces.
- No mixed light/dark sections.
- No hidden product mechanism behind a vague headline.
- No decorative monospace or status colors without a label.
- No micro-labels (9–10px) for body content or primary labels.

## Implementation map

| Surface | File |
|---|---|
| Route composition | `app/pages/+page.svelte` |
| Root theme and direction contract | `app/pages/+layout.svelte` |
| Shared marketing tokens | `app/app.css` |
| Atmospheric flow field | `app/lib/components/landing/organisms/FlowField.svelte` |
| Navigation | `app/lib/components/landing/organisms/Nav.svelte` |
| Hero routing console | `app/lib/components/landing/organisms/Hero.svelte` |
| Signal panel | `app/lib/components/landing/organisms/FeatureGrid.svelte` |
| Operating rhythm | `app/lib/components/landing/organisms/HowItWorks.svelte` |
| Workflow stage explorer | `app/lib/components/landing/organisms/UseCases.svelte` |
| Closing CTA | `app/lib/components/landing/organisms/CTASection.svelte` |
| Footer | `app/lib/components/landing/organisms/Footer.svelte` |
| Surface brief | `.impeccable/surfaces/app-pages-page-svelte.md` |
