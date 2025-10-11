# Frontend architecture and decisions

Purpose
This document captures frontend stack choices, component responsibilities, UX patterns, and tradeoffs for the MVP build of the Elsa-like AI marketing assistant.

Scope
Covers: UI framework, deployment, auth integration, long-running job UX, provenance UI, testing, and performance considerations.

Chosen stack (MVP)
- Next.js (React + TypeScript)
- Vercel for hosting and preview deployments
- Tailwind CSS + Headless UI for rapid, accessible components
- TanStack Query (React Query) for server state, caching and retries
- Zustand or Jotai for lightweight local state where needed
- Sentry for frontend error monitoring
- Playwright (or Cypress) for end-to-end testing

Rationale for choices
- Next.js provides SSR/SSG/ISR tradeoffs and built-in API routes which speed up implementation and SEO for marketing pages.
- Vercel integrates tightly with Next.js for zero-config deployments and preview URLs on PRs.
- TypeScript improves maintainability and reduces runtime bugs.

App structure (folders)
- app/ or pages/ (use Next.js app router for new projects)
- components/ (shared presentational components)
- features/ (domain-specific feature folders, e.g., icp-generator)
- lib/ (API clients, wrappers)
- hooks/ (reusable hooks)
- styles/ (global and design tokens)
- pages/api/ or app/api/ (server routes)

Authentication & Authorization
- Integrate Supabase Auth for email/password and social SSO (optional).
- Use secure session cookies (httpOnly) for auth tokens; refresh on the server.
- Frontend enforces role-based UI (user, admin, support) and permission checks.

UI flows & components
- Landing & marketing pages: SSR for SEO and social previews.
- Dashboard: client-side rendered after authentication for responsiveness.
- Project page: seed inputs, generate button, history of ICP reports.
- Generation status: real-time progress UI (queued, scraping, indexing, generating, ready).
- Provenance panel: list sources with remove/edit controls and preview snippet.

Data fetching & caching
- Use TanStack Query for server state with caching, background refresh and retries.
- Implement optimistic updates for small edits (e.g., renaming projects).
- Cache retrieval results and embedding metadata; invalidate when user adjusts inputs or adds sources.
- Stale-while-revalidate patterns for public content and lists.

Long-running jobs UX
- Submit generation request and show immediate queued state with ETA estimate.
- Show detailed progress steps and percentage where available.
- Use server-sent events (SSE) or WebSockets for push updates; fallback to polling.
- Notify via email and in-app notifications when jobs complete.

Provenance UI details
- Show source list with URL, domain, retrieval score, and snippet preview.
- Highlight matched text within snippets and show confidence/score.
- Allow user to exclude a source, add custom sources, or attach private docs.
- Changes to sources should re-trigger a re-run or flag the report as stale.

PDF export UI
- Preview the formatted report in a modal before download.
- Allow toggling inclusion of source snippets and append user notes.
- Support shareable links with access control (tokenized URLs or auth gating).

Accessibility & responsive design
- Mobile-first layout and responsive components; ensure touch targets and legible font sizes.
- Aim for WCAG AA compliance on critical user flows (signup, generate, review).
- Keyboard navigation, ARIA labels, and screen-reader-friendly markup for provenance lists and PDFs.

Performance
- Keep initial JavaScript bundle small; use code-splitting and lazy loading for heavy components.
- Target initial interactive time under 1s on desktop and under 2s on mid-tier mobile.
- Use Vercel image optimization and CDN for static assets.
- Defer PDF generation and heavy fetches to background workers.

Offline & low-bandwidth considerations
- Cache lightweight preview content for recently viewed reports.
- Allow PDF downloads for offline reading and sharing.
- Provide compact UI options (e.g., minimal view) for low-bandwidth users.

Security in frontend
- Sanitize and escape any HTML returned from scraped sources before rendering.
- Apply a strict Content Security Policy (CSP) to prevent XSS.
- Avoid storing API keys in client code; use server-side proxy for provider calls.

Testing strategy
- Unit tests with Jest and React Testing Library for components and hooks.
- Integration tests for key flows (auth, report listing, source editing).
- End-to-end tests with Playwright to cover signup, generate, payment flows and PDF export.

Observability & error handling
- Capture exceptions and context with Sentry (user action, project id, trace id).
- Track web vitals (CLS, LCP, FID) and custom client metrics (time-to-generate).
- Use client-side logs to correlate with backend job traces (OpenTelemetry).

Internationalization & localization
- Plan for i18n using next-intl or react-intl; prepare message catalogs from day one.
- Currency and date formatting for INR and USD; detect locale from user preferences.

Developer experience
- Local dev: next dev with environment variables in .env.local; mock LLM responses for offline development.
- Pre-commit: lint-staged, ESLint, Prettier, and type checks in CI.
- Component-driven development: Storybook for visual regression and component documentation.

Deployment & hosting
- Vercel for frontend deployments with preview URLs per PR.
- Environment variables managed in Vercel; secrets in Vercel + Supabase secret storage.
- Use Vercel Edge or serverless functions for low-latency auth checks if needed.

Progressive enhancements for scaling
- Move SSR to edge functions for faster TTI in target regions.
- Use Next.js server components for heavy server-side data fetches.
- Implement feature flags and experiment frameworks for A/B tests.

Tradeoffs & alternatives
- Next.js vs SPA: Next.js chosen for SEO and integrated server routes; SPA could simplify client logic but lose SEO benefits.
- State management: prefer lightweight libraries (Zustand) over Redux to reduce boilerplate and bundle size.
- Hosting: Vercel reduces ops but may be more costly at scale compared to self-managed infra.

Third-party integrations
- Analytics: GA4 and Segment for event routing.
- Customer chat and support (deferred): Intercom or Crisp.
- Payments: Integrate Stripe Elements for card payments and Razorpay for INR/UPI flows.

Security & privacy notes (frontend focus)
- Minimize local PII storage; prefer server-side session management.
- Provide clear consent prompts for tracking and optional anonymous usage.

Acceptance criteria (frontend)
- Public marketing pages render server-side with correct metadata.
- Auth flow (signup, verify, login, logout) works end-to-end with Supabase.
- User can initiate an ICP generation and see progress and final report with provenance.
- PDF export renders correctly and includes selected sources.

Next steps
- Implement component scaffolding and Storybook.
- Wire Supabase Auth, basic project CRUD, and TanStack Query integration.
- Implement generate job UI and provenance panel; connect to worker queue.

References
- [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)