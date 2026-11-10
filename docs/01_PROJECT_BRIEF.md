# VOWS Studio — Project Brief

> **Document Version:** 1.0  
> **Status:** Draft  
> **Prepared By:** System Architect  
> **Date:** 2026-11-09  
> **Classification:** Internal — Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Target Users & Relationships](#3-target-users--relationships)
4. [Project Scope](#4-project-scope)
5. [Technology Stack](#5-technology-stack)
6. [Key Design Principles](#6-key-design-principles)
7. [Success Criteria](#7-success-criteria)
8. [Constraints & Risks](#8-constraints--risks)
9. [Future Portfolio Consideration](#9-future-portfolio-consideration)
10. [Project Phases Overview](#10-project-phases-overview)

---

## 1. Executive Summary

VOWS Studio is a Karnataka-based photography and videography studio that requires a bespoke, full-stack business management platform to replace fragmented spreadsheets, manual PDF invoices, WhatsApp-based communication, and ad-hoc booking coordination. The platform — referred to throughout as **VOWS Studio Platform** — is a single-tenant, invitation-only web application that centralises every operational concern of a creative studio: lead capture, client management, quotation generation, event bookings, crew scheduling, payment tracking, expense ledgering, and media delivery pipeline management.

The platform additionally exposes a **public-facing website** for brand presence, portfolio display, and inbound enquiry capture, ensuring that the internal back-office and the client-facing front door are managed from a single unified codebase and content system.

Built on a modern, maintainable stack (Next.js, Supabase, TypeScript, Tailwind CSS, Vercel), the platform is designed to be robust enough for day-to-day business operations, clean enough to serve as a **portfolio demonstration** for the developer/System Administrator, and extensible enough to support future requirements such as GST invoicing, multi-currency, and advanced analytics.

---

## 2. Business Objectives

| # | Objective | Measurable Outcome |
|---|---|---|
| BO-01 | Eliminate manual, error-prone quotation and invoice creation | 100% of quotes and invoices generated within the platform; zero manual PDF edits |
| BO-02 | Centralise client and enquiry management | All inbound enquiries logged within the platform; follow-up reminders visible on dashboard |
| BO-03 | Provide real-time financial visibility | P&L and revenue reports accessible without external spreadsheets |
| BO-04 | Streamline crew scheduling and pay tracking | Crew assignments, attendance, and payment records stored and queryable in one place |
| BO-05 | Manage the full delivery lifecycle | Each booking's deliverables tracked through a 9-stage pipeline with status visibility |
| BO-06 | Establish a professional public brand presence | Public website with portfolio, pricing, and enquiry form live and SEO-indexed |
| BO-07 | Support regulatory readiness | Platform architecture accommodates GST invoicing with zero structural rework |
| BO-08 | Reduce communication overhead | Gmail integration enables document delivery (quotes, invoices, receipts) directly from the platform |

---

## 3. Target Users & Relationships

### 3.1 Role Hierarchy

```
System Administrator (SysAdmin)
│
│  Controls platform configuration, user management,
│  technical settings, and all data.
│
└──► Business Owner
        │
        │  Operates the business — manages clients,
        │  bookings, finances, crew, and delivery.
        │
        ├──► Manager
        │       Manages day-to-day operations, crew,
        │       and bookings. Limited financial access.
        │
        ├──► Accountant
        │       Read/write access to financial modules.
        │       No crew or booking creation.
        │
        ├──► Staff
        │       Limited operational access.
        │       Can log activities, view assigned work.
        │
        └──► Crew Member
                View-only access to their own assignments
                and schedule. Cannot access financials.
```

### 3.2 Role Descriptions

| Role | Description | Key Permissions |
|---|---|---|
| **System Administrator** | Technical owner; likely the developer. Has unrestricted access to every module, configuration panel, and raw data. Manages user accounts and platform settings. | Full CRUD on all resources; role assignment; system configuration |
| **Business Owner** | The studio proprietor. Operates the platform day-to-day. Has full access to all business modules but cannot access technical/system configuration panels reserved for SysAdmin. | Full CRUD on business modules; financial access; crew management |
| **Manager** | Senior operational staff. Can manage bookings, crew assignments, and client communication. No access to financial reports or sensitive payment data. | Bookings, crew, delivery; no ledger/expenses |
| **Accountant** | Finance-focused role. Can view and manage invoices, payments, and expense records. Cannot create or modify bookings or crew. | Invoices, payments, ledger, expenses; read-only bookings |
| **Staff** | General studio employee. Can log activities, view their schedule, and update delivery stages they are assigned to. | Limited operational actions; no financial data |
| **Crew Member** | Freelance or contracted crew. Can view their own bookings, assigned events, and schedules. Cannot access any other data. | Read-only: own assignments only |

### 3.3 System Administrator — Business Owner Relationship

The System Administrator **is** the developer/builder of this platform. This person maintains the technical infrastructure, manages Supabase, Vercel deployments, environment secrets, and platform-level configurations. The Business Owner is the primary day-to-day operator. The two roles may be held by the same person during early operation but are architecturally separated to support handing off operations cleanly. The SysAdmin role **cannot** be self-assigned or escalated to by any other user — it is seeded at database initialisation.

---

## 4. Project Scope

### 4.1 In-Scope

| # | Module / Feature |
|---|---|
| S-01 | Dashboard with KPIs, revenue charts, booking counts, enquiry pipeline |
| S-02 | Client & Enquiry management (profiles, follow-ups, activity history) |
| S-03 | Quotations (templates, versioning, PDF generation, Gmail delivery, status workflow) |
| S-04 | Bookings & Events (multi-event bookings, crew assignments, schedules) |
| S-05 | Invoices & Payments (partial payments, PDF, Gmail delivery, receipts) |
| S-06 | Ledger & Expenses (income, expenses, P&L, reports) |
| S-07 | Crew Management (profiles, assignments, availability, pay tracking) |
| S-08 | Service Catalogue (packages, line items, pricing, historical preservation) |
| S-09 | Delivery Management (9-stage production pipeline per booking) |
| S-10 | Settings & Configuration (business profile, branding, templates, integrations) |
| S-11 | Gmail Integration (OAuth 2.0, transactional email from platform) |
| S-12 | Public Website (portfolio, services, reviews, SEO, enquiry form) |
| S-13 | Feedback & Reviews (collection, moderation, testimonials) |
| S-14 | Role-Based Access Control (RBAC) with Supabase RLS |
| S-15 | Supabase Auth with MFA (mandatory SysAdmin, optional others) |
| S-16 | Audit logging (all create/update/delete actions) |
| S-17 | GST-ready data model and UI scaffolding (not activated by default) |
| S-18 | Mobile-responsive UI across all modules |
| S-19 | PDF generation for quotations, invoices, and receipts |
| S-20 | Document numbering system (sequential, year-prefixed) |

### 4.2 Out-of-Scope (Explicitly Excluded)

| # | Excluded Feature | Rationale |
|---|---|---|
| OS-01 | Multi-tenant / SaaS architecture | Single-business application; no customer isolation needed |
| OS-02 | Public user registration | Invite-only; all accounts provisioned by SysAdmin |
| OS-03 | Native mobile applications (iOS/Android) | Web-first; responsive PWA approach sufficient |
| OS-04 | Payment gateway integration (Razorpay, Stripe, etc.) | Payment recording is manual; gateway integration is a future phase |
| OS-05 | SMS/WhatsApp notifications | Email (Gmail) is the primary channel; SMS is a future consideration |
| OS-06 | Real-time collaboration (concurrent editing) | Not required; single-user-at-a-time operation assumed |
| OS-07 | Advanced machine learning or AI features | Not in scope for initial release |
| OS-08 | Inventory / equipment management | Out of scope for V1 |
| OS-09 | HR / payroll integration | Crew pay is tracked manually in-platform; no payroll export |
| OS-10 | Multi-currency support | INR only for V1; architecture must not block future addition |
| OS-11 | Third-party CRM integration | Platform is self-contained |
| OS-12 | E-commerce / online booking payments | Enquiry capture only; no self-service checkout |

---

## 5. Technology Stack

### 5.1 Stack Summary

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend Framework** | Next.js App Router | v14+ — Server Components, RSC streaming |
| **UI Language** | TypeScript | Strict mode; no `any` without justification |
| **Styling** | Tailwind CSS | v3+; design tokens via CSS variables |
| **Component Library** | shadcn/ui (Radix UI primitives) | Accessible, unstyled baseline |
| **Form Validation** | Zod + React Hook Form | Schema-first validation shared between client and server |
| **Backend / Database** | Supabase (PostgreSQL) | Managed Postgres; RLS enforced at DB layer |
| **Authentication** | Supabase Auth | Email/password + TOTP MFA; no OAuth for internal users |
| **Storage** | Supabase Storage | Portfolios, PDF uploads, branding assets |
| **Email Integration** | Google Gmail API (OAuth 2.0) | Transactional document delivery |
| **PDF Generation** | React-PDF / Puppeteer (server-side) | Rendered server-side via API route or Edge Function |
| **Deployment** | Vercel | Edge-optimised; preview environments per PR |
| **Source Control** | GitHub | Branch protection; PR-based workflow |
| **Linting / Formatting** | ESLint + Prettier | Enforced in CI |

### 5.2 Stack Justifications

- **Next.js App Router**: Server Components eliminate unnecessary client-side JS bundles; built-in API routes remove the need for a separate backend service. RSC streaming enables fast time-to-first-byte for data-heavy dashboard pages.
- **Supabase**: Provides PostgreSQL (with full SQL power), Row Level Security (database-enforced authorization), Auth, Storage, and Realtime — all managed, reducing operational burden significantly. Avoids the need to build and maintain a separate auth service.
- **TypeScript strict mode**: Prevents entire classes of runtime bugs at compile time. Shared Zod schemas between form validation and API I/O ensure end-to-end type safety.
- **Tailwind CSS + shadcn/ui**: Utility-first styling with accessible component primitives. Avoids heavy UI framework lock-in; components are copy-pasted into the project and owned, not consumed as a black-box library.
- **Vercel**: Zero-config deployment for Next.js; preview URLs for every PR enable easy stakeholder review; Edge Network reduces latency for Karnataka-based users.
- **Gmail API**: Business Owner already uses Gmail; native integration avoids external SMTP services and ensures sent emails appear in the studio's Sent folder.

---

## 6. Key Design Principles

### 6.1 Security-First

- **Database-level authorization**: Supabase Row Level Security (RLS) is the authoritative access control layer. API-level checks are a secondary defence, never the primary gate.
- **No self-elevation**: No user can assign themselves a higher privilege role. Only SysAdmin can modify roles.
- **Secrets in environment variables**: No credentials in source code or client-side bundles.
- **MFA mandatory for SysAdmin**: The highest-privilege account requires TOTP multi-factor authentication unconditionally.
- **Audit trail**: Every mutation (create, update, delete) is logged with actor identity, timestamp, and before/after snapshots for sensitive financial records.

### 6.2 Configurable

- Business profile, branding (logo, colours, letterhead), email templates, document prefixes, and service catalogue are all runtime-configurable by the Business Owner without code changes.
- GST settings are pre-modelled in the database and can be activated by toggling a configuration flag.
- Document numbering sequences are configurable (prefix, year format, padding).

### 6.3 Maintainable

- Strict TypeScript, ESLint, and Prettier enforced in CI.
- Modular folder structure by domain (e.g., `app/(dashboard)/bookings/`, `lib/db/`, `lib/services/`).
- Shared Zod schemas as the single source of truth for data shapes.
- Database migrations managed via Supabase CLI with version control.
- No magic strings — constants and enums are centralised.

### 6.4 Performant & Accessible

- Server Components for data-heavy pages; Client Components only where interactivity requires it.
- Images served via Next.js Image Optimization and Supabase CDN.
- WCAG 2.1 AA compliance target for all UI components (leveraged through Radix UI primitives).
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1.

### 6.5 Data Integrity

- **Integer arithmetic for all monetary values**: All amounts stored as integer paisa (1 INR = 100 paisa) to eliminate floating-point rounding errors. Display-layer only performs division for rendering.
- **Immutable financial records**: Paid invoices cannot be edited; a credit note workflow must be followed instead.
- **Historical pricing preservation**: Service catalogue entries used in past quotations/bookings are never modified in-place; a versioning mechanism preserves historical line-item data.

---

## 7. Success Criteria

| # | Criterion | Measurement |
|---|---|---|
| SC-01 | All 13 modules are functional and deployable | QA sign-off on acceptance criteria for each module |
| SC-02 | Zero floating-point errors in financial calculations | Unit test suite with 100% coverage on arithmetic utilities |
| SC-03 | RLS policies correctly enforce role permissions | Automated Supabase RLS test suite passes |
| SC-04 | PDF generation produces correctly branded documents | Visual regression tests for quote, invoice, receipt PDFs |
| SC-05 | Gmail integration sends documents successfully | Integration test with Gmail sandbox account |
| SC-06 | Public website achieves Lighthouse SEO score ≥ 90 | Lighthouse CI in deployment pipeline |
| SC-07 | Mobile responsiveness on 375px viewport | Manual QA on Chrome DevTools mobile presets |
| SC-08 | SysAdmin MFA cannot be bypassed | Security test: attempt login without TOTP |
| SC-09 | Audit log captures all mutations | Automated test: perform CRUD actions, verify audit records |
| SC-10 | Platform performs acceptably on Vercel free/pro tier | Dashboard loads in < 3s on 4G connection |

---

## 8. Constraints & Risks

### 8.1 Constraints

| # | Constraint |
|---|---|
| C-01 | INR currency only (no multi-currency in V1) |
| C-02 | Single business entity; no multi-tenancy |
| C-03 | No self-service user registration; invite-only |
| C-04 | Gmail API daily sending quotas apply (standard: 1 billion messages/day for workspace, 100/day for personal — verify at deployment) |
| C-05 | Supabase free tier has row limits and storage quotas; production should use Pro plan |
| C-06 | Vercel serverless function execution timeout (default 10s; PDF generation may require increased limits or background jobs) |
| C-07 | GDPR/IT Act compliance: client personal data must be handled with appropriate retention and deletion policies |

### 8.2 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Gmail OAuth token expiry causing email failures | Medium | High | Implement refresh token rotation; surface clear error states in UI |
| R-02 | PDF generation timeout on Vercel edge | Medium | Medium | Use background job queue or Supabase Edge Function with longer timeout |
| R-03 | RLS policy gaps allowing data leakage | Low | Critical | Dedicated RLS test suite; third-party security review before launch |
| R-04 | Supabase outage affecting availability | Low | High | Supabase SLA; local fallback read cache for critical data |
| R-05 | Scope creep delaying delivery | High | Medium | Strict in/out-of-scope document; change request process for new features |
| R-06 | Financial calculation bugs causing billing errors | Low | Critical | Integer arithmetic library; 100% unit test coverage on all monetary logic |

---

## 9. Future Portfolio Consideration

The System Administrator is the developer of this platform, and the codebase is intended to serve a dual purpose: **production business tool** and **engineering portfolio showcase**.

Architectural decisions must therefore reflect industry best practices visibly:

- Clean, well-documented code with meaningful commit history on GitHub.
- Use of modern patterns: Server Components, Server Actions, optimistic UI, Zod schema-first design.
- Comprehensive README covering setup, architecture decisions, and local development.
- A publicly viewable **demo mode** or **read-only preview environment** that showcases the UI with anonymised/synthetic data, without exposing real client or financial information.
- Deployment URL suitable for sharing in a portfolio (custom domain via Vercel).
- Lighthouse scores, TypeScript coverage, and test coverage badges in the README.

> [!IMPORTANT]
> The demo environment must **never** expose real client names, financial figures, or any personally identifiable information. Use a seeded synthetic dataset for all public-facing demos.

---

## 10. Project Phases Overview

| Phase | Name | Key Deliverables | Notes |
|---|---|---|---|
| **Phase 0** | Foundation | Project scaffolding, Supabase schema, Auth, RBAC, CI/CD pipeline | All subsequent phases depend on this |
| **Phase 1** | Core Business Operations | Clients & Enquiries, Quotations, Bookings & Events, Invoices & Payments | Minimum viable operational system |
| **Phase 2** | Financial & Crew | Ledger & Expenses, Crew Management, Service Catalogue | Extends Phase 1 with financial depth |
| **Phase 3** | Delivery & Feedback | Delivery Management, Feedback & Reviews | Completes the client journey |
| **Phase 4** | Public Presence | Public Website, SEO, Enquiry Form integration | Brand and lead generation |
| **Phase 5** | Integrations & Polish | Gmail Integration, PDF refinement, Dashboard KPIs, Settings | End-to-end integration and UX polish |
| **Phase 6** | Hardening | Security audit, RLS test suite, performance optimisation, documentation | Pre-launch production readiness |

> [!NOTE]
> Phases are sequential in dependency but may overlap in development. Phase 0 must be fully complete before any other phase begins. Gmail Integration (Phase 5) may be developed in parallel with Phase 3–4 once OAuth scaffolding is in place.

---

*End of Project Brief — VOWS Studio Platform v1.0*
