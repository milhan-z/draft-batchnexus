# 🏭 BatchNexus Control Tower

> One operational brain for intake, QC, lot tracking, warehouse, and dispatch.

**BatchNexus Control Tower** is an AI-assisted manufacturing operations control tower built for **Sima Arôme**, a natural extracts manufacturer serving F&B, cosmetics, and wellness brands. 

Created for **CyberHack 2026 — Sima Arôme Manufacturing Innovation Challenge**.

Product promise: **Input once. Trace everything. Slot safely. Answer instantly.**

---

## 🏆 Submission Links
- **Live Demo Link:** [Insert AWS Amplify / BuildPad URL Here]
- **Pitch Deck:** [Insert Link to Pitch Deck PDF]
- **Demo Video:** [Insert YouTube/Vimeo Link]

---

## 📸 Screenshots

*(Hackathon Note: Please replace these placeholder images with actual screenshots of your application)*

| Dashboard & KPI | AI Inbound Intake |
|:---:|:---:|
| ![Dashboard](public/screenshots/dashboard.png) <br> *Real-time metrics and cold-chain monitoring* | ![Inbound](public/screenshots/inbound.png) <br> *AI Copilot auto-filling DO data* |

| Computer Vision QC | Smart Warehouse Slotting |
|:---:|:---:|
| ![QC Station](public/screenshots/qc.png) <br> *On-device visual analysis for sample screening* | ![Warehouse](public/screenshots/warehouse.png) <br> *Drag-and-drop hazard-aware slotting* |

---

## 🚀 The Problem vs The Solution

### The Problem
Sima Arôme's operations are fragmented across spreadsheets, notebooks, chats, and disconnected tools:
- **Double data entry** between systems slows work and introduces errors.
- **Manual QC** depends on trained eyes and stalls when staff are unavailable.
- **Spreadsheet warehouse** tracking for drum placement, hazard segregation, and cold-chain (-4°C to -20°C).

### The Solution (BatchNexus)
BatchNexus connects the full workflow — inbound intake → QC → lot creation → warehouse slotting → dispatch — into one searchable, auditable source of truth. AI assists at every step, but humans approve every critical decision and everything is audit-logged.

---

## 💻 Installation Steps

Requires **Node.js 18.17+** and **pnpm**.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Arkanzahir/batchnexus.git
   cd batchnexus
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Configuration (Optional):**
   Create a `.env.local` file. The app runs perfectly in offline/fallback mode without these, but they enable live DaaS and Cloud AI:
   ```env
   # Enables live AI extraction & summaries
   GROQ_API_KEY=your_groq_api_key

   # BuildPad DaaS backend
   NEXT_PUBLIC_BUILDPAD_DAAS_URL=https://29dd52b2-e0be-43c7-a587-2c78d2dc107a.daas4.buildpad.ai
   ```

4. **Run the development server:**
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📖 Usage Instructions (The Golden Demo Flow)

To fully experience the BatchNexus capabilities, follow this operational workflow:

1. **Dashboard:** Start here to view high-level plant operations, cold-chain alerts, and the daily AI operations summary.
2. **AI Inbound Intake:** Navigate to `Inbound Intake` -> `New Intake`. Paste supplier text into the AI Assist panel and watch it extract structured receipt fields automatically. Click **Submit to QC**.
3. **QC Release Station:** Navigate to `QC Station`. Select the newly submitted item from the Inspection Queue. View the **Computer-vision photo screening** (colour delta, defect risk) and click **Approve** to generate a Lot.
4. **Lot Traceability:** Go to `Lots` and click on your new Lot to view its full event-based provenance timeline from receipt to QC.
5. **Warehouse Smart Slotting:** Navigate to `Warehouse`. Drag the unassigned Lot from the left panel and drop it into a specific Bin/Zone to assign its location.
6. **Ops Copilot:** Use the chat icon to query the operational database in natural language (e.g., *"Where is Lot 2026-X stored?"*).
7. **Audit Log:** Finally, navigate to `Governance -> Audit Log` to verify that every action taken above was immutably recorded.

---

## ⚙️ Tech Stack & Architecture

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** BuildPad DaaS (Data-as-a-Service) / PostgreSQL
- **AI Integration:** 
  - Groq (Llama 3.1) for document extraction & summarization
  - On-device Canvas computer-vision engine (`lib/visionQC.ts`) for color/defect analysis
- **Resilience:** Graceful local Edge fallback (`lib/demoStore.ts`) ensuring 100% uptime even if the DaaS API goes down.

---
© 2026 BatchNexus · Built for CyberHack 2026 · Sima Arôme Manufacturing Innovation Challenge
