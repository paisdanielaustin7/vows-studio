# VOWS Studio — UI Design Specification

> **Status:** Draft for review · **Date:** 2026-11-10 · **Depends on:** `GLOSSARY_AND_ENUMS.md`, `RBAC_PERMISSIONS.md`, `BUSINESS_WORKFLOWS.md`
> **Purpose:** Brief for the Google Stitch design step, and the visual contract for implementation. Covers design principles, tokens, components, navigation, every page, key screen layouts, states, accessibility, and ready-to-paste Stitch prompts (§13).
> **Surfaces:** (1) Public website, (2) CRM app, (3) Admin panel, (4) token pages (review, delivery share), (5) auth screens.

---

## 1. Design principles

1. **Calm and premium.** The brand is wedding photography, so the public site is editorial and image-led; the CRM is quiet, dense where needed and never decorative.
2. **Money is unmistakable.** Amounts are right-aligned, tabular figures, formatted `₹1,50,000.00` (Indian grouping). Positive, negative and overdue amounts have consistent colours and are never conveyed by colour alone.
3. **One primary action per screen.** Secondary actions sit in menus or ghost buttons.
4. **Show state clearly.** Every record shows its status badge, who did what and when.
5. **Role-aware, not role-cluttered.** Users see only what their role can use (RBAC §6). No disabled-and-greyed clutter for forbidden features.
6. **Mobile is real.** Crew and the owner will use phones. 375 px is a primary breakpoint (MOB-01).
7. **Accessible by default.** WCAG 2.1 AA, keyboard friendly, visible focus.

---

## 2. Brand and design tokens

The studio's logo and colours are runtime-configurable (Settings → Branding). The tokens below are **defaults**; the palette can be swapped without redesign by changing CSS variables.

### 2.1 Colour (light theme)

| Token | Default | Use |
|---|---|---|
| `--background` | `#FAF8F5` | App and public background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards, tables, dialogs |
| `--surface-muted` | `#F2EEE8` | Table headers, subtle panels |
| `--foreground` | `#1E1B22` | Body text |
| `--muted-foreground` | `#6B6672` | Secondary text |
| `--border` | `#E4DED5` | Dividers, inputs |
| `--primary` | `#2B2A33` | Primary buttons, nav active, headings (deep charcoal) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--accent` | `#B08D57` | Brand accent (muted gold): highlights, links on dark, key icons |
| `--accent-soft` | `#F3E9D7` | Accent backgrounds |
| `--success` | `#2F7D5B` | Paid, approved, completed |
| `--warning` | `#B7791F` | Sent, pending, expiring |
| `--danger` | `#B3392F` | Overdue, cancelled, destructive |
| `--info` | `#2D6A9F` | In progress, informational |
| `--ring` | `#B08D57` | Focus ring (2 px with 2 px offset) |

Contrast: text and interactive colours must meet 4.5:1 against their backgrounds (3:1 for large text and UI borders). Verify all token pairs in design review.

### 2.2 Dark theme (CRM only)
Background `#141217`, surface `#1D1A21`, border `#2E2A33`, foreground `#F1EEF3`, same accent and semantic hues lightened for contrast. Follows the OS setting with a manual toggle in the topbar (Architecture §10.4). The public site is light-only at launch.

### 2.3 Typography

| Role | Font | Notes |
|---|---|---|
| Public headings | **Cormorant Garamond** (600) | Editorial feel; hero and section titles |
| UI and body | **Inter** | CRM, forms, tables, public body. Includes the ₹ glyph. |
| Numbers | Inter with `font-variant-numeric: tabular-nums` | All amounts and table figures |
| PDFs | Inter or Noto Sans (embedded) | Must include ₹ (D-28) |

Scale (rem): 0.75, 0.875 (body-sm), 1 (body), 1.125, 1.25, 1.5, 1.875, 2.25, 3 (public hero 3.75 on desktop). Line height 1.5 body, 1.2 headings.

### 2.4 Spacing, shape, elevation, motion
- 4 px base grid: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 6 px inputs and buttons, 10 px cards, 14 px dialogs, full for avatars and badges.
- Shadows: `sm` for cards at rest, `md` for menus and popovers, `lg` for dialogs. Prefer borders over heavy shadows in the CRM.
- Motion: 150 ms ease-out for hover and focus, 200 ms for dialogs and sheets. Respect `prefers-reduced-motion`.
- Icons: Lucide, 16 px in dense UI, 20 px in navigation.

### 2.5 Breakpoints
`sm` 640, `md` 768, `lg` 1024, `xl` 1280. Design at 375, 768 and 1280.

---

## 3. Layouts

### 3.1 CRM shell
- **Desktop (≥ 1024):** fixed left sidebar 256 px (collapsible to 72 px icon rail), topbar 56 px (breadcrumb, global search, notification bell, theme toggle, user menu), content max width 1280 px with 24–32 px padding.
- **Tablet (768–1023):** collapsed icon rail by default, expands as overlay.
- **Mobile (< 768):** topbar with menu button and bell; **bottom navigation bar** with up to 5 role-relevant items; the rest in a slide-out drawer (MOB-02). No horizontal page scroll.
- Page header pattern: title, short description or status, primary action on the right (moves below title on mobile).

### 3.2 Public layout
Transparent-to-solid sticky header, logo left, nav links, prominent "Enquire" button. Generous whitespace, full-bleed imagery, footer with contact, social links, legal links and the cookie banner on first visit (WEB-11).

### 3.3 Auth layout
Centred card on a calm, brand-tinted background, logo above, no navigation. Demo mode adds the demo banner and demo-accounts panel.

### 3.4 Token pages (`/review/[token]`, `/delivery/[token]`)
Minimal public layout with the studio logo, one focused task, clear "link expired" state.

---

## 4. Navigation by role

| Item                  | SA                  | BO         | MG       | AC  | ST  | CR       |
| --------------------- | ------------------- | ---------- | -------- | --- | --- | -------- |
| Dashboard             | ✓ (admin dashboard) | ✓          | ✓        | ✓   | —   | —        |
| Schedule              | ✓                   | ✓          | ✓        | ✓   | ✓   | ✓ (home) |
| Clients               | ✓                   | ✓          | ✓        | ✓   | ✓   | —        |
| Enquiries             | ✓                   | ✓          | ✓        | ✓   | ✓   | —        |
| Quotations            | ✓                   | ✓          | ✓        | ✓   | —   | —        |
| Bookings              | ✓                   | ✓          | ✓        | ✓   | ✓   | ✓ (own)  |
| Invoices              | ✓                   | ✓          | ✓ (read) | ✓   | —   | —        |
| Payments              | ✓                   | ✓          | —        | ✓   | —   | —        |
| Ledger                | ✓                   | ✓          | —        | ✓   | —   | —        |
| Expenses              | ✓                   | ✓          | —        | ✓   | —   | —        |
| Crew                  | ✓                   | ✓          | ✓        | ✓   | —   | ✓ (own)  |
| Delivery              | ✓                   | ✓          | ✓        | —   | ✓   | ✓ (own)  |
| Services and packages | ✓                   | ✓          | ✓        | ✓   | ✓   | —        |
| Reviews               | ✓                   | ✓          | ✓        | —   | —   | —        |
| Portfolio and website | ✓                   | ✓          | ✓        | —   | —   | —        |
| Audit log             | ✓ (admin)           | ✓ (scoped) | —        | —   | —   | —        |
| Settings              | ✓                   | ✓          | —        | —   | —   | —        |
| Admin (users, system) | ✓                   | —          | —        | —   | —   | —        |

**Mobile bottom bar (suggested):** BO and MG: Dashboard, Schedule, Enquiries, Bookings, More. AC: Dashboard, Invoices, Payments, Expenses, More. ST: Bookings, Delivery, Schedule, Clients. CR: Schedule, Bookings, Profile.

Sidebar groups: *Sales* (Enquiries, Clients, Quotations), *Operations* (Bookings, Schedule, Crew, Delivery), *Finance* (Invoices, Payments, Ledger, Expenses), *Catalogue* (Services, Packages), *Website* (Portfolio, Reviews), *System* (Settings, Audit log, Admin).

---

## 5. Component inventory

Base components come from shadcn/ui (Radix). Composed components are listed with their behaviour.

| Component | Behaviour and notes |
|---|---|
| Button | Variants: primary, secondary, ghost, destructive, link. Sizes sm, md, lg. Loading state with spinner and disabled. Min 44 px touch height on mobile. |
| Input, Textarea, Select, Combobox | Label above, helper text, error text below, required marker. Combobox with async search for clients and crew. |
| Money input | Shows `₹` prefix, accepts rupees with up to 2 decimals, stores paise, right-aligned, tabular numbers. |
| Percent input | Accepts up to 2 decimals, stores basis points. |
| Phone input | `+91` default, validates Indian mobile format, international flag. |
| Date and date-range picker | IST, `DD MMM YYYY` display, keyboard accessible, presets (Today, This week, This month, This FY, Custom). |
| Status badge | Colour plus text label plus icon. Map in §6. |
| Data table | Server-side pagination, sorting, filters toolbar, column visibility, row actions menu, sticky header. **Reflows to cards below 768 px** (MOB-03). |
| Filter bar and saved views | Chips for active filters, "Clear all". |
| Stat card (KPI) | Value, label, delta vs previous period with arrow and sign, link to filtered list, "No data" state. |
| Charts | Revenue (grouped bar: collected vs invoiced), booking mix (donut), income vs expenses (bar). Data table alternative available for accessibility. |
| Line-item editor | Rows: description, qty, unit price, line total; add, remove, reorder (drag and keyboard); live totals panel (subtotal, discount, tax if GST on, total). Totals are display only; server is authoritative. |
| Totals panel | Right-aligned summary card, sticky on desktop, collapsible bar on mobile. |
| Stepper / pipeline tracker | 9 stages with status icons, assignee avatars, dates, blocked flag, expandable detail. Horizontal on desktop, vertical on mobile. |
| Calendar | Month, week, day, list views. Events colour-coded by `event_type` with text labels. Popover with booking link and crew. Crew filter. |
| Timeline / activity feed | Actor, action, time, linked entity. |
| Document preview | PDF opens in a new tab on mobile; embedded viewer on desktop. |
| Send-email dialog | To, subject, rendered body preview, attachment chip, confirm and cancel. Shows Gmail status and fallback "Download PDF". |
| Confirm dialog | For destructive or irreversible actions; requires reason field where specified (void, cancel, reject, block). |
| Override dialog | Lists conflicts, requires a reason, red accent, role-restricted. |
| File uploader | Drag and drop, progress, type and size hints, thumbnail, remove. |
| Rich text editor | Minimal toolbar (bold, italic, lists, link) for terms, templates, FAQ, legal pages. |
| Toasts | Success, error, info. Errors include request id. |
| Banners | Persistent: Gmail needs reconnect, demo mode, session expiring. |
| Empty state | Illustration or icon, one-line explanation, primary action. |
| Skeleton loaders | For tables, cards and charts (`loading.tsx`). |
| Notification bell | Unread count, dropdown list, mark all read. |
| Avatar and initials | For users and crew. |
| Breadcrumb | Desktop only; mobile shows a back link. |

---

## 6. Status badge colour map

| Status | Colour | Icon |
|---|---|---|
| new | info | sparkle |
| contacted, quoted | warning | message |
| negotiating | accent | scale |
| converted, accepted, approved, completed, paid, delivered, done | success | check |
| lost, rejected, cancelled, voided | danger | x |
| junk | muted | trash |
| draft | muted | pencil |
| sent, pending, partially_paid, unpaid | warning | send / clock |
| overdue, blocked, behind schedule | danger | alert |
| expired, superseded | muted | hourglass / layers |
| in_progress, confirmed | info | play / calendar |

Every badge always includes the text label.

---

## 7. Page inventory

### 7.1 Public website

| Route | Content and key elements |
|---|---|
| `/` | Hero (full-bleed image or short loop, tagline, "Enquire" and "View portfolio"), featured portfolio grid, services summary, signature packages, testimonial carousel with aggregate rating, about teaser, final CTA, footer. |
| `/portfolio`, `/portfolio/[category]` | Category chips, masonry grid with lazy loading, lightbox gallery with keyboard navigation, video embeds, alt text on all images. |
| `/services` | Services and packages with prices from the catalogue (`show_on_website`), "What's included", CTA to enquire with the package preselected. |
| `/about` | Studio story, team, approach, awards or clients if provided. |
| `/contact` | Enquiry form (name, phone, email, event type, date, venue, message, source, consent checkbox, Turnstile), studio contact details, map embed, social links. |
| `/contact/thank-you` | Confirmation and next steps. |
| `/reviews` | Aggregate rating, approved reviews with category ratings, JSON-LD. |
| `/faq`, `/privacy`, `/terms` | Rich text pages managed in Settings. |
| Cookie banner | Accept and manage, shown on first visit. |

### 7.2 Auth

`/login`, `/mfa`, `/mfa/enroll` (QR, manual key, code entry, recovery codes), `/forgot-password`, `/reset-password`, `/invite/[token]` (set password, strength meter), session-expired message, account-locked message.

### 7.3 CRM pages

| Route | Roles | Key elements |
|---|---|---|
| `/crm/dashboard` | SA, BO, MG, AC | Date-range selector; KPI cards (revenue collected, expected, confirmed bookings, pending enquiries, upcoming events, outstanding invoices); revenue chart; booking mix donut; upcoming events; recent enquiries; overdue invoices; blocked stages and follow-ups due. Financial widgets hidden by role. |
| `/crm/schedule` | all | Calendar with crew filter; crew see only their assignments. |
| `/crm/clients` | SA, BO, MG, AC, ST | Searchable table, filters (source, city), duplicate warning on create. |
| `/crm/clients/[id]` | same | Header with contact and actions; tabs Overview, Enquiries, Quotations, Bookings, Invoices and payments (by role), Activity. |
| `/crm/enquiries` | same | Table with status filter, assignee, event type, date; bulk actions (junk, assign, export). Kanban toggle optional. |
| `/crm/enquiries/[id]` | same | Details, status stepper, follow-ups panel, create or link client, create quotation, convert, activity timeline. |
| `/crm/quotations`, `/new`, `/[id]` | SA, BO, MG (AC read) | List with status and expiry; builder (§8.2); detail with versions drawer, PDF preview, send, accept, reject, create booking. |
| `/crm/bookings`, `/[id]` | SA, BO, MG, AC, ST, CR(own) | List; detail (§8.3) with events, crew, invoices, delivery progress, internal confirmation document. |
| `/crm/invoices`, `/[id]` | SA, BO, AC, MG(read) | List with overdue highlight; detail (§8.4) with payments, receipts, credit notes, send, cancel. |
| `/crm/payments` | SA, BO, AC | List and "Record payment" dialog (§8.4). |
| `/crm/ledger` | SA, BO, AC | Filters, running totals, P&L report, monthly chart, CSV export. |
| `/crm/expenses` | SA, BO, AC | List, create with receipt upload, category management link. |
| `/crm/crew`, `/[id]` | SA, BO, MG, AC, CR(own) | Directory with role and availability filters; profile with assignments, availability calendar, pay records (by role). |
| `/crm/services`, `/crm/packages` | per matrix | Catalogue lists, price history drawer, archive, CSV import (SA, BO). |
| `/crm/delivery`, `/[id]` | SA, BO, MG, ST, CR(own) | Board or list of pipelines with behind-schedule flag; tracker detail (§8.5). |
| `/crm/portfolio` | SA, BO, MG | Item grid, upload, order, publish toggle with consent confirmation. |
| `/crm/reviews` | SA, BO, MG | Moderation list, detail, approve and reject, link generator. |
| `/crm/audit-log` | BO | Scoped log with filters. |
| `/crm/settings/*` | SA, BO | Studio, Branding, Billing and GST, Numbering (SA), Email templates, Gmail, Expense categories, Website content and SEO, Quotation templates. |

### 7.4 Admin pages (`/admin/*`, SA)
Dashboard (user counts, role breakdown, recent audit events, system health), Users (list, invite, role, deactivate, unlock, resend, MFA reset, last login), Audit log (full filters, export), System (health, security settings, storage usage), **Data management** (`/admin/system/data`: setup checklist, setup-mode status, Load sample data, Reset wizard, Lock setup). The Settings left navigation shows a "Data management" link to SA only.

### 7.5 System pages
403 page (friendly, "You don't have access", back and contact owner), 404, 500 (request id), offline state, maintenance.

---

## 8. Key screen specifications

### 8.1 Dashboard
Top row of six KPI cards (2-up on mobile, 3-up on tablet, 6-up on desktop). Below: revenue chart (2/3 width) and booking mix donut (1/3). Then two columns: Upcoming events (10 items) and Recent enquiries (5). Then Overdue invoices and Alerts (blocked stages, follow-ups due). Every widget is a link to the filtered module (DASH-08). Auto-refresh every 5 minutes with a subtle "Updated just now" stamp.

### 8.2 Quotation builder
Two-column on desktop. **Left:** client selector (with "new client"), enquiry link, event date, valid until, line-item editor with "Add from catalogue" (searchable, shows current price and archived marker), "Add custom line", "Apply template". **Right (sticky):** totals panel with discount type toggle (percent or fixed), notes to client, internal notes, terms; actions: Save draft, Preview PDF, Send. Version badge ("v2") and a versions drawer. GST fields appear only when GST is enabled. Mobile: single column; totals as a sticky bottom bar that expands.

### 8.3 Booking detail
Header: booking number, client, status badge, contract total (role-aware), primary actions (Add event, Create invoice, Cancel). Tabs: **Overview** (summary, notes, linked quotation version), **Events** (cards sorted by date with crew chips and warning when no crew), **Crew** (matrix of crew by event), **Billing** (invoices, paid and balance, payments), **Delivery** (9-stage tracker summary), **Documents** (internal confirmation, PDFs), **Activity**. Cancelled bookings show a persistent banner with reason and fee.

### 8.4 Invoice detail and "Record payment"
Invoice header with number, status (and derived overdue marker), dates, client. Line items table, totals card (subtotal, discount, tax, total, credited, paid, **balance**). Right rail: Send, Download PDF, Cancel (if unpaid), Issue credit note. Payments table below with receipts and Void action. **Record payment dialog:** amount, date, method, reference, notes; allocation list of the client's open invoices with amounts that must sum to the payment; live "Unallocated" meter that must reach zero; clear error if over the balance with guidance to create an advance invoice.

### 8.5 Delivery tracker
Header with booking, target date, behind-schedule flag. Nine stages as a stepper: each shows icon, name, status badge, assignees, dates. Selecting a stage opens a side panel with status control, assignees, notes, attachments (links and small files), blocked reason. Locked state for cancelled bookings. "Share with client" button opens a dialog showing the link, expiry and revoke.

### 8.6 Calendar
Toolbar: Month, Week, Day, List; crew filter; type legend. Event chips show time, event name, client display name. Click opens popover with venue, crew, booking link. Conflicts show a warning icon.

### 8.7 Settings
Left sub-navigation (stacked on mobile). Forms use sections with a sticky "Save changes" bar showing unsaved state. Gmail page shows connected account, status, from name, reply-to, Test, Change account, Disconnect with explanation.

---

## 9. Forms, validation and microcopy

- Validate on blur and on submit; show the first error summary at top and inline messages under fields; focus moves to the first invalid field.
- Required fields marked with text "Required" for screen readers, not colour alone.
- Currency in the interface: `₹1,50,000.00`; dates `15 Nov 2026`; times 12-hour with AM/PM; all in IST.
- Tone: plain, polite, specific. Examples: "The total changed, so we recalculated it. Review and save again." / "This payment is more than the invoice balance. Create an advance invoice first."
- Destructive confirmations name the object ("Cancel invoice INV-2026-000012?") and state consequences.
- Success toasts name the document number.
- Never expose internal ids or raw errors.

---

## 10. States

| State | Pattern |
|---|---|
| Loading | Skeletons matching final layout, no spinner-only pages |
| Empty | Icon, explanation, primary action, link to help text where relevant |
| Error (page) | Error boundary with retry and request id |
| Error (field) | Inline message plus summary |
| Forbidden | 403 page; actions the role cannot use are simply absent |
| Offline / network | Toast and retained form data |
| Partial data | "No data for this period" in widgets, never a blank space |
| Long-running | PDF generation shows inline progress and a retry on failure |
| Demo | Persistent top banner, watermark on PDFs, "(Demo)" on email-sent toast |

---

## 11. Accessibility and responsiveness

- WCAG 2.1 AA: contrast, focus order, visible focus ring, labels, ARIA for dialogs, menus, tabs and tables.
- All interactions work by keyboard; dialogs trap focus and restore it on close; skip-to-content link.
- Tap targets at least 44 × 44 px (MOB-04). Inputs full width on mobile.
- Charts have text summaries and accessible data tables; colour is never the only signal.
- Images have meaningful alt text (portfolio images require it, SEO-04).
- Respect reduced motion. Support browser zoom to 200 percent without loss of function.
- Tables reflow to cards on mobile; PDFs open in a new tab on mobile (MOB-05).
- Targets: Lighthouse accessibility ≥ 90 on key pages (D-41).

---

## 12. Stitch workflow and handoff

1. Generate the **design system frame** first using Prompt G in §13, then confirm tokens match §2.
2. Generate screens in this order: Login and MFA → CRM shell → Dashboard → Enquiries list and detail → Quotation builder → Booking detail → Invoice detail and Record payment → Schedule → Delivery tracker → Clients → Crew → Settings → Admin → Public pages.
3. For each screen produce **desktop (1280)** and **mobile (375)** variants. Tablet is derived.
4. Review against §1 principles, §2 tokens, §6 badge map and §11 accessibility. Record deviations.
5. Export for implementation: screen images and HTML/CSS (or Figma) plus a list of components and tokens used. Name screens exactly as the routes in §7 (for example `crm-quotations-new`).
6. Hand to the implementation agent together with `DECISION_LOG.md`, `GLOSSARY_AND_ENUMS.md`, `RBAC_PERMISSIONS.md` and this file. Designs are reference only: data, permissions and behaviour come from the documents.

**Acceptance for designs:** all pages in §7 covered at both breakpoints; empty, loading and error states for each list; every status badge from §6; dark theme for CRM shell and dashboard; no screen shows controls a role cannot use.

---

## 13. Stitch prompts (paste as written)

> Use the same style block (Prompt G) at the start of each session so screens stay consistent. Replace nothing in angle brackets unless noted.

## IMPORTANT DESIGN INSTRUCTION

These prompts are for visual design only.

Preserve the existing application structure, screen responsibilities, navigation, workflows, data fields, actions, validation requirements and role-based permissions described in the original UI Design Specification.

Do not invent, remove, merge, rename or restructure any application modules or screens.

Simplify the visual presentation without changing functionality.

---

## PROMPT G — GLOBAL DESIGN SYSTEM

Design a complete, consistent web application UI design system for VOWS Studio, a Christian wedding photography and videography team based in Karnataka, India.

**Brand identity:**

- Studio name: VOWS Studio
- Owner: Reuben Serrao
- Official slogan: Wedding Cinematic & Stills

**Overall design direction:**

Create a minimal, modern, spacious, professional and user-friendly interface.

The entire application should feel calm, simple, clean and effortless to navigate. Avoid unnecessary visual elements, decorative sections, excessive cards, oversized headings, distracting colours and information overload.

Use a light sage green visual identity with predominantly white surfaces and subtle neutral backgrounds.

**Colour palette:**

- Main background: #F7F9F6
- Surface / cards: #FFFFFF
- Primary sage green: #829B87
- Dark sage green: #526B58
- Soft sage background: #EAF0E9
- Main text: #252B27
- Secondary text: #747D75
- Borders: #E5EAE4

Use sage green selectively for primary actions, active navigation, selected elements and important highlights. Do not make every component green.

**Typography:**  
Use Inter throughout the entire application, including the public website, CRM, admin panel, forms, headings, tables and dialogs.

Use simple font weights and sizes. Avoid decorative serif fonts, handwritten fonts and stylish display typography.

**Layout and spacing:**

- Prioritise whitespace and breathing room.
- Keep layouts straightforward and easy to scan.
- Avoid unnecessary nested cards and containers.
- Use subtle borders instead of prominent shadows.
- Maintain consistent alignment and spacing.
- Avoid filling empty spaces with unnecessary widgets or decorations.
- Keep page headings simple and appropriately sized.
- Use a restrained number of visual elements while retaining all required information and controls.

**Visual components:**

- Simple buttons with consistent styling.
- Clean inputs with clear labels.
- Subtle, readable status badges.
- Minimal Lucide icons.
- Simple tables with restrained dividers.
- White cards with subtle borders.
- Minimal dialogs and dropdowns.
- Consistent navigation and page headers.

**Backgrounds:**

Use plain, solid backgrounds throughout. Do not use background photographs, image overlays, decorative patterns, textured backgrounds, elaborate gradients or ornamental illustrations.

Actual portfolio photographs and other functional content images must remain wherever required by the original screen specification.

**Brand character:**

VOWS Studio is a Christian team. Maintain a professional, contemporary and understated identity. Do not introduce unnecessary Karnataka-specific theatrical motifs, exaggerated traditional wedding decorations, regional patterns or cultural ornamentation.

The application should look like a modern professional business platform, not a wedding invitation template.

**Functional and structural restrictions:**

This is strictly a visual design exercise.

Do not change:

- Existing routes or screen hierarchy.
- Business workflows.
- Database structure.
- API behaviour.
- Role-based access control.
- Form fields or validation.
- Financial calculations.
- Status definitions.
- Navigation structure or permissions.
- Required actions or screen functionality.

Do not omit specified information merely to achieve minimalism. Simplify its presentation instead.

**Responsive design:**  
Create desktop designs at 1280 px and mobile designs at 375 px. Maintain the same visual identity across all screens.

Use the light theme consistently across the application designs.

---

## PROMPT 1 — LOGIN AND MFA

Using the global VOWS Studio design system, design the authentication screens.

Create:

- Sign-in screen with studio logo, email and password fields, Forgot password and Sign in.
- Generic error state.
- Account-locked state.
- Two-factor authentication screen with 6-digit code input.
- MFA enrolment screen with QR code, manual key, code entry and ten recovery codes.
- Confirmation action labelled "I saved these".
- Demo-mode variant with expandable Demo accounts table listing six roles.

Keep the authentication experience exceptionally simple, spacious and distraction-free.

Do not introduce unnecessary illustrations, background photographs or decorative elements.

Preserve every authentication field, state and action.

---

## PROMPT 2 — CRM SHELL

Design the main VOWS Studio CRM application shell.

Preserve the existing navigation hierarchy and module grouping.

Desktop:

- Left sidebar with studio logo.
- Sales: Enquiries, Clients, Quotations.
- Operations: Bookings, Schedule, Crew, Delivery.
- Finance: Invoices, Payments, Ledger, Expenses.
- Catalogue: Services, Packages.
- Website: Portfolio, Reviews.
- System: Settings, Audit log.
- Collapsible sidebar with icon rail.
- Top bar with breadcrumb, global search, notification bell, theme toggle and user menu.

Mobile:

- Simple top bar.
- Bottom navigation with five role-relevant items.
- More drawer for remaining navigation items.

Include:

- Gmail needs reconnecting banner.
- Demo-mode banner.

Use minimal separators, restrained icons, clean typography and sufficient spacing.

Do not add, remove or rearrange modules. Preserve existing navigation and role permissions.

---

## PROMPT 3 — DASHBOARD

Design the Business Owner dashboard.

Include:

- Date-range selector: Today, This week, This month, This financial year and Custom.
- Six KPI cards: Revenue collected, Revenue expected, Confirmed bookings, Pending enquiries, Upcoming events in 30 days and Outstanding invoices.
- Percentage change versus previous period for each KPI.
- Grouped bar chart of monthly collected versus invoiced revenue.
- Donut chart showing bookings by event type.
- Upcoming events list.
- Recent enquiries list.
- Overdue invoices list.
- Alerts panel for blocked delivery stages and follow-ups due today.

Provide a Manager variant without financial widgets.

Keep the dashboard visually light and organised. Avoid oversized KPI cards, excessive charts, unnecessary graphical decorations and crowded sections.

Use compact, clearly separated information groups while maintaining comfortable whitespace.

Do not remove any specified dashboard information or change calculations.

Include desktop and mobile layouts.

---

## PROMPT 4 — ENQUIRIES LIST AND DETAIL

Design the enquiries list and enquiry detail screens.

Enquiries list:

- Search.
- Filters: status, event type, assignee and date range.
- Status badges: new, contacted, quoted, negotiating, converted, lost and junk.
- Bulk actions: mark as junk, assign and export CSV.
- Mobile card layout.

Enquiry detail:

- Contact details.
- Event details.
- Status stepper.
- Follow-ups panel with add reminder.
- Create or link client.
- Create quotation.
- Convert to booking.
- Activity timeline.

Use a simple, readable layout with clear information grouping and restrained status colours.

Keep all existing fields, actions, statuses and workflow steps.

---

## PROMPT 5 — CLIENTS

Design:

1. Client list.
2. Client profile.

Client list:

- Search by name, phone and email.
- Possible duplicate warning banner on the create form.

Client profile:

- Header contact card.
- Tabs: Overview, Enquiries, Quotations, Bookings, Invoices and payments, Activity.
- Outstanding balance.
- Lifetime revenue as small stat cards.

Use simple tables, clear contact information and minimal profile sections.

Avoid unnecessary cards and excessive decorative elements.

Preserve all specified tabs and financial information.

---

## PROMPT 6 — QUOTATION BUILDER

Design the quotation builder.

Desktop:

- Left section with client selector.
- Event date.
- Valid-until date.
- Line-item editor containing description, quantity, unit price in rupees and line total.
- Drag-to-reorder and remove actions.
- Add from catalogue.
- Add custom line.
- Apply template.

Right section:

- Sticky totals card.
- Subtotal.
- Discount with Percent / Fixed toggle.
- Taxable amount.
- Total in prominent but restrained typography.
- Notes to client.
- Internal notes.
- Terms.

Actions:

- Save draft.
- Preview PDF.
- Send.

Include:

- Version badge v2.
- Versions drawer.
- Expired variant.
- Read-only Accepted variant.

Mobile:

- Single-column layout.
- Sticky bottom totals bar.

Use a clean, professional document-building interface. Keep the financial hierarchy clear without oversized figures or unnecessary visual decoration.

Do not alter quotation fields, calculations, versioning or workflow.

---

## PROMPT 7 — SEND EMAIL DIALOG AND PDF PREVIEW

Design the Send quotation dialog.

Include:

- To.
- Subject.
- Rendered email body preview.
- Attached PDF chip.
- Confirm.
- Cancel.

Include a Gmail not connected variant offering:

- Download PDF.
- Connect Gmail.

Also design a branded quotation PDF preview containing:

- Studio logo.
- Studio details.
- Client details.
- Quotation number.
- Validity date.
- Line items table.
- Totals.
- Terms.
- Footer.

Use a restrained document design with Inter typography, white backgrounds, subtle sage accents and clear financial formatting.

Do not add decorative wedding backgrounds, textures or unnecessary graphic elements.

Preserve all document fields and actions.

---

## PROMPT 8 — BOOKING DETAIL

Design the booking detail page.

Header:

- Booking number.
- Client name.
- Status badge.
- Contract total.
- Add event.
- Create invoice.
- Cancel booking.

Tabs:

- Overview.
- Events.
- Crew.
- Billing.
- Delivery.
- Documents.
- Activity.

Events tab:

- Event cards sorted by date.
- Venue.
- Time.
- Crew avatars.
- Warning when no crew is assigned.

Include the Assign crew dialog with:

- Crew selection.
- Conflict warning listing overlapping events.
- Required override reason field.

Include cancelled-booking banner variant showing reason and fee.

Use clear information hierarchy and restrained tab styling.

Do not remove any booking information, actions or workflow requirements.

---

## PROMPT 9 — INVOICE DETAIL AND RECORD PAYMENT

Design the invoice detail page.

Include:

- Invoice number.
- Status badge.
- Overdue variant.
- Issue date.
- Due date.
- Line items.
- Totals card containing subtotal, discount, tax, total, credited, paid and balance.
- Right-side actions: Send, Download PDF, Issue credit note and Cancel.
- Payments table.
- Receipt links.
- Void action.

Design the Record payment dialog with:

- Amount.
- Date.
- Payment method: Cash, UPI, Bank transfer, Cheque, Other.
- Reference.
- Notes.
- Client's open invoices.
- Allocation amounts.
- Unallocated ₹0.00 meter that must reach zero.

Include an error state explaining that over-payment is not allowed and an advance invoice should be created.

Keep monetary information clearly organised, right-aligned and easy to understand.

Do not change payment allocation rules, calculations, validation or invoice workflows.

---

## PROMPT 10 — LEDGER AND EXPENSES

Design the ledger page.

Include:

- Income and expenses in reverse chronological order.
- Filters: type, category, date range and payment mode.
- Summary cards: total income, total expenses and net profit.
- Monthly income-versus-expenses bar chart.
- P&L report view with category breakdown.
- CSV export.

Design the add-expense form with:

- Category.
- Amount.
- Vendor.
- Date.
- Payment mode.
- Receipt upload.

Restrict this design to Accountant and Business Owner roles as specified.

Keep the ledger readable, with minimal table styling and clear financial figures.

Do not alter expense fields, financial calculations, access permissions or accounting structure.

---

## PROMPT 11 — SCHEDULE

Design the schedule calendar.

Include:

- Month, Week, Day and List views.
    
- Crew filter.
- Colour plus text labels per event type: wedding, pre-wedding, engagement, mehendi, haldi, reception, portrait, birthday and corporate.
- Event popover showing venue, time, booking link and crew.

Provide a mobile agenda-style view for crew members showing only their own events without client phone numbers.

Use a simple calendar layout with subtle event colours, clear labels and minimal visual clutter.

Preserve calendar functionality, event types and crew visibility restrictions.

---

## PROMPT 12 — CREW

Design:

1. Crew directory.
2. Crew profile.

Crew directory:

- Role filters.
- Availability filters.


Crew profile:

- Details.
- Past and upcoming assignments.
- Availability calendar.
- Pay records.
- Add payment dialog.

Show the Pay tab only for finance roles.

Include a mobile layout.

Keep the profile clean and information organised. Use simple avatars and restrained visual indicators.

Do not change crew permissions, assignment information or payment functionality.

---

## PROMPT 13 — DELIVERY TRACKER

Design the delivery pipeline tracker.

Preserve all nine existing stages:

1. Raw Import.
2. Culling.
3. Editing.
4. Client Preview.
5. Revisions.
6. Final Export.
7. Quality Check.
8. Delivery.
9. Completed.

Show:

- Status icons.
- Assignee avatars.
- Dates per stage.
- Blocked stage with reason.
- Behind-schedule flag.

Design a side panel for the selected stage containing:

- Status control.
- Assignees.
- Notes.
- Attachments, including external links and small files.

Include the Share with client dialog with:

- Link.
- Expiry.
- Revoke.

Also design the public client share page listing deliverable links.

Use a straightforward timeline or stepper with clear progression and minimal visual decoration.

The client share page should be particularly simple, focused only on the delivery information and required actions.

Do not alter stage names, stage order, workflow, permissions or delivery logic.

---

## PROMPT 14 — CATALOGUE AND PORTFOLIO MANAGEMENT

Design:

1. Services list.
2. Package builder.
3. Portfolio manager.

Services and packages:

- Category filter.
- Price column.
- Show on website toggle.
- Price history drawer.
- Archive action.

Portfolio manager:

- Image grid.
- Drag to reorder.
- Cover selection.
- Alt text field.
- Event type category.
- Publish toggle.
- Consent confirmation dialog.

Use simple layouts with clear controls, plain backgrounds and restrained image presentation.

Actual portfolio photographs should remain visible as content.

Do not introduce decorative backgrounds or alter catalogue and publishing functionality.

---

## PROMPT 15 — REVIEWS

Design the review moderation list and detail.

Include:

- Overall rating.
- Three category ratings.
- Testimonial.
- Reviewer name.
- Status.
- Approve.
- Reject with optional note.
- Re-hide.

Also design the public review submission page containing:

- Studio logo.
- Star ratings for overall, communication, quality and punctuality.
- Testimonial text.
- Name.
- Submit.

Include:

- Invalid or expired link state.
- Thank-you state.

Use simple rating controls and a clean, uncluttered form.

Preserve all review fields, moderation actions and states.

---

## PROMPT 16 — SETTINGS

Design the settings area with left sub-navigation.

Sections:

**Studio profile**

- Studio information and profile details.

**Branding**

- Logo upload.
- Two colour pickers.
- Live preview.

**Billing and GST**

- GST toggle.
- GSTIN.
- Rates.
- HSN/SAC per service category.
- Bank details.

**Numbering**

- Prefix.
- Padding.
- Year format per document type.
- Preview such as QT-2026-000001.

**Email templates**

- Subject.
- Body.
- Merge tag chips.

**Gmail**

- Connected account.
- From name.
- Reply-to.
- Test.
- Change account.
- Disconnect.

**Expense categories**

**Website content and SEO**

Include sticky save bar with unsaved state.

Use a simple settings interface with clear section headings and minimal visual separation.

Do not merge settings sections, change their functionality or alter existing configuration requirements.

---

### PROMPT 17 — ADMIN

"Design the Admin interface for the System Administrator (SA), covering the following pages:

**1. Dashboard**
- User counts and role breakdown
- Recent audit events
- System health indicators

**2. Users**
- Users table with name, email, role, status, last sign-in and MFA status
- Invite user dialog with email, name and role
- Role change with confirmation
- Actions for deactivate, unlock, resend invitation and MFA reset

**3. Audit log**
- Audit log viewer with filters for user, action, table and date range
- Expandable before/after JSON diff
- Export functionality

**4. System**
- System health indicators
- Security settings
- Storage usage

**5. Settings navigation**
- Include a 'Data management' link in the Settings left-side navigation.
- The link must be visible exclusively to the System Administrator (SA).
- It must navigate to `/admin/system/data`.
- The Data management page itself will be designed separately in Prompt 21.

Maintain the existing VOWS Studio design system, Admin layout, navigation hierarchy, typography, colours, components and responsive behaviour.

Do not redesign unrelated CRM pages or introduce additional roles, permissions, workflows or administrative functions beyond those specified in the project documentation."

---

## PROMPT 18 — PUBLIC HOME

Design the VOWS Studio public home page.

Brand identity:

- VOWS Studio.
- Owner: Reuben Serrao.
- Slogan: Wedding Cinematic & Stills.

Create a minimal, professional and welcoming website.

Important: Do not use a full-bleed hero photograph, video background, background image, image overlay, decorative pattern or gradient.

Use a plain solid background with a simple hero section containing:

- Studio name.
- Slogan.
- Short introductory text.
- Enquire button.
- View portfolio button.

Additional sections:

- Featured portfolio masonry grid using actual portfolio images.
- Three service highlights.
- Signature packages with starting-from prices.
- Testimonial carousel with aggregate star rating.
- About teaser.
- Final call-to-action section.
- Footer with contact, social links and legal links.
- Cookie banner.

Keep sections visually distinct through spacing and subtle borders rather than decorative backgrounds.

The website should communicate professionalism, trust and quality through typography, layout and actual photography.

Avoid excessive wedding decorations, regional theatrical motifs and unnecessary animations.

Preserve all existing public website sections and functionality.

---

## PROMPT 19 — PUBLIC PORTFOLIO, SERVICES AND CONTACT

Design three public website areas.

**Portfolio page**

- Category chips.
- Masonry grid.
- Lightbox viewer.

Use actual portfolio photographs as content, not backgrounds.

**Services and pricing page**

- Service cards.
- Package cards.
- Included items.
- Prices.
- Enquire button.

**Contact page**

- Enquiry form containing name, phone, email, event type, date, venue, message, how did you hear about us, consent checkbox and bot-check.
- Studio contact details.
- Map.

Include:

- Thank-you state.
- Form error states.
- Mobile versions.

Use a plain background, Inter typography, restrained sage accents and spacious layouts.

Do not remove fields, alter enquiry functionality or introduce additional public website modules.

---

## PROMPT 20 — SYSTEM STATES

Design the following system states using the global VOWS Studio design system:

- 403: You don't have access.
- 500 with request ID.
- Link expired.
- Session expired.

Also design empty states for:

- No clients.
- No quotations.
- No events.
- No payments.

Each empty state should include a concise explanation and the appropriate primary action.

Keep these screens extremely simple, with plain backgrounds, minimal icons and clear messaging.

Avoid large illustrations, decorative elements and unnecessary text.

Preserve the existing error states and their functionality.

---

**PROMPT 21 – DATA MANAGEMENT & RESET WIZARD**

Design a new **Data management** page for VOWS Studio CRM, accessible only to the System Administrator (SA), at `/admin/system/data`.

Use the existing VOWS Studio Admin interface as the visual reference. Maintain the established design system, navigation, typography, colour palette, spacing, components and responsive behaviour. Do not redesign the rest of the application.

### Section 1: Setup Management

At the top, display a setup status card showing either:

- `Setup mode: ON`
- `Setup mode: LOCKED`, with the date setup was locked.

Below it, display a first-run setup checklist with progress:

- Studio profile
- Branding
- Connect Gmail
- Add catalogue
- Add crew
- Add first client

Include these actions:

- **Load sample data**
- **Lock setup**
- **Reset data**

The Lock setup action should have a confirmation dialog explaining its effect.

Display a clear disabled state with an explanation for setup-only actions when setup mode is locked. Do not assume that locking setup disables the Reset data function.

### Section 2: Reset Wizard

The Reset data action should open a dedicated, four-step reset wizard. Use a clear stepper to show progress and allow the administrator to understand each stage.

**Step 1 – Select reset scope**

Display selectable checkboxes for the following scopes:

- Clients and all dependent records
- Finance only
- Crew
- Catalogue
- Portfolio and website content
- Notifications and activity
- Sample data only

Show automatic dependency hints wherever applicable, so the administrator can understand which related records will also be affected.

Include two additional options:

- Restart numbering at 000001
- Also clear audit log

Clearly distinguish these options from the main reset scopes.

**Step 2 – Dry-run preview**

Before proceeding, display a preview table showing:

- Database table name
- Number of records affected
- Files affected
- Expected deletion or reset action

Show the total estimated records and files affected.

This step is a preview only. It must not visually imply that the reset has already happened.

**Step 3 – Safety verification**

Display the following safeguards:

- Backup export progress
- Download link for the generated backup
- Administrator password field
- A confirmation text field requiring the exact phrase `RESET VOWS DATA`

Keep the final confirmation action disabled until the required verification fields are completed.

Use clear warnings explaining that the selected data will be permanently removed or reset.

**Step 4 – Completion summary**

Display a completion screen containing:

- Reset status
- Selected scopes
- Records affected
- Files removed
- Numbering status
- Backup download reference
- Completion timestamp

### Visual and Interaction Requirements

- Use a prominent red destructive-action style for reset-related controls, without making the entire page visually alarming.
- Use plain, direct language for warnings and confirmations.
- Separate ordinary setup management from destructive data-reset operations.
- Make the reset wizard easy to understand and difficult to trigger accidentally.
- Include appropriate confirmation dialogs, disabled states, loading states, error states and completion states.
- Ensure the layout works on desktop and mobile.

**Important implementation boundary:** This is a UI design task only. Do not invent additional reset scopes, database tables, dependencies, permissions or backend behaviour. Use the existing VOWS Studio architecture and business rules as the source of truth. The interface must represent the specified workflow, not redefine how the system operates.

