# Frontend architecture and decisions (Simplified for MVP Phase 1)

Purpose
This document captures frontend stack choices, component responsibilities, UX patterns, and tradeoffs for the MVP build of the Elsa-like AI marketing assistant, leveraging a SaaS starter template for rapid development.

Scope
Covers: UI framework, deployment, auth integration (via Supabase), long-running job UX, provenance UI, testing, performance considerations, and integration with common SaaS features via a starter template.

Chosen stack (MVP)
- **Next.js (React + TypeScript):** The core framework for the frontend application.
- **Vercel:** For hosting and preview deployments, offering tight integration with Next.js.
- **SaaS Starter Template (e.g., shadcn.io/template/nextjs-saas-starter):** Selected to accelerate development of common SaaS features, providing pre-built components and integration patterns.
- **Tailwind CSS + shadcn/ui (or similar):** For rapid, accessible, and customizable UI components, often included or easily integrated with starter templates.
- **Supabase JS Client:** For direct frontend interaction with Supabase Auth, Postgres, and Storage, leveraging Row-Level Security.
- **TanStack Query (React Query):** For server state management, caching, and retries.
- **Zustand or Jotai:** For lightweight local state where needed.
- **Sentry:** For frontend error monitoring.
- **Playwright (or Cypress):** For end-to-end testing.

Rationale for choices
- **Next.js:** Provides SSR/SSG/ISR tradeoffs, allowing for optimal performance and SEO for marketing pages, and robust capabilities for building a dynamic application. Its built-in API routes can also serve as lightweight proxies where custom backend logic isn't strictly necessary or already handled by Supabase Edge Functions.
- **Vercel:** Integrates tightly with Next.js for zero-config deployments and preview URLs on PRs, ensuring a smooth CI/CD pipeline.
- **SaaS Starter Template:** Significantly reduces development time by providing pre-built modules for authentication (UI aspects), user dashboards, subscription management, and other common SaaS features. This allows the team to focus on the unique ICP generation features.
- **TypeScript:** Improves maintainability, reduces runtime bugs, and enhances developer experience.

App structure (folders)
- `app/` or `pages/`: (Utilize Next.js App Router for new projects due to its modern features).
- `components/`: Shared presentational components (many from the `shadcn/ui` based starter).
- `features/`: Domain-specific feature folders (e.g., `icp-generator`, `billing`, `auth`).
- `lib/`: Supabase client, API clients, utility wrappers.
- `hooks/`: Reusable React hooks.
- `styles/`: Global styles and design tokens.

Authentication & Authorization
- **Supabase Auth:** The primary backend for user identity and session management. The frontend hooks will integrate with Supabase JS client.
- **Frontend UI from Starter:** Leverage the starter template's pre-built UI components for sign-up, login, password reset, and user profile management.
- **Secure session management:** Use HTTP-only cookies for auth tokens; refresh on the server-side as supported by Supabase.
- **Role-based UI:** Frontend enforces display logic based on user roles and permissions retrieved from Supabase.

UI flows & components (augmented by SaaS Starter)
- **Landing & marketing pages:** SSR for SEO & social previews, can be part of the starter.
- **Dashboard:** Client-side rendered for responsiveness, enhanced by starter's layouts and common widgets.
- **Project page:** Seed inputs, generate button, history of ICP reports.
- **Generation status:** Real-time progress UI (queued, scraping, indexing, generating, ready), potentially using Supabase Realtime for push updates.
- **Provenance panel:** List sources with remove/edit controls and preview snippet.
- **Subscription & Billing:** Leveraging starter template's pre-built payment pages (integrated with Stripe) and extending them for Razorpay and currency conversion using an adapter pattern.

Data fetching & caching
- **TanStack Query:** Used for server state with caching, background refresh, and retries, simplifying data synchronization with Supabase Postgres.
- **Optimistic updates:** For small edits (e.g., renaming projects) to improve perceived performance.
- **Stale-while-revalidate patterns:** For public content and lists.

Long-running jobs UX
- Submit generation request and show immediate queued state with ETA estimate.
- Show detailed progress steps and percentage where available from Supabase Function workers.
- **Supabase Realtime / Polling:** Use Supabase's Realtime subscriptions or polling from Edge Functions for push notifications when jobs complete.
- Notify via email (using an integrated email service) and in-app notifications.

Provenance UI details
- Show source list with URL, domain, retrieval score, and snippet preview.
- Highlight matched text within snippets and show confidence/score.
- Allow user to exclude a source, add custom sources, or attach private docs.
- Changes to sources should re-trigger a re-run or flag the report as stale.

PDF export UI
- Preview the formatted report in a modal before download.
- Allow toggling inclusion of source snippets and append user notes.
- Support shareable links with access control (tokenized URLs or Auth gating via Supabase).

Accessibility & responsive design
- Mobile-first layout and responsive components, often provided by starter templates.
- Aim for WCAG AA compliance on critical user flows (signup, generate, review).
- Keyboard navigation, ARIA labels, and screen-reader-friendly markup.

Performance
- Initial JavaScript bundle small; use code-splitting and lazy loading.
- Target initial interactive time under 1s on desktop and under 2s on mid-tier mobile.
- Use Vercel image optimization and CDN for static assets.
- PDF generation and heavy fetches deferred to Supabase Functions (workers).

Offline & low-bandwidth considerations
- Cache lightweight preview content for recently viewed reports.
- Allow PDF downloads for offline reading and sharing.
- Provide compact UI options for low-bandwidth users.

Security in frontend
- Sanitize and escape any HTML returned from scraped sources before rendering.
- Apply a strict Content Security Policy (CSP) to prevent XSS.
- Sensitive API keys are handled server-side within Supabase Edge Functions/Functions, not exposed in the client.

Testing strategy
- Unit tests (Jest, React Testing Library) for components and hooks.
- Integration tests for key flows (auth, project listing, source editing).
- End-to-end tests (Playwright) to cover signup, generate, payment flows and PDF export.

Observability & error handling
- **Sentry:** Capture exceptions and context (user action, project id, trace id).
- Track web vitals (CLS, LCP, FID) and custom client metrics.
- Use client-side logs to correlate with Supabase Function/Edge Function traces (OpenTelemetry).

Internationalization & localization
- Plan for i18n using `next-intl` or `react-intl`; starter templates may include this.
- Currency and date formatting for INR and USD; detect locale from user preferences.

Developer experience
- Local dev: `next dev` with Supabase local development tools (`supabase start`), mocking LLM responses as needed.
- Pre-commit: lint-staged, ESLint, Prettier, and type checks in CI.
- Component-driven development: Storybook for visual regression and component documentation.

Deployment & hosting
- **Vercel:** Fully integrated deployment for the Next.js frontend with preview URLs.
- Environment variables managed in Vercel or Supabase Secrets (for Supabase connection).

Third-party integrations
- **Payments:** Stripe Elements and Razorpay for INR/UPI flows, with an adapter pattern for seamless integration and future flexibility. Starter templates usually have Stripe built-in.
- **Analytics:** GA4 and Segment for event routing, easily integrated client-side.
- **Emails:** Transactional emails integrated via a service like Resend (often part of SaaS starters), with an adapter for flexibility.
- **Tag Manager & Metapixel:** Client-side script integration.
- **Affiliate marketing:** Integrated via client-side scripts or API calls.

Security & privacy notes (frontend focus)
- Minimize local PII storage; rely on Supabase for session management and data persistence.
- Provide clear consent prompts for tracking and optional anonymous usage.

Acceptance criteria (frontend)
- Public marketing pages render server-side with correct metadata.
- Auth flow (signup, verify, login, logout) works end-to-end with Supabase.
- User can initiate an ICP generation and see progress and final report with provenance.
- PDF export renders correctly and includes selected sources.
- Subscription and payment flows work correctly for both Stripe and Razorpay.

Next steps
- Implement boilerplate from selected SaaS starter template.
- Wire Supabase Auth, basic project CRUD using Supabase JS client and RLS.
- Implement generate job UI and provenance panel; connect to Supabase Functions.

References
- [`docs/archDecisions/requirements.md`](docs/archDecisions/requirements.md:1)
- [`docs/archDecisions/mvp.md`](docs/archDecisions/mvp.md:1)
- [`docs/Ideal customer profile Nomad Foundr.pdf`](docs/Ideal customer profile Nomad Foundr.pdf:1)
- [`docs/archDecisions/architecture.md`](docs/archDecisions/architecture.md:1)

Owner: Roo (architect)
Last updated: 2025-10-25