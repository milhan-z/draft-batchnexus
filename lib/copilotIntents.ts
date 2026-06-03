// ─────────────────────────────────────────────────────────────────────────────
// BatchNexus — Ops Copilot Intent Engine (rule-based, deterministic)
//
// Parses a natural-language question into a known operational intent and builds
// a structured response from REAL operational records (via the API client,
// which falls back to the local demo store). No LLM, no autonomous actions.
//
// Every operational action is surfaced as a *suggested* action only — the UI
// layer requires human confirmation and writes an audit log before anything
// mutates data.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchItems } from "./api/client";
import { validateSlotAssignment, type LotForValidation } from "./slotValidation";
import { canAssignSlot, type UserRole } from "./rbac";

// ── Intent taxonomy ──────────────────────────────────────────
export type CopilotIntent =
  | "lot_location"
  | "lot_timeline"
  | "samples_using_lot"
  | "blocked_batches"
  | "cold_chain_alerts"
  | "explain_slot"
  | "assign_recommended_slot"
  | "audit_integrity"
  | "operations_summary"
  | "explain_qc_score"
  | "what_to_review"
  | "what_if_approve"
  | "export_compliance"
  | "next_actions"
  | "unknown";

// ── Response block model ─────────────────────────────────────
export type ResponseBlock =
  | { type: "text"; text: string }
  | {
      type: "record";
      title: string;
      subtitle?: string;
      icon?: string;
      tone?: "neutral" | "success" | "warning" | "danger";
      fields: { label: string; value: string }[];
    }
  | {
      type: "list";
      title?: string;
      items: { primary: string; secondary?: string; icon?: string }[];
    }
  | {
      type: "risk";
      severity: "info" | "warning" | "danger";
      title: string;
      body: string;
    };

export interface CopilotSource {
  collection: string;
  label: string;
}

export type CopilotActionDef =
  | {
      id: string;
      kind: "navigate";
      label: string;
      href: string;
      icon?: string;
      variant?: "primary" | "secondary";
      description?: string;
    }
  | {
      id: string;
      kind: "confirm";
      label: string;
      icon?: string;
      variant?: "primary" | "secondary";
      description?: string;
      confirm: {
        title: string;
        body: string;
        confirmLabel: string;
        audit: { action: string; entity: string; detail: string };
        // Optional data mutation run on confirm. Pure side-effect.
        mutate?: () => Promise<void>;
        // Success message shown after confirmation.
        successText: string;
      };
    };

export interface CopilotResponse {
  intent: CopilotIntent;
  blocks: ResponseBlock[];
  sources: CopilotSource[];
  actions: CopilotActionDef[];
}

export interface CopilotContext {
  role: UserRole | string;
  page: string; // base route, e.g. "/warehouse"
  selectedLot?: string | null; // e.g. "LOT-2026-051"
}

// ── Friendly source labels ───────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  lots: "Lot record",
  qc_inspections: "QC inspection",
  inventory_moves: "Inventory move",
  audit_logs: "Audit log",
  warehouse_zones: "Warehouse zones",
  warehouse_bins: "Warehouse bins",
  sample_dispatches: "Sample dispatches",
  inbound_receipts: "Inbound receipts",
  materials: "Material profile",
  temperature_readings: "Temperature readings",
  users: "Personnel",
};

function src(...collections: string[]): CopilotSource[] {
  return collections.map((c) => ({ collection: c, label: SOURCE_LABELS[c] || c }));
}

// ── Data access (client-side; falls back to demo store) ──────
async function getC<T = any>(collection: string): Promise<T[]> {
  try {
    const r = await fetchItems<T>(collection, { limit: 300 });
    return (r.data as T[]) || [];
  } catch {
    return [];
  }
}

// ── Light parsing helpers ────────────────────────────────────
const LOT_RE = /LOT-\d{4}-\d{2,4}/i;
const ZONE_RE = /\b(AMB-A|COLD-B|FRZ-C|HAZ-D|HOLD-QC)\b/i;

function extractLot(q: string, ctx: CopilotContext): string | null {
  const m = q.match(LOT_RE);
  if (m) return m[0].toUpperCase();
  return ctx.selectedLot ? ctx.selectedLot.toUpperCase() : null;
}

function extractZone(q: string): string | null {
  const m = q.match(ZONE_RE);
  return m ? m[1].toUpperCase() : null;
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Intent detection (most specific first) ───────────────────
export function detectIntent(input: string, ctx: CopilotContext): CopilotIntent {
  const q = input.toLowerCase();

  if ((q.includes("integrity") || q.includes("hash") || q.includes("tamper") || q.includes("fingerprint")))
    return "audit_integrity";

  if (q.includes("export") || q.includes("compliance report"))
    return "export_compliance";

  if (q.includes("assign") && (q.includes("recommend") || q.includes("slot") || q.includes("warehouse")))
    return "assign_recommended_slot";

  if ((q.includes("why") || q.includes("explain")) && (q.includes("slot") || q.includes("block") || ZONE_RE.test(input)))
    return "explain_slot";

  if (q.includes("blocked") || q.includes("blocked batches") || (q.includes("which") && q.includes("block")))
    return "blocked_batches";

  if (q.includes("cold") || q.includes("temperature") || q.includes("cold-chain") || q.includes("freezer") || (q.includes("alert") && !q.includes("audit")))
    return "cold_chain_alerts";

  if ((q.includes("timeline") || q.includes("trace") || q.includes("history")) && (LOT_RE.test(input) || ctx.selectedLot))
    return "lot_timeline";

  if ((q.includes("sample") || q.includes("dispatch") || q.includes("used")) && (LOT_RE.test(input) || ctx.selectedLot))
    return "samples_using_lot";

  if ((q.includes("where") || q.includes("location") || q.includes("status") || q.includes("find")) && (LOT_RE.test(input) || ctx.selectedLot))
    return "lot_location";

  if (q.includes("what happens") && q.includes("approv"))
    return "what_if_approve";

  if (q.includes("review") || (q.includes("approv") && q.includes("before")) || q.includes("marked for review"))
    return "what_to_review";

  if (q.includes("qc score") || q.includes("ai qc") || (q.includes("explain") && q.includes("score")))
    return "explain_qc_score";

  if (q.includes("summary") || q.includes("overview") || (q.includes("summarize") && q.includes("operation")))
    return "operations_summary";

  if (q.includes("attention") || q.includes("what should i do") || q.includes("next") || q.includes("what needs"))
    return "next_actions";

  // Bare lot reference defaults to a location lookup.
  if (LOT_RE.test(input)) return "lot_location";

  return "unknown";
}

// ── Recommended-slot computation ─────────────────────────────
function buildLotForValidation(lot: any, material: any): LotForValidation {
  return {
    id: lot.id,
    lot_number: lot.lot_number,
    material_id: lot.material_id,
    hazard_class: material?.hazard_class || "Normal",
    temp_min: material?.temp_min ?? 15,
    temp_max: material?.temp_max ?? 30,
  };
}

function findRecommendedSlot(lotV: LotForValidation, zones: any[], bins: any[]) {
  const available = bins.filter(
    (b) => (b.status && b.status.toLowerCase() === "available") || (b.capacity ?? 0) > (b.occupied ?? 0)
  );
  for (const bin of available) {
    const zone = zones.find((z) => z.id === bin.zone_id);
    if (!zone) continue;
    const result = validateSlotAssignment(lotV, zone, {
      id: bin.id,
      zone_id: bin.zone_id,
      bin_code: bin.bin_code,
    });
    if (result.valid) return { bin, zone };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Intent handlers
// ─────────────────────────────────────────────────────────────

async function handleLotLocation(q: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const lotNum = extractLot(q, ctx);
  const [lots, materials, dispatches, qc, users] = await Promise.all([
    getC("lots"),
    getC("materials"),
    getC("sample_dispatches"),
    getC("qc_inspections"),
    getC("users"),
  ]);

  if (!lotNum) {
    return {
      intent: "lot_location",
      blocks: [{ type: "text", text: "Tell me which lot to locate, for example “Where is LOT-2026-051?”." }],
      sources: src("lots"),
      actions: [{ id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "secondary" }],
    };
  }

  const lot = lots.find((l: any) => l.lot_number === lotNum);
  if (!lot) {
    return {
      intent: "lot_location",
      blocks: [{ type: "risk", severity: "warning", title: "Lot not found", body: `${lotNum} is not in the operational records yet. It may not have been created from a receipt.` }],
      sources: src("lots"),
      actions: [{ id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "secondary" }],
    };
  }

  const material = materials.find((m: any) => m.id === lot.material_id);
  const lotDispatches = dispatches.filter((d: any) => d.lot_number === lotNum);
  const insp = qc.find((i: any) => i.receipt_id === lot.source_receipt_id || i.receipt_id === lot.receipt_id);
  const inspector = insp ? users.find((u: any) => u.id === insp.inspected_by) : null;

  const fields: { label: string; value: string }[] = [
    { label: "Status", value: lot.status },
    { label: "Location", value: lot.current_location || "No warehouse slot assigned" },
    { label: "Material", value: material?.name || lot.material_id },
    { label: "Quantity", value: String(lot.quantity ?? "—") },
  ];
  if (insp) {
    fields.push({ label: "QC", value: `${insp.human_decision}${inspector ? ` by ${inspector.name}` : ""}` });
  }
  fields.push({ label: "Related dispatches", value: String(lotDispatches.length) });

  const actions: CopilotActionDef[] = [];
  if (lot.current_location) {
    actions.push({ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" });
  }
  actions.push({ id: "open-timeline", kind: "navigate", label: "Open lot timeline", href: "/lots", icon: "timeline", variant: "secondary" });
  if (lotDispatches.length > 0) {
    actions.push({ id: "open-dispatch", kind: "navigate", label: "Open dispatch records", href: "/dispatch", icon: "send", variant: "secondary" });
  }

  return {
    intent: "lot_location",
    blocks: [
      {
        type: "record",
        title: lotNum,
        subtitle: lot.current_location ? `Stored in ${lot.current_location}` : "Awaiting warehouse slot",
        icon: "inventory_2",
        tone: lot.status === "Blocked" ? "danger" : lot.status === "On Hold" ? "warning" : "success",
        fields,
      },
    ],
    sources: insp
      ? src("lots", "qc_inspections", "inventory_moves", "sample_dispatches")
      : src("lots", "inventory_moves", "sample_dispatches"),
    actions,
  };
}

async function handleLotTimeline(q: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const lotNum = extractLot(q, ctx);
  const [lots, moves, dispatches, audit] = await Promise.all([
    getC("lots"),
    getC("inventory_moves"),
    getC("sample_dispatches"),
    getC("audit_logs"),
  ]);

  if (!lotNum) {
    return {
      intent: "lot_timeline",
      blocks: [{ type: "text", text: "Which lot's timeline would you like? Try “Show timeline for LOT-2026-051”." }],
      sources: src("audit_logs"),
      actions: [{ id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "secondary" }],
    };
  }

  const lot = lots.find((l: any) => l.lot_number === lotNum);
  const events: { primary: string; secondary?: string; icon?: string; ts: string }[] = [];

  if (lot?.date_created) events.push({ primary: "Lot created from receipt", secondary: lot.source_receipt_id, icon: "add_circle", ts: lot.date_created });

  audit
    .filter((a: any) => a.entity === lotNum || (a.change_detail && String(a.change_detail).includes(lotNum)))
    .forEach((a: any) => events.push({ primary: a.action, secondary: `${a.actor} • ${a.change_detail}`, icon: "history_edu", ts: a.timestamp || a.date_created }));

  moves
    .filter((m: any) => m.lot_id === lotNum)
    .forEach((m: any) => events.push({ primary: "Warehouse move", secondary: `${m.to_bin_id} • ${m.moved_by} • ${m.reason}`, icon: "move_down", ts: m.moved_at || m.date_created }));

  dispatches
    .filter((d: any) => d.lot_number === lotNum)
    .forEach((d: any) => events.push({ primary: `Dispatch — ${d.destination}`, secondary: `${d.customer_name} • ${d.status}`, icon: "send", ts: d.date_created }));

  events.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

  if (events.length === 0) {
    return {
      intent: "lot_timeline",
      blocks: [{ type: "risk", severity: "warning", title: "No timeline events", body: `No traceability events were found for ${lotNum}.` }],
      sources: src("audit_logs", "inventory_moves", "sample_dispatches"),
      actions: [{ id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "secondary" }],
    };
  }

  return {
    intent: "lot_timeline",
    blocks: [
      { type: "text", text: `Full traceability for ${lotNum} — ${events.length} recorded event${events.length > 1 ? "s" : ""}.` },
      {
        type: "list",
        title: "Timeline",
        items: events.map((e) => ({ primary: `${fmtTime(e.ts)} — ${e.primary}`, secondary: e.secondary, icon: e.icon })),
      },
    ],
    sources: src("lots", "audit_logs", "inventory_moves", "sample_dispatches"),
    actions: [
      { id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "primary" },
      { id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" },
    ],
  };
}

async function handleLotDispatches(q: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const lotNum = extractLot(q, ctx);
  const dispatches = await getC("sample_dispatches");

  if (!lotNum) {
    return {
      intent: "samples_using_lot",
      blocks: [{ type: "text", text: "Which lot? Try “Which samples used LOT-2026-051?”." }],
      sources: src("sample_dispatches"),
      actions: [{ id: "open-dispatch", kind: "navigate", label: "Open dispatch records", href: "/dispatch", icon: "send", variant: "secondary" }],
    };
  }

  const rows = dispatches.filter((d: any) => d.lot_number === lotNum);
  if (rows.length === 0) {
    return {
      intent: "samples_using_lot",
      blocks: [{ type: "text", text: `No sample dispatches are linked to ${lotNum}.` }],
      sources: src("sample_dispatches"),
      actions: [{ id: "open-dispatch", kind: "navigate", label: "Open dispatch records", href: "/dispatch", icon: "send", variant: "secondary" }],
    };
  }

  return {
    intent: "samples_using_lot",
    blocks: [
      { type: "text", text: `${lotNum} is linked to ${rows.length} sample dispatch${rows.length > 1 ? "es" : ""}.` },
      {
        type: "list",
        items: rows.map((d: any) => ({
          primary: `${d.customer_name} — ${d.destination}`,
          secondary: `${d.dispatch_type} • ${d.quantity_sample}kg • ${d.status}`,
          icon: "send",
        })),
      },
    ],
    sources: src("lots", "sample_dispatches"),
    actions: [{ id: "open-dispatch", kind: "navigate", label: "Open dispatch records", href: "/dispatch", icon: "send", variant: "primary" }],
  };
}

async function handleBlocked(): Promise<CopilotResponse> {
  const [lots, receipts] = await Promise.all([getC("lots"), getC("inbound_receipts")]);
  const blockedLots = lots.filter((l: any) => l.status === "Blocked");
  const onHold = lots.filter((l: any) => l.status === "On Hold");
  const blockedReceipts = receipts.filter((r: any) => r.status === "Blocked");

  if (blockedLots.length === 0 && onHold.length === 0 && blockedReceipts.length === 0) {
    return {
      intent: "blocked_batches",
      blocks: [{ type: "text", text: "No blocked or on-hold batches right now. All materials are progressing normally." }],
      sources: src("lots", "inbound_receipts"),
      actions: [{ id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "secondary" }],
    };
  }

  const items: { primary: string; secondary?: string; icon?: string }[] = [];
  blockedLots.forEach((l: any) => items.push({ primary: `${l.lot_number} — Blocked`, secondary: `Material ${l.material_id} • requires manager attention`, icon: "block" }));
  onHold.forEach((l: any) => items.push({ primary: `${l.lot_number} — On Hold`, secondary: `Material ${l.material_id}`, icon: "pause_circle" }));
  blockedReceipts.forEach((r: any) => items.push({ primary: `${r.receipt_no} — Blocked at intake`, secondary: `QC blocked`, icon: "report" }));

  return {
    intent: "blocked_batches",
    blocks: [
      { type: "risk", severity: "warning", title: `${items.length} batch${items.length > 1 ? "es" : ""} need attention`, body: "These records are blocked or on hold and cannot progress without a human decision." },
      { type: "list", items },
    ],
    sources: src("lots", "inbound_receipts", "qc_inspections"),
    actions: [
      { id: "open-lots", kind: "navigate", label: "Open lot traceability", href: "/lots", icon: "inventory_2", variant: "primary" },
      { id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" },
    ],
  };
}

async function handleColdChain(): Promise<CopilotResponse> {
  const zones = await getC("warehouse_zones");
  const alerts = zones.filter((z: any) => z.status === "Cold-chain Alert");

  if (alerts.length === 0) {
    return {
      intent: "cold_chain_alerts",
      blocks: [{ type: "text", text: "No cold-chain alerts at this time. All zones are within their target temperature range." }],
      sources: src("warehouse_zones", "temperature_readings"),
      actions: [{ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "secondary" }],
    };
  }

  return {
    intent: "cold_chain_alerts",
    blocks: [
      { type: "risk", severity: "danger", title: `${alerts.length} cold-chain alert${alerts.length > 1 ? "s" : ""}`, body: "One or more zones are outside their required temperature range. Immediate attention is required." },
      {
        type: "list",
        items: alerts.map((z: any) => ({
          primary: `${z.id} (${z.name})`,
          secondary: `Current ${z.current_temperature}°C — required ${z.temp_min}°C to ${z.temp_max}°C`,
          icon: "ac_unit",
        })),
      },
    ],
    sources: src("warehouse_zones", "temperature_readings"),
    actions: [
      { id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" },
      { id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" },
    ],
  };
}

async function handleExplainSlot(q: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const zoneCode = extractZone(q);
  const [zones, lots, materials, bins] = await Promise.all([
    getC("warehouse_zones"),
    getC("lots"),
    getC("materials"),
    getC("warehouse_bins"),
  ]);

  // If a specific zone is referenced, explain its policy.
  if (zoneCode) {
    const zone = zones.find((z: any) => z.id === zoneCode);
    if (zone) {
      const policy = String(zone.hazard_policy || "").toLowerCase();
      const restrictsFlammable = policy.includes("no flammable") || policy.includes("qc hold");
      const lotNum = extractLot(q, ctx);
      const lot = lotNum ? lots.find((l: any) => l.lot_number === lotNum) : null;
      const material = lot ? materials.find((m: any) => m.id === lot.material_id) : null;

      const blocks: ResponseBlock[] = [];
      if (lot && material && restrictsFlammable && material.hazard_class === "Flammable") {
        blocks.push({
          type: "risk",
          severity: "danger",
          title: "Policy violation detected",
          body: `${zone.id} rejected: ${material.name} is a flammable material and ${zone.name} (${zone.id}) policy is "${zone.hazard_policy}", which does not allow flammable materials.`,
        });
      } else {
        blocks.push({
          type: "record",
          title: `${zone.id} — ${zone.name}`,
          subtitle: zone.status,
          icon: "warehouse",
          tone: zone.status === "Cold-chain Alert" ? "danger" : "neutral",
          fields: [
            { label: "Hazard policy", value: zone.hazard_policy },
            { label: "Temperature range", value: `${zone.temp_min}°C to ${zone.temp_max}°C` },
            { label: "Current temperature", value: `${zone.current_temperature}°C` },
            { label: "Occupancy", value: `${zone.occupied}/${zone.capacity}` },
          ],
        });
        blocks.push({
          type: "text",
          text: restrictsFlammable
            ? `${zone.id} only accepts non-flammable materials. Flammable lots must go to a hazard-compatible zone.`
            : `${zone.id} accepts materials that match its policy and temperature range.`,
        });
      }

      // Recommend a hazard-compatible slot if relevant.
      const actions: CopilotActionDef[] = [];
      const hazZone = zones.find((z: any) => String(z.hazard_policy || "").toLowerCase().includes("flammable allowed"));
      if (restrictsFlammable && hazZone) {
        const hazBin = bins.find((b: any) => b.zone_id === hazZone.id && ((b.status && b.status.toLowerCase() === "available") || (b.capacity ?? 0) > (b.occupied ?? 0)));
        blocks.push({ type: "text", text: `Recommended: use ${hazZone.id} (${hazZone.name})${hazBin ? `, slot ${hazBin.bin_code}` : ""}, which is hazard-compatible.` });
      }
      actions.push({ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" });
      actions.push({ id: "open-policy", kind: "navigate", label: "View warehouse policy", href: "/policy", icon: "gavel", variant: "secondary" });

      return {
        intent: "explain_slot",
        blocks,
        sources: src("warehouse_zones", "materials", "lots"),
        actions,
      };
    }
  }

  // Generic slotting explanation.
  return {
    intent: "explain_slot",
    blocks: [
      {
        type: "text",
        text: "Slot recommendations are validated against three zone policies before placement: hazard compatibility (e.g. flammable materials only in hazard-compatible zones), temperature range (the zone must encompass the material's required range), and quarantine status (QC-hold zones reject regular placement).",
      },
    ],
    sources: src("warehouse_zones", "materials", "warehouse_bins"),
    actions: [
      { id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" },
      { id: "open-policy", kind: "navigate", label: "View warehouse policy", href: "/policy", icon: "gavel", variant: "secondary" },
    ],
  };
}

async function handleAssignSlot(q: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const [lots, materials, zones, bins] = await Promise.all([
    getC("lots"),
    getC("materials"),
    getC("warehouse_zones"),
    getC("warehouse_bins"),
  ]);

  const lotNum = extractLot(q, ctx);
  let lot = lotNum ? lots.find((l: any) => l.lot_number === lotNum) : null;
  // Otherwise pick the first lot awaiting a warehouse slot.
  if (!lot) {
    lot = lots.find((l: any) => !l.current_location && ["Awaiting Slot", "QC Released", "Ready for Warehouse"].includes(l.status));
  }

  if (!lot) {
    return {
      intent: "assign_recommended_slot",
      blocks: [{ type: "text", text: "There are no lots awaiting a warehouse slot right now." }],
      sources: src("lots", "warehouse_bins"),
      actions: [{ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "secondary" }],
    };
  }

  const material = materials.find((m: any) => m.id === lot.material_id);
  const lotV = buildLotForValidation(lot, material);
  const rec = findRecommendedSlot(lotV, zones, bins);

  if (!rec) {
    return {
      intent: "assign_recommended_slot",
      blocks: [{ type: "risk", severity: "warning", title: "No compatible slot available", body: `No available slot currently satisfies the hazard and temperature policy for ${lot.lot_number} (${material?.name || lot.material_id}). Review warehouse capacity.` }],
      sources: src("lots", "materials", "warehouse_zones", "warehouse_bins"),
      actions: [{ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" }],
    };
  }

  const canDo = canAssignSlot(ctx.role);
  const blocks: ResponseBlock[] = [
    {
      type: "record",
      title: `Recommended slot for ${lot.lot_number}`,
      subtitle: `${rec.zone.id} • ${rec.bin.bin_code}`,
      icon: "shelf_position",
      tone: "success",
      fields: [
        { label: "Material", value: material?.name || lot.material_id },
        { label: "Hazard class", value: lotV.hazard_class },
        { label: "Required temp", value: `${lotV.temp_min}°C to ${lotV.temp_max}°C` },
        { label: "Zone", value: `${rec.zone.name} (${rec.zone.id})` },
        { label: "Zone policy", value: rec.zone.hazard_policy },
        { label: "Slot", value: rec.bin.bin_code },
      ],
    },
    { type: "text", text: "This passes hazard, temperature, and quarantine policy checks." },
  ];

  const actions: CopilotActionDef[] = [];
  if (canDo) {
    const lotId = lot.id;
    const lotNumber = lot.lot_number;
    const lotQty = lot.quantity;
    const bin = rec.bin;
    actions.push({
      id: "assign-confirm",
      kind: "confirm",
      label: "Review & confirm",
      icon: "task_alt",
      variant: "primary",
      description: "This action will require confirmation and will be audit-logged.",
      confirm: {
        title: `Assign ${lotNumber} to ${bin.bin_code}?`,
        body: `This moves ${lotNumber} (${material?.name || lot.material_id}) into ${rec.zone.id} slot ${bin.bin_code} and marks it Stored. A warehouse move record and an audit entry will be created.`,
        confirmLabel: "Confirm & log",
        audit: {
          action: "Assigned warehouse slot",
          entity: lotNumber,
          detail: `${lotNumber} assigned to ${bin.bin_code} via Ops Copilot. Human-confirmed.`,
        },
        successText: `${lotNumber} assigned to ${bin.bin_code}. Move recorded and audit-logged.`,
        mutate: async () => {
          const { updateItem, createItem } = await import("./api/client");
          await updateItem("lots", lotId, { current_location: bin.bin_code, status: "Stored" });
          await createItem("inventory_moves", {
            lot_id: lotNumber,
            to_bin_id: bin.id,
            quantity: lotQty,
            moved_at: new Date().toISOString(),
            reason: "Assigned via Ops Copilot (human-confirmed)",
          });
        },
      },
    });
    actions.push({ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "secondary" });
  } else {
    blocks.push({ type: "risk", severity: "info", title: "Confirmation needed from Warehouse Admin", body: `Your role (${ctx.role}) can view this recommendation, but assigning a slot requires a Warehouse Admin or Operations Manager.` });
    actions.push({ id: "open-wh", kind: "navigate", label: "Open warehouse", href: "/warehouse", icon: "warehouse", variant: "primary" });
  }

  return {
    intent: "assign_recommended_slot",
    blocks,
    sources: src("lots", "materials", "warehouse_zones", "warehouse_bins"),
    actions,
  };
}

async function handleAuditIntegrity(): Promise<CopilotResponse> {
  const audit = await getC("audit_logs");
  return {
    intent: "audit_integrity",
    blocks: [
      {
        type: "text",
        text: `Visible audit events carry demo SHA-256 fingerprints derived from each entry's canonical fields (timestamp, actor, role, action, entity, change detail). This demonstrates tamper-evident audit patterns — it is not a legal compliance certification.`,
      },
      { type: "text", text: `${audit.length} audit event${audit.length === 1 ? "" : "s"} are currently recorded.` },
    ],
    sources: src("audit_logs"),
    actions: [{ id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "primary" }],
  };
}

async function handleOperationsSummary(): Promise<CopilotResponse> {
  const [lots, zones, dispatches, receipts] = await Promise.all([
    getC("lots"),
    getC("warehouse_zones"),
    getC("sample_dispatches"),
    getC("inbound_receipts"),
  ]);

  const byStatus = lots.reduce((acc: Record<string, number>, l: any) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const alerts = zones.filter((z: any) => z.status === "Cold-chain Alert");
  const pendingQC = receipts.filter((r: any) => r.status === "Pending QC").length;

  return {
    intent: "operations_summary",
    blocks: [
      {
        type: "record",
        title: "Today's operations",
        icon: "summarize",
        tone: alerts.length > 0 ? "warning" : "neutral",
        fields: [
          { label: "Total lots", value: String(lots.length) },
          { label: "Lots by status", value: Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(", ") || "—" },
          { label: "Pending QC receipts", value: String(pendingQC) },
          { label: "Warehouse zones", value: String(zones.length) },
          { label: "Cold-chain alerts", value: alerts.length > 0 ? `${alerts.length} (${alerts.map((z: any) => z.id).join(", ")})` : "None" },
          { label: "Dispatches", value: String(dispatches.length) },
        ],
      },
    ],
    sources: src("lots", "warehouse_zones", "sample_dispatches", "inbound_receipts"),
    actions: [{ id: "open-summary", kind: "navigate", label: "Open daily summary", href: "/summary", icon: "summarize", variant: "primary" }],
  };
}

async function handleExplainQCScore(): Promise<CopilotResponse> {
  const [inspections, receipts, materials] = await Promise.all([
    getC("qc_inspections"),
    getC("inbound_receipts"),
    getC("materials"),
  ]);
  const latest = inspections[0] as any;
  const receipt = latest ? receipts.find((r: any) => r.id === latest.receipt_id || r.receipt_no === latest.receipt_id) : null;
  const material = receipt ? materials.find((m: any) => m.id === receipt.material_id) : null;

  if (!latest) {
    return {
      intent: "explain_qc_score",
      blocks: [
        {
          type: "text",
          text: "The AI QC score combines colour match, uniformity, visible defect risk, foreign-matter risk, and confidence. Final release remains a human QC decision.",
        },
      ],
      sources: src("qc_inspections", "inbound_receipts", "materials"),
      actions: [{ id: "open-qc", kind: "navigate", label: "Open QC release", href: "/qc", icon: "biotech", variant: "primary" }],
    };
  }

  return {
    intent: "explain_qc_score",
    blocks: [
      {
        type: "record",
        title: latest.id || "Latest QC inspection",
        subtitle: material?.name || receipt?.material_id || "Material under review",
        icon: "biotech",
        tone: latest.recommendation === "Block Material" ? "danger" : latest.recommendation === "Needs Review" ? "warning" : "success",
        fields: [
          { label: "Recommendation", value: latest.recommendation || "Pass with human review" },
          { label: "Confidence", value: latest.confidence != null ? `${Math.round(Number(latest.confidence) * 100)}%` : "Baseline" },
          { label: "Colour score", value: String(latest.colour_score ?? "Baseline") },
          { label: "Defect risk", value: latest.defect_risk || "Low" },
          { label: "Foreign matter", value: latest.foreign_matter_risk || "Low" },
          { label: "Reason codes", value: Array.isArray(latest.reason_codes) ? latest.reason_codes.join(", ") : "Recorded in QC profile" },
        ],
      },
      {
        type: "text",
        text: "AI supports the first inspection layer. Final release remains human-approved and audit-logged.",
      },
    ],
    sources: src("qc_inspections", "inbound_receipts", "materials"),
    actions: [{ id: "open-qc", kind: "navigate", label: "Open QC release", href: "/qc", icon: "biotech", variant: "primary" }],
  };
}

async function handleWhatToReview(): Promise<CopilotResponse> {
  return {
    intent: "what_to_review",
    blocks: [
      {
        type: "text",
        text: "Before approving, review the colour score, defect risk, foreign-matter risk, and the AI confidence level against the material's QC profile. The AI recommendation is decision support only — the final release must be human-approved and is audit-logged.",
      },
      {
        type: "list",
        title: "Checklist",
        items: [
          { primary: "Colour score vs. reference standard", icon: "palette" },
          { primary: "Defect risk and foreign-matter risk", icon: "warning" },
          { primary: "AI confidence and reason codes", icon: "neurology" },
          { primary: "Human decision recorded with attribution", icon: "verified_user" },
        ],
      },
    ],
    sources: src("qc_inspections", "inbound_receipts", "materials"),
    actions: [{ id: "open-qc", kind: "navigate", label: "Open QC release", href: "/qc", icon: "biotech", variant: "primary" }],
  };
}

async function handleWhatIfApprove(): Promise<CopilotResponse> {
  return {
    intent: "what_if_approve",
    blocks: [
      {
        type: "text",
        text: "If QC approves the receipt, BatchNexus updates the receipt to QC Released, creates a QC inspection, generates a lot record, and places the new lot into the Warehouse pending-slot queue.",
      },
      {
        type: "list",
        title: "After approval",
        items: [
          { primary: "QC inspection is stored with the human decision", icon: "biotech" },
          { primary: "Lot timeline is created from the receipt", icon: "timeline" },
          { primary: "Warehouse can recommend a compliant slot", icon: "warehouse" },
          { primary: "Every decision is audit-logged.", icon: "history_edu" },
        ],
      },
    ],
    sources: src("inbound_receipts", "qc_inspections", "lots", "audit_logs"),
    actions: [{ id: "open-qc", kind: "navigate", label: "Review & confirm", href: "/qc", icon: "task_alt", variant: "primary" }],
  };
}

async function handleExportCompliance(): Promise<CopilotResponse> {
  const audit = await getC("audit_logs");
  const approvals = audit.filter((a: any) => String(a.action || "").toLowerCase().includes("qc"));
  return {
    intent: "export_compliance",
    blocks: [
      {
        type: "risk",
        severity: "info",
        title: "Compliance export requires confirmation",
        body: "I can gather the audit, QC, warehouse, and dispatch records needed for an export pack, but generating or exporting the report should be confirmed in the audit module.",
      },
      {
        type: "record",
        title: "Compliance pack preview",
        icon: "assignment",
        fields: [
          { label: "Audit events", value: String(audit.length) },
          { label: "QC-related events", value: String(approvals.length) },
          { label: "Integrity", value: "Fingerprint check available in Audit Log" },
          { label: "Status", value: "Ready for human review" },
        ],
      },
    ],
    sources: src("audit_logs", "qc_inspections", "inventory_moves", "sample_dispatches"),
    actions: [{ id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "primary" }],
  };
}

async function handleNextActions(): Promise<CopilotResponse> {
  const [lots, zones, receipts] = await Promise.all([
    getC("lots"),
    getC("warehouse_zones"),
    getC("inbound_receipts"),
  ]);

  const items: { primary: string; secondary?: string; icon?: string }[] = [];
  const alerts = zones.filter((z: any) => z.status === "Cold-chain Alert");
  const blocked = lots.filter((l: any) => l.status === "Blocked");
  const awaitingSlot = lots.filter((l: any) => !l.current_location && ["Awaiting Slot", "QC Released", "Ready for Warehouse"].includes(l.status));
  const pendingQC = receipts.filter((r: any) => r.status === "Pending QC");
  const needsReview = receipts.filter((r: any) => r.status === "Needs Review");

  if (alerts.length) items.push({ primary: `${alerts.length} cold-chain alert${alerts.length > 1 ? "s" : ""}`, secondary: alerts.map((z: any) => z.id).join(", "), icon: "ac_unit" });
  if (blocked.length) items.push({ primary: `${blocked.length} blocked lot${blocked.length > 1 ? "s" : ""}`, secondary: blocked.map((l: any) => l.lot_number).join(", "), icon: "block" });
  if (needsReview.length) items.push({ primary: `${needsReview.length} receipt${needsReview.length > 1 ? "s" : ""} need review`, secondary: needsReview.map((r: any) => r.receipt_no).join(", "), icon: "rate_review" });
  if (pendingQC.length) items.push({ primary: `${pendingQC.length} receipt${pendingQC.length > 1 ? "s" : ""} pending QC`, secondary: pendingQC.map((r: any) => r.receipt_no).join(", "), icon: "biotech" });
  if (awaitingSlot.length) items.push({ primary: `${awaitingSlot.length} lot${awaitingSlot.length > 1 ? "s" : ""} awaiting a warehouse slot`, secondary: awaitingSlot.map((l: any) => l.lot_number).join(", "), icon: "warehouse" });

  if (items.length === 0) {
    return {
      intent: "next_actions",
      blocks: [{ type: "text", text: "Nothing urgent is outstanding. No alerts, blocks, or pending reviews right now." }],
      sources: src("lots", "warehouse_zones", "inbound_receipts"),
      actions: [{ id: "open-dash", kind: "navigate", label: "Open dashboard", href: "/", icon: "dashboard", variant: "secondary" }],
    };
  }

  return {
    intent: "next_actions",
    blocks: [
      { type: "text", text: `${items.length} item${items.length > 1 ? "s" : ""} need attention, in priority order:` },
      { type: "list", items },
    ],
    sources: src("lots", "warehouse_zones", "inbound_receipts"),
    actions: [
      { id: "open-dash", kind: "navigate", label: "Open dashboard", href: "/", icon: "dashboard", variant: "primary" },
      { id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" },
    ],
  };
}

function handleUnknown(): CopilotResponse {
  return {
    intent: "unknown",
    blocks: [
      {
        type: "text",
        text: "I answer from operational records across lots, QC, warehouse, dispatch, and audit. Try one of these:",
      },
      {
        type: "list",
        items: [
          { primary: "Where is LOT-2026-051?", icon: "my_location" },
          { primary: "Why is COLD-B blocked?", icon: "help" },
          { primary: "Any cold-chain alerts today?", icon: "ac_unit" },
          { primary: "Which lots are blocked?", icon: "block" },
          { primary: "Assign this lot to the recommended slot", icon: "shelf_position" },
          { primary: "Show audit integrity status", icon: "verified" },
        ],
      },
    ],
    sources: src("lots", "warehouse_zones", "qc_inspections", "sample_dispatches", "audit_logs"),
    actions: [],
  };
}

// ── Public entry point ───────────────────────────────────────
export async function runCopilot(input: string, ctx: CopilotContext): Promise<CopilotResponse> {
  const intent = detectIntent(input, ctx);
  try {
    switch (intent) {
      case "lot_location":
        return await handleLotLocation(input, ctx);
      case "lot_timeline":
        return await handleLotTimeline(input, ctx);
      case "samples_using_lot":
        return await handleLotDispatches(input, ctx);
      case "blocked_batches":
        return await handleBlocked();
      case "cold_chain_alerts":
        return await handleColdChain();
      case "explain_slot":
        return await handleExplainSlot(input, ctx);
      case "assign_recommended_slot":
        return await handleAssignSlot(input, ctx);
      case "audit_integrity":
        return await handleAuditIntegrity();
      case "operations_summary":
        return await handleOperationsSummary();
      case "explain_qc_score":
        return await handleExplainQCScore();
      case "what_to_review":
        return await handleWhatToReview();
      case "what_if_approve":
        return await handleWhatIfApprove();
      case "export_compliance":
        return await handleExportCompliance();
      case "next_actions":
        return await handleNextActions();
      default:
        return handleUnknown();
    }
  } catch {
    return {
      intent: "unknown",
      blocks: [{ type: "risk", severity: "warning", title: "Temporary issue", body: "I couldn't read the operational records just now. Please try again in a moment." }],
      sources: [],
      actions: [],
    };
  }
}
