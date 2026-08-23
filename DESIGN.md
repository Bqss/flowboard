---
version: 1.0
name: Flowboard-kanban-system
description: |
  A bright, high-contrast kanban workspace system. White canvas, slate-100
  "lane" containers, pure-white floating cards with soft shadows and no visible
  border, one saturated indigo (#4f46e5) as the single brand action, and a
  three-hue status language (indigo = queued, amber = in progress, green = done)
  with rose reserved for urgency. Typography is a geometric grotesque set
  extra-bold and tight on every heading; body and metadata stay small, medium
  weight, and slate. Iconography is Hugeicons stroke-rounded at 1.8px — outline
  only, never filled, never colored except to match the status hue it labels.
  Every interactive surface is either a full pill (buttons, chips, avatars) or a
  16-20px rounded rectangle (cards, lanes) — the system has no sharp corners.

colors:
  # Brand & action
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-pressed: "#3730a3"
  primary-soft: "#eef2ff"
  primary-soft-hover: "#e0e7ff"
  primary-border: "#c7d2fe"
  primary-ink: "#4338ca"
  on-primary: "#ffffff"
  focus-ring: "rgba(79,70,229,0.35)"

  # Surfaces
  canvas: "#ffffff"
  canvas-sunken: "#f8fafc"
  lane: "#f1f5f9"
  lane-dropzone: "#e0e7ff"
  card: "#ffffff"
  hairline: "#e2e8f0"
  hairline-strong: "#cbd5e1"
  ring-hover: "#94a3b8"
  ring-active: "#64748b"
  overlay: "rgba(15,23,42,0.45)"

  # Text
  ink: "#0f172a"
  ink-soft: "#1e293b"
  body: "#334155"
  mute: "#64748b"
  faint: "#94a3b8"

  # Status — queued / neutral
  status-queued: "#4f46e5"
  status-queued-soft: "#eef2ff"
  status-queued-ink: "#4338ca"

  # Status — in progress
  status-progress: "#f59e0b"
  status-progress-strong: "#b45309"
  status-progress-soft: "#fffbeb"
  status-progress-ink: "#b45309"

  # Status — done
  status-done: "#22c55e"
  status-done-strong: "#15803d"
  status-done-soft: "#f0fdf4"
  status-done-ink: "#15803d"

  # Status — urgent / overdue
  status-urgent: "#f43f5e"
  status-urgent-strong: "#e11d48"
  status-urgent-soft: "#fff1f2"
  status-urgent-ink: "#be123c"

  # Status — idle / not started
  status-idle: "#94a3b8"
  status-idle-soft: "#f1f5f9"
  status-idle-ink: "#475569"

  # Presence & decoration
  presence-online: "#22c55e"
  aurora-0: "#ffffff"
  aurora-1: "#f3eefd"
  aurora-2: "#d9c6fa"
  aurora-3: "#9e76f8"
  aurora-4: "#6c49f7"
  aurora-5: "#4f46e5"

typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  heading-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  heading-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  heading-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  card-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  meta-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  badge-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.005em"
  micro:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"

rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 12px
  xl: 16px
  '2xl': 20px
  '3xl': 24px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  '2xl': 20px
  '3xl': 24px
  '4xl': 32px
  lane-gap: 16px
  card-gap: 12px

shadow:
  card: "0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.05)"
  card-hover: "0 2px 4px rgba(15,23,42,0.05), 0 8px 20px rgba(15,23,42,0.09)"
  card-drag: "0 12px 32px rgba(15,23,42,0.16)"
  control: "0 1px 2px rgba(15,23,42,0.05)"
  primary: "0 4px 12px rgba(79,70,229,0.24)"
  popover: "0 8px 28px rgba(15,23,42,0.12)"

icons:
  library: "@hugeicons/core-free-icons"
  variant: stroke-rounded
  strokeWidth: 1.8
  size-sm: 16px
  size-md: 18px
  size-lg: 20px
  size-xl: 24px
  fill: none

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 0 20px
    height: 40px
  button-primary-lane:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 0 20px
    height: 44px
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 0 16px
    height: 40px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
    padding: 0 12px
    height: 36px
  button-danger:
    backgroundColor: "{colors.status-urgent}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
  icon-button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.body}"
    rounded: "{rounded.full}"
    size: 40px
  icon-button-bare:
    backgroundColor: "transparent"
    textColor: "{colors.faint}"
    rounded: "{rounded.sm}"
    size: 28px
  text-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 0 16px
    height: 40px
  search-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 0 16px
    height: 40px
  lane:
    backgroundColor: "{colors.lane}"
    rounded: "{rounded.2xl}"
    padding: 16px
    width: 320px
  lane-dropzone:
    backgroundColor: "{colors.lane-dropzone}"
    rounded: "{rounded.2xl}"
    padding: 16px
  lane-header:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    height: 32px
  lane-count-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.mute}"
    typography: "{typography.badge-sm}"
    rounded: "{rounded.full}"
    padding: 2px 10px
    height: 24px
  task-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.xl}"
    padding: 14px
  task-card-hover:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 14px
  task-card-dragging:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 14px
  task-card-flat:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 14px
  label-bar:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: 4px
    width: 28px
  badge-soft:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.badge-sm}"
    rounded: "{rounded.sm}"
    padding: 4px 10px
    height: 24px
  status-pill:
    backgroundColor: "{colors.status-queued}"
    textColor: "{colors.on-primary}"
    typography: "{typography.badge-sm}"
    rounded: "{rounded.full}"
    padding: 3px 10px
    height: 22px
  priority-chip:
    backgroundColor: "{colors.status-urgent}"
    textColor: "{colors.on-primary}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 3px 8px
    height: 22px
  avatar:
    rounded: "{rounded.full}"
    size: 28px
  avatar-overflow:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    size: 28px
  meta-stat:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.meta-md}"
  tab-underline:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
    typography: "{typography.label-sm}"
    height: 44px
  tab-underline-active:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    height: 44px
  segmented-group:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.full}"
    height: 40px
  segmented-item-active:
    backgroundColor: "{colors.lane}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    height: 40px
  rail:
    backgroundColor: "{colors.card}"
    width: 64px
  rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.faint}"
    rounded: "{rounded.lg}"
    size: 40px
  rail-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    size: 40px
  logo-tile:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    size: 32px
  breadcrumb:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
    typography: "{typography.label-sm}"
    height: 20px
  topbar:
    backgroundColor: "{colors.card}"
    height: 64px
  progress-inline:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
    typography: "{typography.meta-md}"
  popover:
    backgroundColor: "{colors.card}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 8px
  modal:
    backgroundColor: "{colors.card}"
    textColor: "{colors.body}"
    rounded: "{rounded.3xl}"
    padding: 24px
  toast-success:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 10px 16px
---

## Overview

Flowboard's system is a **bright kanban workspace**: white canvas, `{colors.lane}` (#f1f5f9) lane containers, and pure-white cards that float on soft shadows rather than sit inside borders. It is the tonal inverse of `DESIGN.landing.md` (the dark marketing system) — the two coexist, but nothing crosses over: the landing page stays dark, the app stays light.

**Implementation lives in code.** Every pattern below maps to a Svelte component in `app/lib/components/`. Before writing markup, open `/design-system` — **compose existing components; do not rebuild buttons, inputs, badges, or cards from raw HTML/CSS.** See [Component Library](#component-library-use-these--dont-rebuild) for the full map.

Structure is legible before you read a single word. The lane is a filled slate tray, the cards inside it are white, and the only large block of saturated color in a resting viewport is the lane's own full-width "Add" button. Everything else earns color by carrying status: indigo means queued, amber means work is moving, green means it's finished, rose means someone is late, slate means nothing has started. Because those four hues are also the only decoration on a card (as 4px `{component.label-bar}` strips along the card's top edge), a full board reads as a color-coded map at a glance from three meters away.

Typography carries the personality. Every heading is **extra-bold (800) with negative tracking** — `{typography.display-md}` at -0.025em, `{typography.heading-md}` at -0.015em — which makes titles feel packed and confident, while body copy and metadata stay small (13-15px), medium weight, and slate. The contrast between a tight black 30px title and a 13px slate metadata row is the system's main typographic gesture; there is no mid-weight middle ground.

Geometry is uniformly soft: nothing in the system has a sharp corner. Cards are `{rounded.xl}` (16px), lanes `{rounded.2xl}` (20px), badges `{rounded.sm}` (8px), and every button, chip, avatar, count, and input is `{rounded.full}` — a fully-rounded pill. The pill button is the signature shape; a rectangular primary button breaks the system instantly.

**Key characteristics:**
- Two-surface elevation: filled `{colors.lane}` tray → white `{component.task-card}` floating on `{shadow.card}`, with **no border on the card**. Depth comes from shadow + surface contrast, never from an outline.
- A single brand action color, `{colors.primary}` (#4f46e5). One solid indigo pill per lane, one per toolbar — never two competing primaries in the same fold.
- Five-state status language: `{colors.status-queued}` indigo · `{colors.status-progress}` amber · `{colors.status-done}` green · `{colors.status-urgent}` rose · `{colors.status-idle}` slate. Each state ships as **solid** (fills), **soft** (tinted backgrounds), and **ink** (text on soft), with a **strong** fallback where a white label is required.
- Extra-bold tight headings (800 weight, negative letter-spacing) against medium-weight 13-15px slate body and metadata.
- Full-pill buttons, chips, counts, inputs, and avatars; 16-20px rounded rectangles for cards and lanes; zero sharp corners anywhere.
- `{component.label-bar}` — 4px × 28px rounded color strips stacked along the top edge of a card as the tag indicator. The system's most recognizable card detail.
- Hugeicons **stroke-rounded outline** icons at 1.8px, sized 16-20px, colored `{colors.faint}`/`{colors.mute}` by default. Icons are never filled and never carry brand color unless they are labeling a status.
- Metadata inversion: the icon is muted (`{colors.faint}`) and the number beside it is bold and dark (`{colors.ink-soft}`) — counts read first, icons second.

## Colors

> **Source screenshots:** `reference/image.png` (list-lane board with label bars, perspective render), `reference/image copy.png` (three-lane board with filled trays — the canonical desktop reference), `reference/image copy 2.png` (three mobile viewports). Sampled directly from pixels; the palette resolves almost exactly onto Tailwind's default ramp, which makes it reproducible without custom color math.

### Brand & Action
- **Primary** (`{colors.primary}` — `#4f46e5`, Tailwind `indigo-600`): the single brand action. Carries `{component.button-primary}`, the queued lane's "Add New Task" pill, the active tab label and underline, the active rail icon, and the selection ring on a focused card.
- **Primary Hover / Pressed** (`{colors.primary-hover}` — `#4338ca`, `{colors.primary-pressed}` — `#3730a3`): one and two notches darker. Hover darkens the fill; it never lightens or adds a glow.
- **Primary Soft** (`{colors.primary-soft}` — `#eef2ff`, `indigo-50`): tinted background for `{component.badge-soft}`, `{component.rail-item-active}`, and `{component.avatar-overflow}` ("+3"). The workhorse tint — a light indigo wash is how the system marks "active" or "categorized" without going saturated.
- **Primary Soft Hover** (`{colors.primary-soft-hover}` — `#e0e7ff`, `indigo-100`) and **Primary Border** (`{colors.primary-border}` — `#c7d2fe`, `indigo-200`): hover step for tinted surfaces, and the hairline on tinted containers.
- **Primary Ink** (`{colors.primary-ink}` — `#4338ca`): text color on `{colors.primary-soft}`. Never put `{colors.primary}` text on `{colors.primary-soft}` — it under-contrasts; step down to primary-ink.
- **Focus Ring** (`{colors.focus-ring}` — `rgba(79,70,229,0.35)`): 3px outer ring at 2px offset on keyboard focus.

### Surfaces
- **Canvas** (`{colors.canvas}` — `#ffffff`): the app background, the topbar, the left rail, and the card fill. White is the dominant surface — roughly 70% of any board viewport.
- **Canvas Sunken** (`{colors.canvas-sunken}` — `#f8fafc`, `slate-50`): full-page background behind a centered content column, and the fill for read-only/disabled inputs.
- **Lane** (`{colors.lane}` — `#f1f5f9`, `slate-100`): the kanban lane tray. Also the active segment fill in `{component.segmented-item-active}` and the hover fill for bare icon buttons. This one value does all the "recessed" work in the system.
- **Lane Dropzone** (`{colors.lane-dropzone}` — `#e0e7ff`, `indigo-100`): the lane tray fill while a card is being dragged over it — the tray tints indigo to confirm the drop target.
- **Hairline** (`{colors.hairline}` — `#e2e8f0`, `slate-200`): 1px border on controls that sit *on white* — `{component.icon-button}`, `{component.search-field}`, `{component.segmented-group}`, `{component.lane-count-pill}`, and the topbar's bottom rule. Cards inside a lane get **no** hairline.
- **Hairline Strong** (`{colors.hairline-strong}` — `#cbd5e1`, `slate-300`): hover border on outlined controls.
- **Ring Hover** (`{colors.ring-hover}` — `#94a3b8`, `slate-400`) and **Ring Active** (`{colors.ring-active}` — `#64748b`, `slate-500`): the 1px ring that appears around a card on hover and while it is picked up. This ring plus a lifted shadow *is* the entire card interaction language.
- **Overlay** (`{colors.overlay}` — `rgba(15,23,42,0.45)`): modal scrim.

### Text
- **Ink** (`{colors.ink}` — `#0f172a`, `slate-900`): all headings, lane titles, card titles, and metadata *numbers*. The system is unafraid of near-black type.
- **Ink Soft** (`{colors.ink-soft}` — `#1e293b`, `slate-800`): secondary strong text — metadata counts, toast labels, segmented-control active label.
- **Body** (`{colors.body}` — `#334155`, `slate-700`): paragraph and description text, icon-button glyphs.
- **Mute** (`{colors.mute}` — `#64748b`, `slate-500`): breadcrumbs, inactive tabs, lane count text, dates, placeholders, secondary labels.
- **Faint** (`{colors.faint}` — `#94a3b8`, `slate-400`): default icon color, inactive rail glyphs, disabled text, bare icon buttons.

### Status
Each status ships as a small family: **solid** for filled pills, label bars, and dots; **soft** for tinted badge backgrounds; **ink** for text on soft; and **strong** — a darkened fill — for the rare pill that must carry a white label.

| Meaning | Solid | Text on solid | Strong (for white text) | Soft (bg) | Ink (on soft) |
|---|---|---|---|---|---|
| Queued / New / tagged | `{colors.status-queued}` #4f46e5 | white | — | `{colors.status-queued-soft}` #eef2ff | `{colors.status-queued-ink}` #4338ca |
| In progress | `{colors.status-progress}` #f59e0b | `{colors.ink}` | `{colors.status-progress-strong}` #b45309 | `{colors.status-progress-soft}` #fffbeb | `{colors.status-progress-ink}` #b45309 |
| Done / Completed | `{colors.status-done}` #22c55e | `{colors.ink}` | `{colors.status-done-strong}` #15803d | `{colors.status-done-soft}` #f0fdf4 | `{colors.status-done-ink}` #15803d |
| Urgent / Overdue | `{colors.status-urgent}` #f43f5e | white | `{colors.status-urgent-strong}` #e11d48 | `{colors.status-urgent-soft}` #fff1f2 | `{colors.status-urgent-ink}` #be123c |
| Not started / Idle | `{colors.status-idle}` #94a3b8 | `{colors.ink}` | — | `{colors.status-idle-soft}` #f1f5f9 | `{colors.status-idle-ink}` #475569 |

Read the "text on solid" column as a hard rule: **indigo and rose take white labels, amber / green / slate take `{colors.ink}` labels.** That keeps every pill the exact hue the reference uses while clearing contrast — see [Accessibility](#accessibility). The `-strong` fills are the fallback for the rare case where a white label is non-negotiable (a colored toast, a dark-surface embed).

The lane's own "Add" pill inherits its lane hue: indigo in the queued lane, amber in the in-progress lane, green in the done lane. This is the one sanctioned exception to "primary indigo owns all buttons" — a lane-scoped action wears its lane's color. Its label follows the same rule as the pills: white on the indigo lane, `{colors.ink}` on the amber and green lanes.

**Presence** (`{colors.presence-online}` — `#22c55e`): 8px dot at the bottom-right of an avatar, ringed 2px in `{colors.canvas}`.

### Brand Aurora (marketing / auth / empty states only)
A vertical violet wash from white down to saturated indigo, sampled from `reference/image copy 2.png`: `{colors.aurora-0}` #ffffff → `{colors.aurora-1}` #f3eefd → `{colors.aurora-2}` #d9c6fa → `{colors.aurora-3}` #9e76f8 → `{colors.aurora-4}` #6c49f7 → `{colors.aurora-5}` #4f46e5.

Use it for the login/register split panel, a marketing hero backdrop, or a large empty-state illustration ground. **Never** behind a board, a lane, or a card — the working surface stays white.

## Typography

### Font Family
**Plus Jakarta Sans** is the specified face: a geometric grotesque with a double-storey `a`, single-storey `g`, circular `o`, and flat-terminal digits — the closest freely-available match to the reference screenshots, which use a commercial geometric grotesque of the same class. Load weights **500, 600, 700, 800** only; the system never uses 400 (regular reads too thin against the near-black headings) and never uses 900.

```
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
```

Acceptable substitutes, in order: **Satoshi**, **General Sans**, **Switzer** (all Fontshare, same geometric-grotesque class). **Inter is not a substitute** — it is a neutral UI face and it flattens the system's personality; if Inter is the only option, compensate by pushing headings to 800 and tightening tracking to -0.03em. Do not substitute Poppins, Montserrat, or Nunito: single-storey `a` / rounded terminals change the voice entirely.

There is no monospace or serif face in the system.

### Hierarchy

| Token | Size | Weight | Line Height | Tracking | Use |
|---|---|---|---|---|---|
| `{typography.display-lg}` | 36px | 800 | 1.1 | -0.03em | Auth screen headline, marketing-adjacent page title |
| `{typography.display-md}` | 30px | 800 | 1.15 | -0.025em | Board / project page title ("Food Delivery Project") |
| `{typography.heading-lg}` | 24px | 800 | 1.2 | -0.02em | Modal title, dashboard section title, mobile page title |
| `{typography.heading-md}` | 18px | 800 | 1.3 | -0.015em | **Lane title** ("To Do", "In Progress"), card group header |
| `{typography.heading-sm}` | 16px | 700 | 1.35 | -0.01em | Sub-section heading, sidebar group label, drawer section |
| `{typography.card-title}` | 15px | 700 | 1.4 | -0.01em | Task card title — clamps to 2 lines |
| `{typography.body-md}` | 15px | 500 | 1.55 | 0 | Default body, task description, modal copy |
| `{typography.body-sm}` | 14px | 500 | 1.5 | 0 | Dense body, input value, table cell, helper text |
| `{typography.label-md}` | 15px | 600 | 1.2 | -0.005em | Primary button label |
| `{typography.label-sm}` | 14px | 600 | 1.2 | 0 | Tab label, secondary button, segmented item, breadcrumb |
| `{typography.meta-md}` | 13px | 600 | 1.3 | 0 | Card metadata (date, comment count), inline progress "0/7" |
| `{typography.badge-sm}` | 12px | 600 | 1.2 | 0.005em | Badge, status pill, lane count pill |
| `{typography.micro}` | 11px | 700 | 1.2 | 0.02em | Priority chip ("P1"), avatar overflow ("+3") |

### Principles
- **Headings are 700-800 and tightly tracked; nothing else is.** Weight 600 belongs to interactive labels only, 500 to prose. Never set a heading at 600 and never set body at 700.
- **Negative tracking scales with size.** -0.03em at 36px, -0.015em at 18px, 0 at 14px and below. Below 13px tracking goes slightly *positive* (`{typography.badge-sm}` and `{typography.micro}`) so small caps-height text stays readable.
- **Card titles clamp at 2 lines** (`line-clamp-2`) — never truncate to one line and never let a card grow to 4 lines of title.
- **Metadata is bold, not light.** A comment count is 13px/600 in `{colors.ink-soft}`, not 12px/400 in gray. This is deliberate: on a dense board, numbers are scanned, not read.

## Iconography

The reference uses a single outline icon family with rounded joins and a consistent ~2px stroke — geometric, friendly, and never filled. Flowboard implements this with **Hugeicons**, already installed in the repo (`@hugeicons/core-free-icons` + `@hugeicons/svelte`).

### Rules
1. **One family, one variant.** Hugeicons `stroke-rounded` only (`@hugeicons/svelte` + `@hugeicons/core-free-icons`). **Strictly use the existing installed icon library.** Never import Lucide, Heroicons, Feather, or any other icon pack.
2. **Zero emojis and stickers.** Strictly **NO emoji glyphs or stickers** (e.g., 👑, 👤, 🔥, ✨, etc.) in badges, buttons, cards, headers, or metadata. Clean typography and stroke-rounded Hugeicons are the only visual symbols in the interface.
3. **Outline only.** `fill: none`, stroke-driven. The single sanctioned exception is the small comment/message bubble in a card's metadata row, which the reference renders as a soft filled bubble in `{colors.faint}`.
4. **Stroke width 1.8** (`{icons.strokeWidth}`) at every size. Do not use `absoluteStrokeWidth`; let the stroke scale so a 24px icon doesn't read hairline.
5. **Sizes are quantized:** 14-16px inline-with-text/breadcrumbs · **18px default** (buttons, tabs, card affordances) · 20px rail and toolbar · 24px empty-state and modal headers. Nothing between, nothing above 24px in chrome.
6. **Default color is muted, not brand.** `{colors.faint}` for decorative/inactive, `{colors.body}` for actionable icons in outlined buttons, `{colors.on-primary}` inside a solid pill, `{colors.primary}` only when the parent element is in an active state. An icon takes a status hue **only** when it labels that status (a rose alarm-clock on an overdue card).
7. **Icons never stand alone as the primary label** except in the left rail and in 40px circular icon buttons — and those must carry a `title`/`aria-label`.
8. **Gap between icon and label is 8px** (`{spacing.md}`), and the icon always leads. Trailing icons are reserved for disclosure (`ArrowDown01Icon`) and external/export actions (`Upload04Icon`).
9. **No icon or emoji inside a badge or status pill.** Badges are text-only; the pill's color is the signal.

### Usage

```svelte
<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon } from '@hugeicons/core-free-icons';
</script>

<button class="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-on-primary">
  <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
  Add New Task
</button>
```

### Verified icon map

All names below exist in the installed `@hugeicons/core-free-icons` build.

**Left rail & global nav**

| Purpose | Icon |
|---|---|
| Home / Overview | `Home09Icon` |
| Analytics / Executive dashboard | `Analytics01Icon` (alt `ChartHistogramIcon`) |
| Customers / Team | `UserGroupIcon` |
| Calendar / Schedule | `Calendar03Icon` |
| Automations / Reminders | `FlashIcon` |
| Notifications | `Notification03Icon` (alt `BellIcon`) |
| Settings | `Settings01Icon` |
| Sign out | `Logout03Icon` |
| Collapse sidebar | `SidebarLeft01Icon` |

**Board chrome**

| Purpose | Icon |
|---|---|
| List view | `LeftToRightListBulletIcon` (alt `ListViewIcon`) |
| Board / Kanban view | `KanbanIcon` |
| Grid view | `GridViewIcon` |
| Column view | `ColumnInsertIcon` |
| Row view | `RowInsertIcon` |
| Timeline | `TimeQuarterPassIcon` (alt `Timer02Icon`) |
| Progress | `Tick02Icon` |
| Search | `Search01Icon` |
| Filter | `FilterHorizontalIcon` |
| Sort | `SortByDown01Icon` |
| Add (lane CTA, inline add) | `Add01Icon` |
| Lane / card overflow menu | `MoreHorizontalIcon` |
| Share | `Share08Icon` |
| Export | `Upload04Icon` |
| Import | `Download04Icon` |
| Invite member | `UserAdd01Icon` |
| Breadcrumb separator | `ArrowRight01Icon` |
| Dropdown chevron | `ArrowDown01Icon` |

**Card affordances**

| Purpose | Icon |
|---|---|
| Task marker (card title prefix) | `CheckmarkCircle02Icon` |
| Undetermined / question task | `HelpCircleIcon` |
| Comments | `Message01Icon` |
| Reactions | `ThumbsUpIcon` |
| Checklist progress ("0/7") | `CheckListIcon` |
| Due date | `Calendar03Icon` |
| Overdue / reminder | `AlarmClockIcon` |
| Attachment | `Attachment01Icon` |
| Note / description present | `Note01Icon` |
| Tag / label | `Tag01Icon` |
| Priority flag | `Flag02Icon` |
| Drag handle | `DragDropVerticalIcon` |
| Assignee | `UserCircleIcon` |

**Flowboard domain (onboarding, delivery, WhatsApp)**

| Purpose | Icon |
|---|---|
| WhatsApp automation | `WhatsappIcon` |
| Message sent | `SentIcon` |
| AI / auto-reply | `ChatBotIcon` |
| Human handover | `CustomerService01Icon` |
| Registration verified | `UserCheck01Icon` |
| Pending stock | `PackageIcon` |
| Delivery in progress | `DeliveryTruck01Icon` |
| Customer received | `PackageDeliveredIcon` |
| Payment / invoice | `Invoice01Icon` |
| Workflow / stage map | `Flowchart01Icon` |
| Recurring follow-up | `RepeatIcon` |
| Activity history | `HistoryIcon` |
| Urgent | `FireIcon` |
| Waiting | `HourglassIcon` |
| Success confirmation | `CheckmarkCircle02Icon` |
| Error / rejected | `CancelCircleIcon` |
| Warning | `Alert02Icon` |

## Layout

### Spacing System
- **Base unit:** 4px, with the working range concentrated at 8/12/16/24px.
- **Tokens:** `{spacing.xxs}` 2 · `{spacing.xs}` 4 · `{spacing.sm}` 6 · `{spacing.md}` 8 · `{spacing.lg}` 12 · `{spacing.xl}` 16 · `{spacing.2xl}` 20 · `{spacing.3xl}` 24 · `{spacing.4xl}` 32.
- **Card interior:** 14px padding. Inside a card the vertical rhythm is label-bars → 10px → badge row → 8px → title → 12px → footer row.
- **Lane interior:** `{spacing.xl}` 16px padding; `{spacing.card-gap}` 12px between cards; 12px between the lane header and the Add pill, 16px between the Add pill and the first card.
- **Between lanes:** `{spacing.lane-gap}` 16px.
- **Page:** 24px horizontal gutter at desktop, 32px between the topbar and the board.

### Grid & Container
- **App shell:** 64px fixed left rail (icon-only) → 1fr content. The rail never collapses at desktop and never expands to a labeled sidebar on the board screen.
- **Page Header & Navigation:** Every interior page uses a structured **`Breadcrumb`** (`Dashboard > Current Menu > ...`) directly above the page title instead of raw "← Back" links. Sits at the top of the header column with `Home09Icon` and `ArrowRight01Icon` dividers.
- **Topbar:** 64px tall, white, 1px `{colors.hairline}` bottom rule. Breadcrumb row above the page title, or breadcrumb left / actions right on a single row.
- **View tab strip:** sits directly under the page title, 44px tall, left-aligned, with a full-width 1px `{colors.hairline}` bottom rule that the active tab's 2px indigo underline overlaps.
- **Board:** horizontal flex of fixed **320px** lanes (`{component.lane}`), horizontally scrollable, each lane independently vertically scrollable with the lane header and Add pill pinned. Lanes never stretch to fill available width — leftover space stays empty.
- **Dashboard grids:** 4-up stat cards → 2-up at tablet → 1-up at mobile. Content max-width 1280px.
- **Detail drawer:** 480px right-side panel over `{colors.overlay}`, `{rounded.3xl}` on the left corners only.

### Whitespace Philosophy
The lane tray does the visual grouping, so the space *between* lanes stays tight (16px) while the space *inside* a card stays generous relative to its content (14px on a 15px title). The result is dense-but-breathable: a 320px lane holds a readable card without feeling cramped, and eight lanes scroll horizontally without the board feeling like a spreadsheet. Never add decorative dividers between lanes — the tray edges already separate them.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Recessed | `{colors.lane}` fill, no shadow | Lane tray, segmented active item, sunken page background |
| 1 — Flat on white | 1px `{colors.hairline}`, `{shadow.control}` | Icon buttons, search field, segmented group, count pill |
| 2 — Card | `{shadow.card}`, **no border** | `{component.task-card}` resting inside a lane |
| 3 — Card hover | `{shadow.card-hover}` + 1px `{colors.ring-hover}` ring | Card under the cursor |
| 4 — Dragging | `{shadow.card-drag}` + 1px `{colors.ring-active}` ring + `scale(1.02)` | Card picked up for drag |
| 5 — Popover | `{shadow.popover}` + 1px `{colors.hairline}` | Menus, dropdowns, date pickers |
| 6 — Modal | `{shadow.popover}` over `{colors.overlay}` | Dialogs, task detail |
| Action | `{shadow.primary}` — a tinted indigo shadow | Reserved for the single primary CTA in a hero/auth context. Not used on board buttons. |

Two rules make this hold together: **a card inside a lane never has a border** (the shadow plus white-on-slate contrast is the edge), and **a control on white always has a border** (a shadow alone is invisible there). Getting this backwards is the most common way to break the look.

### Decorative Depth
- **Label bars** — the 4px × 28px `{component.label-bar}` strips at a card's top edge, one per tag, 4px apart, in status hues. Cap at four visible bars.
- **Avatar stacks** — 28px avatars overlapping by -8px, each ringed 2px in `{colors.canvas}`, capped at four plus a `{component.avatar-overflow}` "+N" chip.
- **Aurora wash** — the `{colors.aurora-0}`→`{colors.aurora-5}` violet gradient, restricted to auth panels, marketing surfaces, and large empty states.
- **Media thumbnail** — an optional 16:9 image at the top of a card, `{rounded.lg}` (12px), inset 0 from the card's padding box, with the card's own padding preserved around it.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 6px | Micro chips, tiny inline tags |
| `{rounded.sm}` | 8px | `{component.badge-soft}`, bare icon-button hover target |
| `{rounded.md}` | 10px | Ghost button, menu item |
| `{rounded.lg}` | 12px | `{component.rail-item}`, logo tile, popover, in-card media thumbnail |
| `{rounded.xl}` | 16px | **`{component.task-card}`** — the system's most-repeated shape |
| `{rounded.2xl}` | 20px | `{component.lane}` tray, dashboard stat card |
| `{rounded.3xl}` | 24px | Modal, drawer, large empty-state panel |
| `{rounded.full}` | 9999px | **All buttons**, status pills, priority chips, count pills, inputs, search field, segmented group, avatars, label bars, presence dots |

The rule of thumb: **anything you click that contains text is a pill; anything that contains other content is a 16-24px rounded rectangle.** There is no 0px radius and no 2-4px radius anywhere in the system.

### Photography Geometry
- **Avatars:** 28px on cards, 32px in toolbars, 40px in mobile headers — always `{rounded.full}` with a 2px `{colors.canvas}` ring when stacked.
- **Card media:** 16:9, `{rounded.lg}`, object-cover, placed above the title block.
- **Logo tile:** 32px square, `{rounded.lg}`, `{colors.primary}` fill with a white mark.

## Component Library (use these — don't rebuild)

> **Source of truth:** `app/lib/components/` · **Live catalog:** `/design-system`  
> Import: `$lib/components/atoms|molecules|organisms/index.js` · Theme: `data-theme="app"` + `app/ds.css`

### Workflow

1. Open `/design-system` and find the closest live demo.
2. Import the component and compose it with props/snippets.
3. Wrap app surfaces in `data-theme="app"` and use `ds-*` typography classes.
4. Only hand-roll markup when no component exists — then add it to the library and showcase.

### Spec token → Svelte component map

| DESIGN.md spec | Svelte component | Layer |
|---|---|---|
| `{component.button-primary}` | `Button variant="primary"` | atom |
| `{component.button-secondary}` | `Button variant="secondary"` | atom |
| `{component.button-ghost}` | `Button variant="ghost"` | atom |
| `{component.button-danger}` | `Button variant="destructive"` / `variant="danger"` | atom |
| `{component.button-primary-lane}` | `Button variant="lane" lane="queued\|progress\|done"` | atom |
| `{component.icon-button}` | `IconButton variant="card"` | atom |
| `{component.icon-button-bare}` | `IconButton variant="bare"` | atom |
| `{component.text-input}` | `Input` inside `FormField` | atom + molecule |
| `{component.search-field}` | `SearchInput` | molecule |
| `{component.badge-soft}` / `{component.status-pill}` | `Badge` (`tone`, `variant`) | atom |
| `{component.priority-chip}` | `Chip` | atom |
| `{component.avatar}` | `Avatar` | atom |
| `{component.task-card}` + `{component.lane}` | `KanbanBoard` | organism |
| `{component.rail}` | `SidebarRail` | organism |
| `{component.topbar}` | `Topbar` | organism |
| `{component.breadcrumb}` | `Breadcrumb` | molecule |
| `{component.tab-underline}` | `Tabs variant="underline"` | molecule |
| `{component.segmented-group}` | `Tabs variant="segmented"` | molecule |
| `{component.popover}` | `Popover` / `DropdownMenu` | organism / molecule |
| `{component.modal}` | `Dialog` / `Sheet` / `ConfirmDialog` | organism |
| Empty state | `EmptyStateBlock` / `SecurityCard` | molecule / organism |
| Skeleton | `Skeleton` | atom |
| Stat / sparkline | `StatCard`, `ChartCard`, `MetricDelta` | molecule / organism |
| Data table | `DataTable`, `TableCard` | organism |
| File upload / dropzone | `FileUploader` | organism |
| Filter toolbar | `FilterBar` + `FilterPill` | organism / molecule |
| Login form | `LoginForm` | organism |
| Settings | `SettingsPanel` | organism |
| Multi-step wizard | `MultiStepForm` + `Stepper` | organism / molecule |
| Dashboard chrome | `DashboardLayout` | organism |
| Page shells | `AuthLayout`, `SettingsLayout`, `WizardLayout`, … | templates |

### Layer counts

| Layer | Count | Path |
|---|---|---|
| Atoms | 30 | `app/lib/components/atoms/` |
| Molecules | 35 | `app/lib/components/molecules/` |
| Organisms | 36 | `app/lib/components/organisms/` |
| Templates | 9 | `app/lib/components/templates/` |

Landing uses **`app/lib/components/landing/`** + [`DESIGN.landing.md`](./DESIGN.landing.md) — separate system.

### Minimal page example

```svelte
<script lang="ts">
  import '../../ds.css';
  import { Button, Badge } from '$lib/components/atoms/index.js';
  import { StatCard } from '$lib/components/molecules/index.js';
  import { KanbanBoard } from '$lib/components/organisms/index.js';
</script>

<div data-theme="app" class="min-h-screen bg-canvas p-6">
  <Button variant="primary">Add customer</Button>
  <Badge tone="progress">In Progress</Badge>
  <StatCard label="Active" value="12" delta={8} />
  <KanbanBoard {columns} />
</div>
```

## Components

> Specs cover Default, Hover, and Active/Dragging where the reference shows them. Disabled is `opacity: 0.5` plus `cursor: not-allowed` throughout.  
> **In code, these specs are implemented by the Svelte components above** — read the spec for visual intent, import the component for implementation.

### Buttons

**`button-primary`** — the universal action pill
- `{colors.primary}` fill, `{colors.on-primary}` label in `{typography.label-md}`, height 40px, padding 0 20px, `{rounded.full}`. Leading icon at 18px, 8px gap.
- Hover: fill → `{colors.primary-hover}`. Active: → `{colors.primary-pressed}`. Focus: 3px `{colors.focus-ring}` at 2px offset.
- One per fold. "Export Data", "Share", "Save Changes".

**`button-primary-lane`** — the lane's add action
- Same as above at **height 44px, full lane width**, and the fill is the **lane's status hue** rather than always indigo: `{colors.status-queued}` / `{colors.status-progress}` / `{colors.status-done}`.
- Label and icon are `{colors.on-primary}` on the indigo lane and `{colors.ink}` on the amber and green lanes.
- Sits between the lane header and the first card. It is the loudest element in the lane by design.

**`button-secondary`** — outlined pill
- `{colors.card}` fill, 1px `{colors.hairline}`, `{colors.ink-soft}` label in `{typography.label-sm}`, height 40px, padding 0 16px, `{rounded.full}`.
- Hover: border → `{colors.hairline-strong}`, fill → `{colors.canvas-sunken}`.
- "Invite", "Cancel", "Filter".

**`button-ghost`** — bare text action
- Transparent, `{colors.mute}` label in `{typography.label-sm}`, height 36px, `{rounded.md}`.
- Hover: fill → `{colors.lane}`, label → `{colors.ink-soft}`.

**`button-danger`** — destructive pill
- `{colors.status-urgent}` fill, white label, otherwise identical to `{component.button-primary}`.

**`icon-button`** — 40px circular control
- 40px circle, `{colors.card}` fill, 1px `{colors.hairline}`, 18px icon in `{colors.body}`, `{shadow.control}`.
- Hover: fill → `{colors.canvas-sunken}`, border → `{colors.hairline-strong}`.
- Toolbar settings / share / notification triggers. Always `aria-label`ed.

**`icon-button-bare`** — 28px borderless control
- 28px hit area, no fill, no border, 18px icon in `{colors.faint}`, `{rounded.sm}`.
- Hover: fill → `{colors.lane}`, icon → `{colors.body}`.
- The `+` and `⋯` at a lane header, the `⋯` on a card.

### Inputs

**`text-input`** / **`search-field`**
- `{colors.card}` fill, 1px `{colors.hairline}`, `{typography.body-sm}` in `{colors.ink}`, placeholder `{colors.mute}`, height 40px, padding 0 16px, `{rounded.full}`.
- Focus: border → `{colors.primary}` + 3px `{colors.focus-ring}`.
- Error: border → `{colors.status-urgent}`, helper text `{colors.status-urgent-ink}` in `{typography.meta-md}`.
- The search variant carries an 18px `Search01Icon` in `{colors.faint}` — **trailing** in the reference, which is the specified position for search specifically.
- Textareas are the one input that is not a pill: `{rounded.lg}`, min-height 96px.

### Lane (Kanban Column)

**`lane`**
- 320px fixed width, `{colors.lane}` fill, `{rounded.2xl}` (20px), 16px padding, no border, no shadow.
- Vertical stack: `{component.lane-header}` → 12px → `{component.button-primary-lane}` → 16px → card list at 12px gaps.
- Body scrolls; header and Add pill stay pinned.

**`lane-dropzone`** — drag-over state
- Fill → `{colors.lane-dropzone}` with a 2px dashed `{colors.primary-border}` inset outline, plus a 2px `{colors.primary}` insertion line at the drop index. 150ms fill transition.

**`lane-header`**
- Left: 8px `{rounded.full}` dot in the lane's status hue, 8px gap, title in `{typography.heading-md}` `{colors.ink}`.
- Right: `{component.lane-count-pill}`, optionally followed by `{component.icon-button-bare}` `+` and `⋯`.

**`lane-count-pill`**
- `{colors.card}` fill, 1px `{colors.hairline}`, `{colors.mute}` text in `{typography.badge-sm}`, padding 2px 10px, height 24px, `{rounded.full}`.
- Label reads "`8 Total`" — count then the word, not a bare number.

### Task Card

**`task-card`** — the system's atom
- `{colors.card}` fill, `{rounded.xl}` (16px), 14px padding, `{shadow.card}`, **no border**.
- Vertical composition, all optional except the title:
  1. `{component.label-bar}` row — up to four 4px × 28px color strips, 4px apart.
  2. Optional 16:9 media thumbnail at `{rounded.lg}`.
  3. Badge row — one `{component.badge-soft}` category chip (e.g. "Important").
  4. Title — 18px `CheckmarkCircle02Icon` in `{colors.faint}` + `{typography.card-title}` in `{colors.ink}`, clamped to 2 lines.
  5. Status row — `{component.status-pill}` plus optional `{component.priority-chip}`, 6px gap.
  6. Footer row — `{component.avatar}` stack + date in `{typography.meta-md}` `{colors.mute}` on the left; `{component.meta-stat}` cluster on the right.
- `cursor: grab`; `cursor: grabbing` while dragging.

**`task-card-hover`**
- `{shadow.card-hover}` + 1px `{colors.ring-hover}` ring, `translateY(-1px)`. 150ms ease-out.

**`task-card-dragging`**
- `{shadow.card-drag}` + 1px `{colors.ring-active}` ring + `scale(1.02)`. The origin slot leaves a `{rounded.xl}` dashed `{colors.primary-border}` placeholder at the card's height.

**`task-card-flat`** — for boards on a white background (no lane tray)
- Same card, but **add** a 1px `{colors.hairline}` border and soften the shadow to `{shadow.control}`. Lanes in this layout are separated by 1px vertical `{colors.hairline}` rules instead of trays. Used by list-style board views (`reference/image.png`).

### Badges, Pills & Chips

**`label-bar`** — the signature tag indicator
- 4px tall, 28px wide, `{rounded.full}`, solid status hue. Stacked horizontally at 4px gaps at the very top of a card, above all other content. Four maximum; a fifth becomes a `+N` in `{typography.micro}` `{colors.faint}`.

**`badge-soft`** — category / label chip
- Status-soft fill, status-ink text in `{typography.badge-sm}`, padding 4px 10px, height 24px, `{rounded.sm}` (8px — **not** a pill; this is the one chip that stays rectangular).
- "Important" → queued triad · "OK" → progress triad · "High Priority" → urgent triad · "Meh" → idle triad.

**`status-pill`** — the workflow state
- Filled pill in `{typography.badge-sm}`, padding 3px 10px, height 22px, `{rounded.full}`.
- Fill and label per state: "Started"/"Ongoing" → `{colors.status-queued}` + white · "In Progress" → `{colors.status-progress}` + `{colors.ink}` · "Complete" → `{colors.status-done}` + `{colors.ink}` · "Overdue" → `{colors.status-urgent}` + white · "Not Started" → `{colors.status-idle}` + `{colors.ink}`.
- Exactly one per card. Text-only — never add an icon.

**`priority-chip`** — priority level
- Filled pill in `{typography.micro}`, padding 3px 8px, height 22px, `{rounded.full}`. Sits immediately right of the status pill at a 6px gap.
- Flowboard mapping: **P1 / Urgent** → `{colors.status-urgent}` + white · **P2 / High** → `{colors.status-progress}` + `{colors.ink}` · **P3 / Normal** → `{colors.status-done}` + `{colors.ink}` · **P4 / Low** → `{colors.status-idle}` + `{colors.ink}`.

### Avatars & Metadata

**`avatar`** — 28px circle, `object-cover`. In a stack: -8px overlap, 2px `{colors.canvas}` ring, first avatar on top (`z-index` descending). Fallback is `{colors.primary-soft}` fill with `{colors.primary-ink}` initials in `{typography.micro}`.

**`avatar-overflow`** — 28px circle, `{colors.primary-soft}` fill, `{colors.primary-ink}` "+3" in `{typography.micro}`, 2px `{colors.canvas}` ring, last in the stack.

**`meta-stat`** — icon + count cluster
- 18px icon in `{colors.faint}`, 4px gap, count in `{typography.meta-md}` `{colors.ink-soft}`. Multiple stats sit 12px apart.
- The inversion is the point: the **number** is dark and bold, the **icon** is muted.

**`progress-inline`** — checklist ratio
- 16px `CheckListIcon` in `{colors.faint}` + "0/7" in `{typography.meta-md}` `{colors.mute}`. Once complete, both flip to `{colors.status-done-ink}`.

### Navigation

**`rail`** — the 64px icon rail
- `{colors.card}` fill, 1px `{colors.hairline}` right rule, full height. Top: `{component.logo-tile}` with 20px below it. Then a vertical stack of `{component.rail-item}` at 8px gaps, centered horizontally.

**`rail-item`** / **`rail-item-active`**
- 40px square, `{rounded.lg}` (12px), 20px icon.
- Default: transparent fill, `{colors.faint}` icon. Hover: `{colors.lane}` fill, `{colors.body}` icon.
- Active: `{colors.primary-soft}` fill, `{colors.primary}` icon. No underline, no left indicator bar — the tinted tile is the whole signal.

**`topbar`** — 64px, `{colors.card}`, 1px `{colors.hairline}` bottom rule. Breadcrumb left, action cluster right (icon buttons → primary pill → avatar).

**`breadcrumb`** — Global navigation hierarchy across all dashboard subpages. Features leading `Home09Icon` in `{colors.faint}` on the root crumb, ancestor route links in `{typography.label-sm}` `{colors.mute}` (`hover:text-ink`), separated by 13-14px `ArrowRight01Icon` in `{colors.faint}`. The current page crumb is `{colors.ink}` with bold weight (`aria-current="page"`). Sits directly above the page title in place of standalone "← Back" links.

**`tab-underline`** / **`tab-underline-active`**
- 44px tall, 18px leading icon + `{typography.label-sm}` label, 8px gap, 20px between tabs.
- Default: `{colors.mute}` text and icon. Hover: `{colors.ink-soft}`.
- Active: `{colors.primary}` text **and** icon, plus a 2px `{colors.primary}` bottom bar the exact width of the tab's content box, overlapping the strip's `{colors.hairline}` rule.

**`segmented-group`** / **`segmented-item-active`**
- Outer: `{colors.card}`, 1px `{colors.hairline}`, `{rounded.full}`, height 40px, `overflow: hidden`.
- Items: `{typography.label-sm}`, 16px leading icon, 0 12px padding, separated by 1px `{colors.hairline}` **vertical dividers** (not gaps).
- Active item: `{colors.lane}` fill, `{colors.ink}` label. The mobile view-switcher pattern.

**`tab-pills`** / **`tab-pills-active`** (Floating Capsule Tray)
- Outer: `{colors.lane}` tray, 1px `{colors.hairline}` border, `{rounded.full}`, padding 4px, 4px gap.
- Items: `{typography.label-sm}`, `{rounded.full}`, height 30-36px, padding 0 14px. Inactive: transparent, `{colors.mute}` text, hover `{colors.ink-soft}` on `{colors.card}` tint.
- Active item: pure white `{colors.card}` pill, `{colors.ink}` bold text, subtle elevation shadow (`0 1px 3px rgba(15,23,42,0.08)`), 1px `{colors.hairline}` ring. Active count badge in `{colors.primary-soft}` with `{colors.primary-ink}` text. Ideal for toolbars, entity filters, and status switchers.

### Overlays & Feedback

**`popover`** — `{colors.card}`, 1px `{colors.hairline}`, `{rounded.lg}`, 8px padding, `{shadow.popover}`. Items are 36px tall, `{rounded.md}`, `{typography.body-sm}` `{colors.body}`, with a 16px leading icon; hover fills `{colors.lane}`. Destructive items are `{colors.status-urgent-ink}` and hover-fill `{colors.status-urgent-soft}`.

**`modal`** — `{colors.card}`, `{rounded.3xl}` (24px), 24px padding, max-width 560px, over `{colors.overlay}`. Title in `{typography.heading-lg}`, a 28px bare `CancelCircleIcon` close button top-right, actions bottom-right (ghost "Cancel" then primary pill).

**`toast-success`** — `{colors.card}`, 1px `{colors.hairline}`, `{rounded.full}`, 10px 16px padding, `{shadow.popover}`. 18px `CheckmarkCircle02Icon` in `{colors.status-done}` + label in `{typography.label-sm}` `{colors.ink-soft}`. The reference's inline "Changes Saved" affordance is the same pattern without the border.

**Empty state** — centered 24px icon in `{colors.faint}` inside a 64px `{colors.lane}` circle, `{typography.heading-sm}` `{colors.ink}` title, `{typography.body-sm}` `{colors.mute}` description (max 320px), then one `{component.button-primary}`.

**Skeleton** — `{colors.lane}` blocks at the target element's radius, pulsing opacity 1 → 0.55 → 1 over 1.6s. Never spinners for board or lane loads.

## Motion

| Interaction | Spec |
|---|---|
| Hover (card, button, tab) | 150ms `ease-out` on background, border, shadow, transform |
| Card pick-up | 120ms to `scale(1.02)` + `{shadow.card-drag}` |
| Card drop | 200ms `cubic-bezier(0.2, 0.8, 0.2, 1)` settle into the slot |
| Lane dropzone tint | 150ms `ease-out` background |
| Popover / dropdown | 120ms fade + `translateY(-4px)` → 0 |
| Modal | 180ms fade for the scrim, 180ms `scale(0.98)` → 1 for the panel |
| Toast | 200ms slide up + fade, auto-dismiss at 4s |
| Skeleton pulse | 1.6s `ease-in-out` infinite |

Motion is short and functional — nothing above 250ms except the skeleton loop. Honor `prefers-reduced-motion: reduce` by dropping every transform and keeping only opacity changes.

## Accessibility

The reference screenshots put **white 12px text on bright amber (#f59e0b), bright green (#22c55e), and slate-400 (#94a3b8) pills**. Those combinations measure 2.15:1, 2.28:1, and 2.56:1 — well under the 4.5:1 WCAG AA requires for text below 18.66px bold. Flowboard deviates in the one direction that costs nothing visually: it keeps the exact fill and **flips the label to `{colors.ink}`**, which lands at 8.31:1 on amber and 7.83:1 on green. The board's color map is unchanged; only the text darkens.

Measured ratios for every text pairing in the system:

| Pairing | Ratio | Result |
|---|---|---|
| `{colors.ink}` on `{colors.canvas}` — headings | 17.85 | AAA |
| `{colors.ink}` on `{colors.status-progress}` — "In Progress" pill | 8.31 | AAA |
| `{colors.ink}` on `{colors.status-done}` — "Complete" pill | 7.83 | AAA |
| `{colors.ink}` on `{colors.status-idle}` — "Not Started" pill | 6.96 | AA |
| `{colors.primary-ink}` on `{colors.primary-soft}` — badge | 7.07 | AA |
| `{colors.status-idle-ink}` on `{colors.status-idle-soft}` | 6.92 | AA |
| `{colors.on-primary}` on `{colors.primary}` — primary button | 6.29 | AA |
| `{colors.primary}` on `{colors.canvas}` — active tab label | 6.29 | AA |
| `{colors.status-urgent-ink}` on `{colors.status-urgent-soft}` | 5.72 | AA |
| white on `{colors.status-progress-strong}` — fallback pill | 5.02 | AA |
| white on `{colors.status-done-strong}` — fallback pill | 5.02 | AA |
| `{colors.status-progress-ink}` on `{colors.status-progress-soft}` | 4.84 | AA |
| `{colors.status-done-ink}` on `{colors.status-done-soft}` | 4.79 | AA |
| `{colors.mute}` on `{colors.canvas}` — metadata, tabs | 4.76 | AA |
| white on `{colors.status-urgent-strong}` — fallback pill | 4.70 | AA |
| `{colors.mute}` on `{colors.lane}` — text directly on a tray | 4.34 | AA-large only |
| white on `{colors.status-urgent}` — "Overdue" pill | 3.67 | AA-large only |
| ~~white on `{colors.status-progress}`~~ | 2.15 | **FAIL — do not use** |
| ~~white on `{colors.status-done}`~~ | 2.28 | **FAIL — do not use** |
| ~~white on `{colors.status-idle}`~~ | 2.56 | **FAIL — do not use** |

Rules that follow from the table:

1. **Amber, green, and slate fills never carry white text.** Their labels are `{colors.ink}`. Indigo takes white. Rose at 3.67:1 takes white only at `{typography.badge-sm}` 12px/600 or larger *if* you accept AA-large; for strict AA use `{colors.status-urgent-strong}` (4.70:1).
2. **`{colors.faint}` (#94a3b8) is 2.56:1 on white — below the 3:1 non-text minimum.** Use it only for decorative glyphs sitting beside a text label (the icon in `{component.meta-stat}`, where the number carries the meaning). Any icon that is the *only* carrier of meaning — icon-only buttons, rail items, status indicators — uses `{colors.mute}` (4.76:1) or darker.
3. **`{colors.mute}` on `{colors.lane}` is 4.34:1.** Fine for the lane count pill, which sits on `{colors.card}`, not on the tray. Never put 12-13px `{colors.mute}` text directly on a `{colors.lane}` background; step to `{colors.body}` (7.0:1).
4. **Focus is always visible.** 3px `{colors.focus-ring}` at 2px offset on every interactive element. Never `outline: none` without a replacement.
5. **Drag-and-drop needs a keyboard path.** Cards are focusable, `Space` picks up, arrow keys move between lanes and positions, `Space` drops, `Escape` cancels — with an `aria-live` region announcing "Moved *card* to *lane*, position 2 of 8".
6. **Status is never color-only.** Every pill carries its state as text, every lane its name. A color-blind user loses no information.
7. **Icon-only controls** (`{component.icon-button}`, `{component.rail-item}`, `{component.icon-button-bare}`) require `aria-label`; decorative icons take `aria-hidden="true"`.

## Do's and Don'ts

### Do
- **Use existing components first** — import from `$lib/components/`; browse `/design-system` before writing new markup.
- Keep the working surface light. White canvas, `{colors.lane}` trays, white cards — no dark mode on the board (the dark system lives in `DESIGN.landing.md` and stays on the marketing page).
- Give a card inside a lane a shadow and **no** border; give a control on white a border and almost no shadow.
- Set every heading at 700-800 with negative tracking. Lane titles are `{typography.heading-md}` — 18px/800/-0.015em.
- Make every clickable text element a `{rounded.full}` pill.
- Let the lane's Add button take the lane's status hue, and keep `{colors.primary}` for everything else.
- Use `{component.label-bar}` strips for tags — 4px tall, `{rounded.full}`, at the very top edge of the card.
- Render metadata as muted icon + **bold dark number** (`{component.meta-stat}`).
- Ship one Hugeicons variant (`stroke-rounded`) at `strokeWidth={1.8}`, sized 16/18/20/24 only.
- Cap avatar stacks at four plus a `+N` `{component.avatar-overflow}` chip.
- Keep exactly one `{component.status-pill}` per card.

### Don't
- **Don't hand-roll UI that already exists** — no raw `<button class="rounded-full bg-primary…">`, no bespoke modals, no copy-paste card markup when `KanbanBoard`, `Dialog`, or `StatCard` covers the case.
- Don't put a border on a card that sits inside a `{colors.lane}` tray — it muddies the two-surface elevation.
- Don't use square or small-radius (0-4px) corners anywhere.
- Don't set a heading at weight 500-600 or body text at 700. The weight gap between headings and body is the system's voice.
- Don't put two solid `{colors.primary}` pills in the same fold — the eye loses the primary action.
- Don't tint a card's background by status. Status lives in pills, label bars, and the lane's dot. The card is always white.
- Don't put an icon inside a `{component.status-pill}` or `{component.badge-soft}`.
- Don't put white text on `{colors.status-progress}`, `{colors.status-done}`, or `{colors.status-idle}` — the reference does, and it fails contrast at 2.15-2.56:1. Use `{colors.ink}` labels on those fills.
- Don't use `{colors.faint}` for an icon that is the sole carrier of meaning; it is under the 3:1 non-text minimum.
- Don't mix icon families, switch to filled icons, or set stroke width above 2. A Lucide icon next to a Hugeicons icon is instantly visible.
- Don't color icons with brand indigo unless their parent is in an active state.
- Don't stretch lanes to fill the viewport — they stay 320px and the board scrolls horizontally.
- Don't put the aurora gradient behind a board, lane, or card.
- Don't use Inter (or any neutral UI grotesque) as the display face — it flattens the personality.
- Don't use a spinner for board loading; use `{colors.lane}` skeletons.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| desktop-large | 1440px+ | 64px rail + board; lanes 320px; 4-up dashboard stats |
| desktop | 1280px | Same; content max-width 1280px, 24px gutters |
| desktop-small | 1024px | Rail stays 64px; board scrolls horizontally sooner; dashboard 2-up |
| tablet | 768px | Rail → bottom tab bar (64px, 5 items max); page title `{typography.heading-lg}`; lanes 300px |
| mobile | 480px | Single lane at `calc(100vw - 32px)` with snap scrolling; view tabs → `{component.segmented-group}`; topbar → logo + hamburger |
| mobile-narrow | 360px | 12px page gutter; card padding 12px; avatar stack caps at three |

### Collapsing Strategy
- **Left rail → bottom tab bar** at tablet: 64px tall, `{colors.card}`, 1px `{colors.hairline}` top rule, `{component.rail-item-active}` tinting unchanged.
- **Board** at mobile: one lane per viewport at `scroll-snap-type: x mandatory`, with a lane-position indicator (dots in status hues) under the tab strip. Lane trays keep `{rounded.2xl}` and 16px padding.
- **View tabs → segmented control** at mobile, horizontally scrollable, active segment filled `{colors.lane}`.
- **Topbar** at mobile: logo tile + wordmark left, `Menu01Icon` right. Breadcrumbs collapse to the last crumb only. The action cluster (notification / invite / share / avatar) moves onto its own row beneath the page title as a 40px icon-button row — as in `reference/image copy 2.png`.
- **Detail drawer → full-screen sheet** at mobile, `{rounded.3xl}` top corners only, with a 4px × 40px `{colors.hairline-strong}` drag handle centered at the top.
- **Modal → bottom sheet** at mobile.

### Touch Targets
`{component.button-primary}` 40px and `{component.button-primary-lane}` 44px both clear WCAG AA. `{component.icon-button}` is 40px. `{component.icon-button-bare}` is 28px visually — pad its hit area to 40px with `-m-1.5 p-1.5` or equivalent. `{component.status-pill}` and `{component.badge-soft}` are display-only and exempt; if you make them interactive (filter-by-tag), raise them to a 36px hit area. `{component.avatar}` at 28px must be padded to 40px when clickable.

## Implementation

Tokens and utilities are already wired in the repo. **Do not paste a fresh theme block** — extend what exists.

| File | Role |
|---|---|
| `app/app.css` | Tailwind v4 entry; `@import './ds.css'` |
| `app/ds.css` | Flowboard `@theme` tokens + `[data-theme="app"]` overrides + `ds-*` typography |
| `app/lib/components/` | All Svelte components implementing this spec |
| `app/pages/design-system/` | Live showcase — reference when building pages |

### App shell setup

```svelte
<!-- In +layout.svelte for app routes -->
<script>
  import '../../ds.css';
</script>

<div data-theme="app" class="min-h-screen bg-canvas text-body">
  {@render children()}
</div>
```

### Tailwind tokens (already in `app/ds.css` `@theme`)

Key utilities resolve automatically: `bg-primary`, `bg-lane`, `bg-status-queued`, `text-ink`, `text-mute`, `border-hairline`, `rounded-card`, `rounded-lane`, `shadow-card`, `w-lane` (320px).

```css
/* Excerpt — full block lives in app/ds.css */
@theme {
  --color-primary: #4f46e5;
  --color-lane: #f1f5f9;
  --color-status-queued: #4f46e5;
  --color-status-progress: #f59e0b;
  --color-status-done: #22c55e;
  --radius-card: 16px;
  --radius-lane: 20px;
  --spacing-lane: 320px;
}
```

### Prefer components over raw markup

```svelte
<!-- ✅ Compose -->
<Button variant="primary">Export Data</Button>
<Badge tone="progress">In Progress</Badge>
<KanbanBoard {columns} />

<!-- ❌ Avoid — duplicates Button.svelte / Badge.svelte / KanbanBoard.svelte -->
<button class="rounded-full bg-primary px-5 py-2 text-on-primary">Export Data</button>
```

Reference class strings when **extending** the library (not for one-off pages):

```html
<!-- lane tray (inside KanbanBoard.svelte) -->
<div class="flex w-lane shrink-0 flex-col gap-3 rounded-lane bg-lane p-4">

<!-- task card -->
<article class="rounded-card bg-card p-3.5 shadow-card transition
                hover:-translate-y-px hover:shadow-card-hover hover:ring-1 hover:ring-ring-hover">
```

## Iteration Guide

1. **Check `/design-system` first.** Find the component that matches the spec; import and compose it.
2. Work one component at a time when **extending the library**. Pull its front-matter entry and confirm every token resolves before editing the `.svelte` file.
3. Reference tokens by name (`{colors.primary}`, `{component.task-card}`, `{rounded.xl}`) rather than raw hex, so a palette change stays a one-line edit in `app/ds.css`.
4. Before adding a color, check whether an existing status triad covers the meaning. The system is five hues total; a sixth needs a real justification.
5. Default new text to `{typography.body-sm}`; reach for `{typography.heading-md}` for any group title; reserve `{typography.display-md}` for the page title.
6. When you add an icon, add it to the verified icon map above and confirm the export exists in `@hugeicons/core-free-icons` before shipping.
7. Sanity check every new surface against one question: *is it a bordered control on white, or a shadowed card in a tray?* Those are the only two options.
8. Keep one solid `{colors.primary}` pill per fold. If a screen wants two, one of them is a `{component.button-secondary}`.
9. **After adding a component**, export it from the layer's `index.ts` and add a live demo to the matching `/design-system/*` page.

## Known Gaps

- **Font is inferred.** The reference screenshots use a commercial geometric grotesque that could not be identified with certainty; Plus Jakarta Sans is the specified free equivalent. Verify against the reference before final sign-off, and swap for Satoshi if the client owns a license.
- **Dark mode is undefined.** Every captured surface is light. A dark board variant would need a new surface ladder — do not derive it by inverting these tokens.
- **Executive dashboard charts** — `ChartCard` and `GaugeCard` exist but chart axis/legend styling is not fully specified from reference screenshots.
- **WhatsApp / automation surfaces not captured.** Conversation threads, template editors, and reminder schedule UI have no reference; icons are mapped but layout is not.
- **Drag-and-drop keyboard path** — specified in accessibility rules; `KanbanBoard` may need DnD wiring when implemented.
- **Focus-visible treatment** — implemented in components (`ring-2 ring-primary/15` on inputs); global outline is lighter than the original 3px spec.

### Implemented in component library (no longer gaps)

Forms (`Input`, `PasswordInput`, `DatePicker`, `TimePicker`, `SelectMenu`, `FormField`), file upload (`FileUploader`), tables (`DataTable`, `TableCard`), modals (`Dialog`, `Sheet`, `ConfirmDialog`), notifications (`NotificationCenter`, `AlertBanner`, `AlertInline`), and loading (`Skeleton`) — see `/design-system`.
