---
version: 1.1
name: Flowboard-workspace-landing
mode: persuade
platform: web
description: |
  Flowboard's English marketing surface uses the same visual grammar as the
  authenticated workspace and login flow: a white canvas, indigo actions,
  slate surfaces, rounded cards, soft shadows, and explicit workflow states.
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
in: Plus Jakarta Sans, white workspace surfaces, indigo actions, pill controls,
20px cards, slate metadata, and a clear status vocabulary.

Light is the default landing mode. The navbar theme toggle switches the complete
surface to the dark app extension; sections never mix light and dark tokens.

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
- Typography is Plus Jakarta Sans throughout. Metadata may use uppercase tracking, but not decorative monospace.

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

- Primary face: Plus Jakarta Sans, 500–800 weights loaded in `app/app.html`.
- Hero heading: 44–68px fluid, 800 weight, approximately `-0.04em` tracking.
- Section heading: 30–48px fluid, 800 weight, approximately `-0.035em` tracking.
- Body: 18px, 1.6 line height, maximum 65–75 characters per line.
- UI labels: 13–15px, 600–700 weight.
- Metadata: 11–12px, 700 weight, modest uppercase tracking when it describes a system label or state.

## Shape and depth

- Buttons, tags, and compact controls use `rounded-full`.
- Cards and product records use `rounded-2xl` and `border border-hairline`.
- Card depth uses `shadow-card`; primary actions use `shadow-primary`.
- No gradients, glass panels, hard-offset shadows, or decorative glow.

## Composition

### Navigation

- Fixed 64px top bar with a white card surface, hairline border, and control shadow.
- Flowboard's indigo `F` mark and wordmark match auth and workspace branding.
- Links use the same semibold slate text as dashboard navigation.
- Primary action is a pill. Theme toggle remains available on desktop and mobile.
- Mobile navigation becomes a rounded-control drawer with the same action order.

### Hero

- White canvas and two-column desktop composition: product thesis and actions at left, illustrative product record at right.
- The record shows the actual mechanism instead of a decorative illustration.
- Primary CTA is indigo; `See how it moves` is a white bordered secondary action.
- `Trace handover` remains keyboard reachable and announces the changed state.

### Signals panel

`FeatureGrid.svelte` is an asymmetric explanation panel, not a six-card grid. It
shows three operational signals:

- Context: one card, one journey.
- Execution: required work stays in view.
- Attention: the system surfaces what is stuck.

Each row uses a status marker, concise copy, and a lightly tinted status surface.

### Operating rhythm

`HowItWorks.svelte` shows three sequential stations:

1. Shape the journey.
2. Make the work explicit.
3. Follow the signal.

A rounded owner/staff strip explains the division of responsibility without
adding another repeated card grid.

### Workflow record

`UseCases.svelte` shows one workflow spine with stages, detail, count, and status
marker. It uses the same lane/card relationship as the dashboard without claiming
real business metrics.

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
- No glow-heavy gradients, glass panels, or arbitrary decorative shadows.
- No mixed light/dark sections.
- No hidden product mechanism behind a vague headline.
- No decorative monospace or status colors without a label.

## Implementation map

| Surface | File |
|---|---|
| Route composition | `app/pages/+page.svelte` |
| Root theme and direction contract | `app/pages/+layout.svelte` |
| Shared marketing tokens | `app/app.css` |
| Navigation | `app/lib/components/landing/organisms/Nav.svelte` |
| Hero product record | `app/lib/components/landing/organisms/Hero.svelte` |
| Signal panel | `app/lib/components/landing/organisms/FeatureGrid.svelte` |
| Operating rhythm | `app/lib/components/landing/organisms/HowItWorks.svelte` |
| Workflow spine | `app/lib/components/landing/organisms/UseCases.svelte` |
| Closing CTA | `app/lib/components/landing/organisms/CTASection.svelte` |
| Footer | `app/lib/components/landing/organisms/Footer.svelte` |
| Surface brief | `.impeccable/surfaces/app-pages-page-svelte.md` |
