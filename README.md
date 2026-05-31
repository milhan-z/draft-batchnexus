# BatchNexus Control Tower

> One operational brain for intake, QC, lot tracking, warehouse, and dispatch.

**BatchNexus Control Tower** is an AI-assisted manufacturing operations control tower built for **Sima Arôme**, a natural extracts manufacturer serving F&B, cosmetics, and wellness brands. It was created for **CyberHack 2026 — Sima Arôme Manufacturing Innovation Challenge**.

Product promise: **Input once. Trace everything. Slot safely. Answer instantly.**

---

## The Problem

Sima Arôme's operations are fragmented across spreadsheets, notebooks, chats, and disconnected tools:

- **Double data entry** between systems slows work and introduces errors.
- **Manual QC** depends on trained eyes and stalls when staff are unavailable.
- **Spreadsheet warehouse** tracking for drum placement, hazard segregation, and cold-chain (-4°C to -20°C).
- **Low production visibility** — PPIC schedules, lot histories, and dispatch records live in people's heads.

## The Solution

BatchNexus connects the full workflow — inbound intake → QC → lot creation → warehouse slotting → dispatch — into one searchable, auditable source of truth. AI assists at every step, but humans approve every critical decision and everything is audit-logged.

### Coverage of the four official focus areas

| # | Focus Area | How BatchNexus addresses it |
|---|---|---|
| 01 | **Integrated Operations System** | One event-based source of truth from supplier intake to dispatch, eliminating double entry across notebooks/spreadsheets |
| 02 | **AI for Fruit & Raw-Material QC** | In-browser computer-vision screening of sample photos — colour, uniformity, defect & foreign-matter risk |
| 03 | **AI for Extract & Powder QC** | Same vision engine compares a sample against a per-category "golden" colour profile and flags out-of-spec lots |
| 04 | **AI-Assisted Warehousing & Cold-Chain** | Smart slotting with hazard/temperature policy enforcement + live cold-chain trend charts with excursion alerts |

---

## Golden Demo Flow

```
Dashboard → AI Inbound Intake → Submit to QC → AI Visual QC (computer vision) →
Human QC Approval → Lot Timeline Created → Warehouse Smart Slot
Recommendation → Assign Slot → Cold-chain Monitoring → Ops Copilot →
AI Operations Summary → Audit Log
```

---

## Key Features

| Module | What it does |
|---|---|
| Operations Dashboard | Data-driven KPIs, cold-chain alerts, recent lots & audit activity, AI insight |
| AI Inbound Intake | Pastes supplier text/WhatsApp → AI extracts structured receipt fields for human review |
| QC Release Station | **Computer-vision photo screening** (colour delta vs reference, defect & foreign-matter risk) + human Approve / Recheck / Block |
| PPIC Board | Drag-and-drop kanban for production readiness |
| Lot Traceability Timeline | Event-based history built from each lot's real linked records + CSV trace export |
| Warehouse Digital Twin | Zone map, occupancy, smart slot recommendation, policy-blocked zones |
| Cold-chain Monitoring | Per-zone temperature trend charts with safe-range band and automatic excursion flags |
| Ops Copilot | Natural-language queries answered from operational records with source cards |
| AI Operations Summary | Manager-ready daily summary generated from live records |
| Policy Rules | Cold-chain, hazard segregation matrix, QC release, and dispatch policies |
| Audit Log | Immutable ledger: actor, role, action, entity, change, timestamp + CSV export |
| Role Switcher (RBAC) | Six personas with role-scoped permissions and disabled-action states |

### Computer-Vision QC (how it works)

The QC Release Station lets staff **capture or upload a sample photo**. A Canvas-based vision engine (`lib/visionQC.ts`) runs entirely on-device and reports:

- **Colour score & uniformity** from per-pixel luminance statistics
- **Defect risk** from the dark-spot ratio relative to the sample mean
- **Foreign-matter risk** from high-contrast outlier pixels
- **Colour delta (ΔE-style)** against a per-category reference/"golden sample"

It outputs a recommendation (*Pass / Pass with human review / Block*) plus confidence and reason codes. Because it needs no model server or API key, it works reliably offline during a live demo. The result feeds the QC inspection record on approval — but **final release is always human-approved and audit-logged**.

---

## Enterprise Readiness

| Capability | How BatchNexus shows it |
|---|---|
| **RBAC** | Login role selector + topbar role switcher; actions gated via `lib/rbac.ts` with disabled states and tooltips |
| **Audit trail** | Every critical action writes to `audit_logs`; viewable and CSV-exportable in `/audit` |
| **Policy enforcement** | `/policy` rules enforced in QC, warehouse slotting, and dispatch; invalid placements are blocked with reasons |
| **Human-in-the-loop AI** | Every AI output shows recommendation, confidence, reason codes, and a human review note |
| **Traceability** | Lot timeline links receipt → QC → warehouse → dispatch, with exportable trace report |
| **Resilience** | Graceful local fallback (`lib/demoStore.ts`) when the DaaS backend or AI key is unavailable |

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS v4, Mantine, Material Symbols, Material Design 3 tokens
- **Backend:** BuildPad DaaS (Data-as-a-Service) via an internal Next.js API proxy
- **AI:**
  - Document extraction & summaries — Groq (Llama 3.1) with deterministic local fallbacks
  - Visual QC — on-device Canvas computer-vision engine (`lib/visionQC.ts`), no API key required
  - Smart slotting — explainable rules + scoring engine
- **Auth:** Supabase (via BuildPad)
- **Deployment:** AWS Amplify

---

## Demo Data & Resilience

The app ships with a realistic "day of operations" seed (`lib/demoData.ts`): 6 suppliers, 8 materials, 12 inbound receipts, QC inspections, 7 lots across the lifecycle, 5 warehouse zones, cold-chain time series, and dispatch records. When the live DaaS backend or AI key is unavailable, BatchNexus falls back to a local store (`lib/demoStore.ts`) seeded with this data, so every screen stays populated and the golden demo flow always works. Dashboard KPIs are computed from these records — no hard-coded numbers.

---

## User Roles

Receiving Operator · QC Staff · PPIC Planner · Warehouse Admin · Operations Manager · Customer Service

Switch roles from the login page or the topbar role switcher to see permissions change across the app.

---

## Getting Started

Requires Node.js 18.17+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — you'll be redirected to the role selector. Pick a persona (no password required in demo mode) to enter the control tower.

### Environment Configuration

Create a `.env.local` file. The app runs without these (using local fallbacks), but they enable live DaaS and AI:

```env
# Optional — enables live AI extraction & summaries (falls back to a local parser if absent)
GROQ_API_KEY=your_groq_api_key

# Optional — BuildPad DaaS backend (falls back to local demo store if absent)
NEXT_PUBLIC_BUILDPAD_DAAS_URL=your_daas_url
```

> **Security note:** Do not commit real API keys. Keys are read from the environment only. Rotate any key that has previously been committed.

```bash
pnpm build   # production build
pnpm start   # serve production build
```

---

## Project Structure

```
app/            Next.js routes (dashboard, inbound, qc, ppic, lots,
                warehouse, dispatch, copilot, audit, policy, login)
  api/ai/       Groq-backed extraction, QC scoring, copilot, summary
components/     Layout (Sidebar, TopBar, MobileNav) + shared UI
  shared/       AIRecommendationCard, VisualQCAnalyzer, TemperatureChart, StatusBadge
lib/            rbac, demo data & fallback store, DaaS API client,
                visionQC (computer-vision engine), theme
```

---

## Notes

This is a hackathon MVP. AI QC is positioned as a **screening assistant, not a final decision maker** — final release is always human-approved and audit-logged. The on-device vision engine is intentionally lightweight (colour/contrast statistics) so it runs offline during judging; in a pilot it would be replaced by models validated against Sima Arôme's real QC standards and historical inspection data. Extract/powder contamination at trace levels typically needs richer sensing (e.g. hyperspectral imaging), so powder QC here is framed as an early-warning screen rather than a final-release decision.

© 2026 BatchNexus · Built for CyberHack 2026 · Sima Arôme Manufacturing Innovation Challenge
