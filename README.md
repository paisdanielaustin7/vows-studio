# VOWS Studio — CRM & Website

Single-business custom CRM and public monograph website for **VOWS Studio**, a premier wedding photography and cinematics team based in Karnataka, India.

---

## Technical Stack

- **Framework:** Next.js 16 (App Router, Node.js 22, Server Actions for authenticated mutations, Route Handlers for public/webhook/PDF endpoints)
- **Route Guard:** `proxy.ts` (Next.js 16 thin session & verified JWT claim checker)
- **Styling & UI:** Tailwind CSS v4, shadcn/ui (Radix Primitives), Lucide icons
- **Visual Design Identity:** "Serene Editorial" (muted sage green `#4C6452` / `#829B87` palette, Inter UI typography, Cormorant Garamond headings)
- **Monetary Engine:** Integer paise (`bigint`), basis points (`_bps`), round-half-up, strictly isolated in `lib/money` with 100% test coverage
- **Database & Auth:** Supabase (PostgreSQL 15+, Supabase Auth with mandatory TOTP MFA for SysAdmin & Business Owner, Row-Level Security on every table)
- **Document & Communications:** `@react-pdf/renderer` Route Handlers, connected studio Gmail API via OAuth2, React Email templates
- **Quality Gates:** Vitest (unit & integration), Playwright (E2E), Supabase CLI local harness

---

## Directory Layout (No `src/`)

```
├── app/                  # Next.js App Router (Public site, CRM, Admin, Auth, APIs)
├── components/           # React UI components (shadcn primitives & composed widgets)
├── lib/                  # Pure utility modules (money, auth, validations, utils, pdf, gmail)
│   ├── money/            # Pure BigInt paise financial computation engine
│   ├── utils/            # IST dates, Indian FY, E.164 phone, crypto helpers
│   ├── validations/      # Shared Zod schemas
│   └── supabase/         # SSR & Admin Supabase clients
├── server/               # Server Actions (actions/) and server queries (queries/)
├── types/                # Strict TypeScript definitions & database schemas
├── supabase/             # Local Supabase CLI configuration, migrations, seeds, tests
├── tests/                # Unit, integration (RLS matrix), and Playwright E2E suites
├── emails/               # React Email layouts
├── docs/                 # Authoritative project specification & decision documents
├── stitch-screens/       # 90 approved Stitch UI design reference screens + tokens
└── public/               # Static assets & brand media
```

---

## Local Setup

### 1. Prerequisites
- Node.js 20.9+ (Node 22 LTS recommended)
- Docker Desktop or Docker engine (for local Supabase CLI)
- Supabase CLI (`npm install -g supabase` or brew)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Fill in the local credentials per `docs/GLOSSARY_AND_ENUMS.md` §9.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the public website or [http://localhost:3000/dev/components](http://localhost:3000/dev/components) for the component gallery.

---

## Development Scripts

| Command | Action |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Compile Next.js production build |
| `npm run lint` | Run ESLint static analysis |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`) |
| `npm run test` | Run Vitest unit tests |
| `npm run test:coverage` | Run unit tests with mandatory 100% coverage on `lib/money` |
| `npm run test:integration`| Run integration tests against local Supabase stack |
| `npm run db:reset` | Reset and re-seed local Supabase database |
| `npm run db:test` | Run pgTAP database tests in Supabase |
| `npm run types:generate` | Regenerate TypeScript database types from local Postgres schema |

---

## Branching Model

- `main` — Production-ready release branch deployed to Vercel Pro production.
- `dev` — Integration trunk. Phase branches merge here once Definition of Done is met.
- `phase-N-<name>` — Feature branches for sequential phase deliverables (`phase-0-foundation`, `phase-1-auth`, etc.).
