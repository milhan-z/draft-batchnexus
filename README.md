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

## 📸 Screenshots & Features Tour

*(Hackathon Note: Please replace the placeholder images with actual screenshots of your application)*

### 1. Dashboard & KPI
*Provides a real-time executive overview of factory operations. Monitors active cold-chain alerts, tracks total pending items across all departments, and delivers AI-generated insights so managers can make data-driven decisions without digging through spreadsheets.*
<img width="1920" alt="Dashboard" src="https://github.com/user-attachments/assets/59324dc9-c199-47cb-8e44-7fdb6c0e84db" />

### 2. AI Inbound Intake
*Eliminates manual data entry errors. Warehouse operators simply paste text or WhatsApp messages from suppliers, and our Groq (Llama 3.1) AI instantly extracts the material, supplier, quantity, and temperature requirements into a structured form.*
![Inbound](public/screenshots/inbound.png)

### 3. Computer Vision QC
*Revolutionizes quality control with an on-device AI vision engine. It analyzes sample photos pixel-by-pixel to calculate color deviation (ΔE) and detect dark-spot anomalies. It acts as a highly accurate screening assistant before final human sign-off.*
![QC Station](public/screenshots/qc.png)

### 4. PPIC Production Board
*A visual drag-and-drop Kanban board that transforms production planning. PPIC managers can seamlessly move approved lots into staging, ensuring the production line is always fed with QC-cleared materials.*
![PPIC Board](public/screenshots/ppic.png)

### 5. Lot Traceability Timeline
*Solves the biggest compliance headache in manufacturing. Clicking any Lot reveals a visual, end-to-end provenance timeline—tracing exactly when it arrived, who approved the QC, where it was stored, and when it was dispatched.*
![Lots Traceability](public/screenshots/lots.png)

### 6. Smart Warehouse Slotting
*Prevents catastrophic storage errors. Features a visual digital twin of the warehouse with drag-and-drop assignment. The system actively enforces hazard segregation rules and cold-chain temperature limits, rejecting unsafe placements instantly.*
![Warehouse](public/screenshots/warehouse.png)

### 7. Dispatch & Fulfillment
*Streamlines outbound logistics. Allows operations to quickly pack and dispatch released lots or customer samples, updating inventory levels and generating a final audit trail of the material leaving the facility.*
![Dispatch](public/screenshots/dispatch.png)

### 8. Ops Copilot
*A 24/7 intelligent assistant for the factory floor. Instead of navigating menus, staff can ask natural language questions like "Where is Lot 2026-X stored?" and the Copilot instantly retrieves the exact answer from the live operational database.*
![Ops Copilot](public/screenshots/copilot.png)

### 9. AI Operations Summary
*Automates daily reporting. At the end of the shift, the AI analyzes all operational data, bottlenecks, and alerts to generate a professional "Daily Digest", replacing hours of manual reporting work for the plant manager.*
![AI Summary](public/screenshots/summary.png)

### 10. Immutable Audit Log
*The ultimate compliance tool for ISO and FDA standards. Every single action taken in BatchNexus is permanently recorded with the actor's name, role, precise timestamp, and change details. No data can ever be silently altered.*
![Audit Log](public/screenshots/audit.png)

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
