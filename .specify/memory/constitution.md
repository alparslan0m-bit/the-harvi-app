# Harvi Gamed — Specification Constitution

This constitution defines the engineering principles, workflow rules, quality gates, and governance that guide feature design and implementation for the Harvi Gamed codebase. It applies to all repositories and artifacts produced by the team, with special attention to the mobile Expo app, TypeScript libraries, and Supabase serverless functions found in this workspace.

The app is already ~85% complete by the original author; this constitution is intended to help bring the remaining work to a 100% mastery level in architecture, UI, performance, security, and product quality.

## Core Principles

I. Library-First: Prefer small, testable modules with well-defined public interfaces. New features should start as isolated modules where practical and evolve into integrated components only when stable.

II. Type Safety & Explicit Contracts: Use TypeScript types and shared schemas for cross-boundary contracts (client ↔ server, local storage, Supabase). Changes to public types require migration notes and tests.

III. Test-First and Verified Behavior: Critical logic and public APIs must have unit tests. Integration tests required for inter-service flows (mobile ↔ backend, payment/webhook flows). Tests are part of the definition of done.

IV. CI Gates & Deterministic Builds: All PRs must pass linting, typechecks, unit tests, and baseline integration checks before merge. Reproducible builds and pinned dependency manifests are required for releases.

V. Observability & Privacy by Design: Emit structured, searchable logs and metrics for key flows (auth, purchases, sync). Protect PII and follow least-privilege for secrets and DB access (see Supabase policies in `supabase/migrations`).

## Architecture

- Modular by design: Separate concerns into domain-specific layers and reusable hooks, components, and services. Core features live in `artifacts/mobile/components`, `artifacts/mobile/hooks`, and `supabase/functions` to keep boundaries explicit.
- Maintainable structure: Keep feature logic close to its UI surface while centralizing shared utilities and business rules in `lib/`, `hooks/`, and `utils/`. Use clear naming and consistent folder patterns to reduce cognitive load.
- Mobile-first native UX: Build the app with native-like performance, fluid layout, and polished visual hierarchy. Prioritize responsive screen design, touch-friendly controls, and platform-consistent navigation in `artifacts/mobile`.
- Scalable implementation: Design for growth by keeping feature modules independent, using composition over inheritance, and protecting cross-cutting concerns with well-defined interfaces.
- Contract-first integration: Prefer explicit TypeScript contracts for data, API requests, and storage state. Shared types and domain models enable safe refactors and easier onboarding.
- Resilient state and sync: Encapsulate offline sync, purchase state, and progress tracking in dedicated services/hook abstractions so app logic remains predictable as the platform scales.

## Technology Constraints & Stack

- Primary language: TypeScript (mono-repo). Build and config files live at workspace root and under `artifacts/mobile`.
- Mobile: Expo-managed React Native app. Follow Expo and Metro constraints; keep platform-specific behavior isolated under `artifacts/mobile`.
- Architecture: Serverless app layer with Supabase backend. App logic is hosted client-side in the Expo mobile app, while backend responsibilities use Supabase edge functions, database, and auth.
- Backend: Supabase Edge Functions in `supabase/functions` for payments and verification flows; follow secure webhook handling and idempotency patterns.
- Tooling: Use pnpm workspace, ESLint, Prettier, and the project's tsconfig conventions. Maintain `pnpm-lock.yaml` as source of truth.
- Performance & Security: Design for low-latency response, minimal bundle size, and secure serverless execution. Enforce strong authentication, RLS, input validation, and least-privilege access patterns.

## Features

- **Authentication & Profiles**: Email/social auth, session management, profile editing and avatar, backed by Supabase auth and `artifacts/mobile/context/AuthContext.tsx`.
- **Learning Content**: year , Module , subject and lecture browsing, lecture detail screens, and learn flow components under `artifacts/mobile/app/(tabs)/(learn)` and `artifacts/mobile/components/learn`.
- **Quiz System**: per-lecture quizzes, question caching implemented in `artifacts/mobile/app/quiz` and `lib/questionCache.ts` with session logic in `hooks/useQuizSession.ts`.
- **Purchases & Entitlements**: In-app purchase flow, checkout creation, webhook handling, and server-side verification implemented across `artifacts/mobile/app/purchase`, `supabase/functions/create-checkout`, `supabase/functions/payment-webhook`, and `supabase/functions/verify-purchase`.
- **Progress & Mastery**: Track progress, mastery calculations, and stats surfaced in `artifacts/mobile/app/stats` and `hooks/useStats.ts` / `hooks/useProgress.ts`.
- **Offline-First Sync**: Offline queueing, retry, and conflict resolution via `lib/offlineQueue.ts` and sync coordination in `hooks/useSyncSession.ts`.
- **UI & Design Quality**: Deliver a polished mobile-native experience with consistent layout, spacing, and typography across screens. Reuse expressive UI primitives from `artifacts/mobile/components/ui`, quality presentation components like `LearnHeader` and `LectureCard`, and maintain readable mobile-first screen structure.
- ** Feedback**: Event tracking, user feedback flows, and animation-driven results (`hooks/useFeedback.ts`, `useQuizResultsAnimation.ts`).

## Business Logic

- **Access Control & Entitlements**: Module access gated by purchase/subscription state. Checks performed in `hooks/useModuleAccess.ts` and enforced server-side via Supabase RLS policies.
- **Purchase Verification & Idempotency**: Payments are created client-side, confirmed server-side via `verify-purchase`, and reconciled from webhooks; all webhook handlers must be idempotent and validate provider signatures.
- **Entitlement Propagation**: Successful purchases update authoritative records in Supabase and propagate to local caches; sync session guarantees eventual consistency across devices.
- **Offline Queue Semantics**: Preserve operation order for dependent actions (purchase → entitlement) and implement exponential backoff with bounded retries; ensure idempotency where necessary.
- **Data Retention & Privacy**: Purge analytics logs and PII according to retention policy; anonymize analytics for aggregated metrics.
- **Billing Reconciliation & Refunds**: Reconcile payment provider reports with internal state; implement manual and automated refund handling workflows in `supabase/functions/payment-webhook`.

## Development Workflow

- Branching: Feature branches off `main` named `feature/<short-desc>` or `fix/<ticket>`. PRs target `main` with descriptive titles and linked issues.
- PR Requirements: Description, testing notes, changelog entry when applicable, and at least one approving review from a senior engineer for non-trivial changes.
- CI Requirements: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` (TS typecheck), `pnpm test`. Mobile-only changes must include a smoke test on the Expo app where feasible.

## Quality & Testing

- Unit Tests: Cover core business logic with clear Arrange-Act-Assert structure.
- Integration Tests: Verify Supabase function flows, payment/webhook handling, and client-server contracts. Use recorded or mocked external integrations for CI.
- End-to-End: Reserved for high-risk payment and purchase flows; run periodically and for releases.
- Code Style: Enforce ESLint rules and Prettier formatting. Type `any` is discouraged and must be approved with justification.

## Security, Secrets & Data Handling

- Secrets: Store secrets in secure environment (EAS secrets, CI vault). Never commit secrets or service keys.
- Data Minimization: Collect only needed fields; treat user identifiers and payment tokens as sensitive data.
- Access Controls: Follow Supabase RLS policies; changes must include policy migration notes and tests (see `supabase/migrations`).

## Serverless Security

- Edge-first defense: Protect Supabase edge functions with strong authentication, authorization checks, and input validation at the serverless boundary.
- Least privilege: Grant the minimum database and storage permissions required by each function, and avoid broad access scopes.
- Rate limiting & abuse protection: Design serverless endpoints to detect and reject abusive traffic patterns, and fail safely under load.
- Secure configuration: Keep runtime secrets, env vars, and provider keys in vault-backed stores only; do not expose them in code or client bundles.

## Versioning & Releases

- Versioning: Semantic versioning for public packages. For app releases, maintain clear release notes and migration guidance when needed.
- Releases: Tag release commits; include CI artifacts (bundles, sourcemaps) and changelog summarizing user-facing changes.

## Governance & Amendments

- Constitution Changes: Amendments require a documented proposal, approval from two maintainers, and a migration plan if the change affects runtime behavior.
- Enforcement: PR reviewers verify constitution compliance. Non-compliant PRs must include explicit risk acceptance and a mitigation plan.

## Onboarding & Documentation

- Documentation: Keep architecture notes, runbooks, and module READMEs next to code. Key locations: `artifacts/mobile/`, `supabase/`, and top-level `README.md`.
- Onboarding: New contributors should run the local setup script (see `scripts/`) and complete a short walkthrough: build, run tests, and open the mobile app sandbox.

## Contacts

- Maintainers: core team members listed in repository `OWNERS` or `package.json` maintainers field.
- Escalation: For security incidents or production regressions, follow the incident runbook in `README.md` and notify on-call via team channel.

**Version**: 1.0.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
