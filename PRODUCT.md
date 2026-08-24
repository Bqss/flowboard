# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary landing audience is the owner or operations leader responsible for a customer-onboarding team. Staff are the secondary audience: they execute assigned customer cards, checklists, follow-ups, and handovers. Customers are records moving through workflows and do not log into the board. A platform admin operates Flowboard itself, separately from workspace owners.

## Product Purpose

Flowboard is a customer onboarding management system for teams that need every customer journey to move through a visible, repeatable process. It turns a workflow into stages, a customer into a card, and required work into a checklist. Success means the owner can see what is stuck and staff can act on the next step without reconstructing status from private notes or chat history.

## Positioning

Flowboard is an operations tracker for customer journeys, not a generic project board, sales CRM, or cross-app workflow builder. Its distinct mechanism is the combination of a workflow-scoped customer card, required checklist gates, staff reminders, and customer-facing WhatsApp actions with lightweight handover.

## Operating Context

Teams manage journeys such as webinar registration, post-product follow-up, booking, and VIP onboarding. An owner defines the workflow and assigns staff. Staff work cards through stages, complete checklists, respond to waiting actions, and receive handovers. Customers receive scheduled messages and replies can notify the assigned staff member. Customers may have multiple cards running in parallel across workflows.

## Capabilities and Constraints

- Workspace-based access with owner and member roles.
- Workflow, stage, customer card, checklist, assignee, reminder, notification, and handover concepts.
- Customer intake through manual entry, CSV, API/MCP, and workflow handoff.
- Manual workflow setup and AI-assisted workflow drafting, followed by owner editing.
- WhatsApp actions are template-based and stage-scoped; live chat-agent behavior is outside the current product boundary.
- The web app runs on Bun, Elysia, SvelteKit, Drizzle, and PostgreSQL.
- The landing page is a persuasion surface with English copy, a primary Start free action, and a user-controlled light/dark theme.
- Marketing claims are allowed by user direction, but fabricated testimonials, customer logos, benchmarks, and proof assets are not present in the repository and must not be represented as real evidence.

## Brand Commitments

- Product name: Flowboard.
- Landing language: English.
- Voice: direct, operational, confident, and specific; avoid generic developer-tool or AI hype language.
- The landing must make customer operations feel concrete through real product mechanisms and synthetic interface demonstrations.

## Evidence on Hand

- Product analysis: `docs/APP.md`.
- Product plan and decisions: `docs/PLAN.md`.
- Feature scope: `docs/FEATURES.md`.
- Kanban and setup behavior: `docs/KANBAN.md` and `docs/SETUP.md`.
- Existing authenticated product routes under `app/pages/dashboard/`.
- Existing design references under `reference/`.
- No confirmed customer testimonials, logos, case studies, or performance benchmarks supplied.

## Product Principles

1. Make the next customer action visible.
2. Keep the customer journey and its required work in one card context.
3. Standardize execution without taking control away from staff.
4. Let owners monitor the system instead of chasing status manually.
5. Automate customer communication while preserving human handover.

## Accessibility & Inclusion

The landing is a responsive web surface. Preserve keyboard access, visible focus, readable contrast in both themes, labeled controls, reduced-motion support, and touch targets appropriate for mobile visitors.
