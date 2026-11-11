# VOWS Studio CRM — Studio Owner & Operations User Guide
**Document Ref:** `docs/USER_GUIDE.md`  
**System Architecture:** Production Engine v2.4 (Next.js 16, Supabase, Tailwind, Material Design)  
**Applicable Roles:** System Administrator, Business Owner, Operations Manager, Accountant, Crew Member  

---

## 1. Introduction

Welcome to **VOWS Studio CRM**, a bespoke management and production platform designed specifically for luxury Indian wedding cinematography and stills ateliers. This guide walks you through every stage from initial setup mode to daily operations, production delivery, and client reviews.

---

## 2. First-Run Setup & Commissioning

When you first launch VOWS Studio, the system starts in **Setup Mode: ACTIVE**. This commissioning mode allows you to configure studio identities, import demonstration fixtures, and test workflows safely.

### The 6-Step Setup Checklist
Navigate to **Studio Settings** (`/crm/settings`) or **Data Management** (`/admin/system/data`):

1. **Step 1: Studio Profile**
   - Enter your studio legal entity name, official email, phone, and atelier address.
   - Enter your 15-digit GSTIN (Goods and Services Tax Identification Number), PAN, and bank account details for invoice remittance.
2. **Step 2: Studio Branding**
   - Upload your studio emblem / logo (PNG/SVG, transparent background recommended).
   - Configure your brand colors (Default: Sage Green `#4C6452`).
   - Select your document letterhead layout and customized email signature.
3. **Step 3: Connect Gmail Relay**
   - Navigate to `/crm/settings/gmail`.
   - Click **Connect Google Workspace Account**.
   - Authorize Google OAuth. Once connected, client quotations, tax invoices, and review links will be transmitted directly from your studio Gmail address.
4. **Step 4: Product Catalogue**
   - Navigate to `/crm/services` and `/crm/packages`.
   - Set up your services (e.g. Traditional Photography, Cinematic Wedding Film, Drone Aerials, Heirloom Leather Album).
   - Bundle them into signature wedding packages (e.g. *The Royal Heritage Tier*, *The Atelier Classic*).
5. **Step 5: Crew Roster**
   - Navigate to `/crm/crew`.
   - Add your cinematographers, photographers, drone pilots, and editors with their contact info, specialties, day rates, and default gear loadout.
6. **Step 6: First Client Profile**
   - Navigate to `/crm/clients`.
   - Add your first wedding couple with primary phone number and nuptial ceremony date.

---

## 3. Sample Data & Reset Wizard

### Loading Demonstration Fixtures
In Setup Mode, you can click **Load Sample Data** in the Data Management console (`/admin/system/data`). This loads synthetic wedding leads, bookings, packages, and crew records tagged `is_sample = true`. Live clients and custom studio profile settings will never be overwritten.

### Running the Reset Wizard (4 Steps)
If you wish to wipe test transactions before your official go-live:
1. Navigate to `/admin/system/data` (SuperAdmin only).
2. Click **Launch Reset Wizard →**.
3. **Step 1 (Select Scope):** Choose the partitions to wipe:
   - *Clients and all dependants*
   - *Finance only*
   - *Crew*
   - *Catalogue*
   - *Portfolio & Website*
   - Optional: Check *Restart sequence numbering* (reverts quotes and invoices to `#000001`).
4. **Step 2 (Dry-Run Preview):** Review the projected count of affected records and files.
5. **Step 3 (Safety Verification):**
   - Download the automated pre-reset logical backup archive.
   - Enter your SuperAdmin password.
   - Type the exact confirmation phrase: `RESET VOWS DATA`.
   - Check the two safeguard acknowledgements.
   - Click **Execute Permanent Data Reset**.
6. **Step 4 (Completion):** The system completes the wipe in a single isolated transaction and generates an audit log entry.

### Locking Setup for Production Go-Live
Once your catalog and configuration are final:
1. In `/admin/system/data`, click **Lock Setup for Production**.
2. Type `LOCK SETUP` to confirm.
3. Once locked, demo data loaders are permanently disabled, ensuring live production ledgers cannot be accidentally overwritten.

---

## 4. Daily Sales & Lead Conversion

### 1. Enquiry Intake
- Prospective clients submit inquiries via your public contact form (`/contact`) or inquiries are logged manually in `/crm/enquiries`.
- Assign sales leads to team members and record follow-up dates.

### 2. Creating a Quotation
- Open the client profile or click **New Quotation** (`/crm/quotations/new`).
- Add catalog services and signature packages.
- Apply discounts (percentage or fixed amount).
- GST is automatically computed based on place of supply (CGST+SGST 18% for intrastate Karnataka, IGST 18% for interstate).
- Click **Save & Preview PDF** to preview the editorial layout.
- Click **Send via Gmail** to transmit the quote PDF to the couple.

### 3. Converting to Confirmed Booking
- When the couple approves the estimate, mark the quotation as `Accepted`.
- Click **Convert to Booking** (`/crm/bookings/new`).
- The system generates an official booking contract (`BK-XXXXXX`), schedules the ceremony events, and automatically spawns a 5-stage delivery pipeline.

---

## 5. Operations & Production Delivery

### 1. Crew Dispatch & Schedule
- View your calendar schedule in `/crm/schedule`.
- Assign primary cinematographers and second-shooters to individual ceremony events.
- Conflict detection alerts you if a crew member is double-booked on overlapping nuptial dates.

### 2. Sequential Delivery Pipeline (`/crm/delivery`)
Every wedding project moves sequentially through 5 production stages:
1. **Raw Footage Ingest & Verification** — Backup camera cards to local NVMe RAID storage.
2. **Culling & Rough Cut** — Select best takes and create trailer narrative timeline.
3. **Color Grading & Sound Master** — Apply film LUTs, mix vows audio, color match ceremony footage.
4. **Client Proofing & Revisions** — Generate a secure 30-day proofing link for the couple (`/delivery/[token]`).
5. **Final Archive & Master Dispatch** — Upload 4K masters, deliver USB keepsake box.

---

## 6. Financial Ledger & Invoicing

### 1. Tax Invoices & Receipts
- Generate GST-compliant invoices (`/crm/invoices/new`) with progressive milestones (Advance Deposit, Production Midway, Final Delivery).
- Record payments received via UPI, NEFT, IMPS, or Card.
- An official numbered receipt (`RCP-XXXXXX`) is generated instantly with payment stamp and GST ledger allocation.

### 2. Studio Ledger & Expenses
- Track studio operating expenses (`/crm/expenses`) categorized by production gear rental, crew travel, music licensing, and studio overhead.
- View real-time cash flow in `/crm/ledger` and export CSV ledgers safely.

---

## 7. Client Reviews & Website Showcase

1. **Requesting a Review:**
   - When the wedding project is marked complete, click **Send Review Request** from the booking page.
   - The couple receives a single-use review link (`/review/[token]`) valid for 30 days.
2. **Review Submission:**
   - The couple rates overall experience, cinematography quality, communication, and punctuality, and leaves a personal testimonial.
3. **Moderation & Public Carousel:**
   - Navigate to `/crm/reviews`.
   - Business owners approve testimonials.
   - Approved reviews appear instantly on the public website carousel (`/reviews`) with aggregate schema markup (JSON-LD) for Google search results.

---

## 8. Role-Based Permissions Reference

| Feature | System Admin | Business Owner | Manager | Accountant | Crew Member |
|---|:---:|:---:|:---:|:---:|:---:|
| Studio Settings & Branding | Yes | Yes | Read Only | No | No |
| Data Management & Reset | Yes | No | No | No | No |
| Enquiries & Bookings | Yes | Yes | Yes | Read Only | View Assigned |
| Delivery Pipelines | Yes | Yes | Yes | No | View Assigned |
| Financial Revenue / Amounts | Yes | Yes | **NO (RBAC R3)** | Yes | No |
| Issue Invoices & Record Payments | Yes | Yes | No | Yes | No |
| Crew Management | Yes | Yes | Yes | Yes | View Profile |
| Review Moderation | Yes | Yes | No | No | No |
