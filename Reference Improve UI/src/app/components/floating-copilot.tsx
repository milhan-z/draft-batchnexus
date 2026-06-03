import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, X, Send, ArrowRight, ShieldCheck, AlertTriangle, Lock,
} from "lucide-react";
import { Button } from "./ui/button";
import { StatusPill } from "./status-pill";
import { lots, zones, auditEvents } from "./mock-data";
import { cn } from "./ui/utils";

type Intent =
  | "lot_location" | "cold_chain_alerts" | "blocked_batches" | "explain_slot"
  | "assign_recommended_slot" | "audit_integrity" | "operations_summary"
  | "explain_qc_score" | "what_to_review" | "export_compliance"
  | "what_if_approve" | "samples_using_lot" | "show_qc_events" | "unknown";

type SourceRef = { collection: string; matched?: string };

type ResponseCard = {
  intent: Intent;
  text: string;
  record?: { title: string; sub: string; status?: string; href?: string };
  alert?: { title: string; body: string; severity: "high" | "med" };
  action?: { title: string; body: string; cta: string; onClick: () => void };
  sources?: SourceRef[];
};

const routeChips: Record<string, { text: string; intent: Intent }[]> = {
  "/": [
    { text: "Any cold-chain alerts today?", intent: "cold_chain_alerts" },
    { text: "What needs attention right now?", intent: "what_to_review" },
    { text: "Summarize today's operations", intent: "operations_summary" },
    { text: "Which lots are blocked?", intent: "blocked_batches" },
  ],
  "/warehouse": [
    { text: "Why is this slot recommended?", intent: "explain_slot" },
    { text: "Why is COLD-B blocked?", intent: "blocked_batches" },
    { text: "Assign to recommended slot", intent: "assign_recommended_slot" },
    { text: "Any cold-chain alerts here?", intent: "cold_chain_alerts" },
  ],
  "/qc": [
    { text: "Explain the AI QC score", intent: "explain_qc_score" },
    { text: "What should I review before approval?", intent: "what_to_review" },
    { text: "What happens if I approve?", intent: "what_if_approve" },
  ],
  "/lots": [
    { text: "Where is this lot?", intent: "lot_location" },
    { text: "Show full timeline", intent: "lot_location" },
    { text: "Which samples used this lot?", intent: "samples_using_lot" },
  ],
  "/audit": [
    { text: "Explain the integrity hash", intent: "audit_integrity" },
    { text: "Show QC approval events", intent: "show_qc_events" },
    { text: "Export compliance report", intent: "export_compliance" },
  ],
  "/dispatch": [
    { text: "What's blocking dispatches?", intent: "blocked_batches" },
    { text: "Summarize today's operations", intent: "operations_summary" },
    { text: "Any cold-chain alerts today?", intent: "cold_chain_alerts" },
  ],
};

const defaultChips = [
  { text: "Summarize today's operations", intent: "operations_summary" as Intent },
  { text: "Any cold-chain alerts today?", intent: "cold_chain_alerts" as Intent },
  { text: "What needs attention?", intent: "what_to_review" as Intent },
];

function detectIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/where is|locate|find lot|location of/.test(s)) return "lot_location";
  if (/cold.chain|excursion|temperature|temp alert/.test(s)) return "cold_chain_alerts";
  if (/sample.*used|which sample|used.*lot/.test(s)) return "samples_using_lot";
  if (/qc approval|approval event|qc event/.test(s)) return "show_qc_events";
  if (/what.*happens.*approve|if i approve/.test(s)) return "what_if_approve";
  if (/block|blocked|stuck/.test(s)) return "blocked_batches";
  if (/why.*slot|recommend.*slot|explain.*slot/.test(s)) return "explain_slot";
  if (/assign.*slot|slot.*assign/.test(s)) return "assign_recommended_slot";
  if (/audit|integrity|hash|ledger/.test(s)) return "audit_integrity";
  if (/summar(y|ize)|brief|today/.test(s)) return "operations_summary";
  if (/qc score|explain.*score|vision/.test(s)) return "explain_qc_score";
  if (/review|attention|priorit/.test(s)) return "what_to_review";
  if (/export.*report|compliance/.test(s)) return "export_compliance";
  return "unknown";
}

function audit(role: string, page: string, intent: Intent, query: string) {
  const entry = {
    action: "Asked Ops Copilot",
    actor: "Priya Naidu",
    role,
    entity: page,
    change_detail: `intent=${intent} · query="${query}"`,
    timestamp: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.log("[audit]", entry);
}

export function FloatingCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<ResponseCard | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; onConfirm: () => void }>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const chips = routeChips[location.pathname] || defaultChips;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Keyboard: Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setResponse(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset response on close
  useEffect(() => {
    if (!open) setTimeout(() => setResponse(null), 300);
  }, [open]);

  function ask(query: string, forcedIntent?: Intent) {
    const intent = forcedIntent ?? detectIntent(query);
    audit("Operations Manager", location.pathname, intent, query);
    setResponse(buildReply(intent, query, navigate, setConfirm));
    setInput("");
  }

  if (location.pathname === "/login" || location.pathname === "/copilot") return null;

  return (
    <>
      {/* Backdrop blur — keeps page visible */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Above-shell stack (response + chips) — only when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="fixed z-50 flex flex-col items-end pointer-events-none"
            style={{ bottom: 92, right: 24, width: "min(36rem, calc(100vw - 3rem))" }}
          >
            {response && (
              <div className="w-full mb-3 pointer-events-auto">
                <ResponseBubble card={response} navigate={navigate} onDismiss={() => setResponse(null)} />
              </div>
            )}
            <div className="w-full pointer-events-auto">
              <div className="flex gap-2 justify-end flex-wrap">
                {chips.map(c => (
                  <button
                    key={c.text}
                    onClick={() => ask(c.text, c.intent)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-white transition shadow-sm"
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Morphing shell: orb ⇄ chat bar */}
      <motion.div
        layout
        onClick={() => { if (!open) setOpen(true); }}
        animate={{
          width: open ? "min(36rem, calc(100vw - 3rem))" : 56,
          height: 56,
          borderRadius: 28,
          right: 24,
          bottom: 24,
          backgroundColor: open ? "rgba(255,255,255,0.97)" : "#10b981",
          boxShadow: open
            ? "0 20px 40px -12px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,1)"
            : "0 12px 28px -8px rgba(6,95,70,0.45), 0 0 0 1px rgba(4,120,87,0.2)",
          cursor: open ? "default" : "pointer",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.8 }}
        className="fixed z-50 overflow-hidden flex items-center backdrop-blur-xl"
      >
        <AnimatePresence mode="wait" initial={false}>
          {!open ? (
            <motion.span
              key="orb"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="relative w-full h-full grid place-items-center text-white"
            >
              <Sparkles className="w-5 h-5" />
              <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping opacity-60" />
            </motion.span>
          ) : (
            <motion.form
              key="bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: 0.08 }}
              onSubmit={e => { e.preventDefault(); if (input.trim()) ask(input.trim()); }}
              className="relative w-full flex items-center gap-2 pl-3 pr-1.5"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Ops Copilot..."
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400 py-2"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 grid place-items-center text-slate-400 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 h-9 w-9 p-0 rounded-full shrink-0"
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Safety note under expanded bar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="fixed z-50 flex justify-end pointer-events-none"
            style={{ bottom: 4, right: 24, width: "min(36rem, calc(100vw - 3rem))" }}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Answers come from operational records. Actions require confirmation.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-slate-900" style={{ fontWeight: 600 }}>{confirm.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{confirm.body}</p>
                <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>This action will be recorded in the audit log with your role and timestamp.</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>
                Confirm & log
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResponseBubble({
  card, navigate, onDismiss,
}: { card: ResponseCard; navigate: ReturnType<typeof useNavigate>; onDismiss: () => void }) {
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <p className="flex-1 text-sm text-slate-800 leading-relaxed">{card.text}</p>
        <button onClick={onDismiss} className="w-6 h-6 rounded-md hover:bg-slate-100 grid place-items-center text-slate-400 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {(card.record || card.alert || card.action) && (
        <div className="px-4 pb-3 space-y-2">
          {card.record && (
            <button
              onClick={() => card.record?.href && navigate(card.record.href)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition"
            >
              <span className="w-1 h-9 rounded-full bg-emerald-500" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-mono text-slate-900" style={{ fontWeight: 600 }}>{card.record.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5 truncate">{card.record.sub}</span>
              </span>
              {card.record.status && <StatusPill status={card.record.status} />}
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          )}
          {card.alert && (
            <div className={cn(
              "flex items-start gap-2.5 px-3 py-2.5 rounded-xl border",
              card.alert.severity === "high" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"
            )}>
              <AlertTriangle className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                card.alert.severity === "high" ? "text-amber-600" : "text-sky-600"
              )} />
              <div className="text-xs">
                <div className={cn("mb-0.5", card.alert.severity === "high" ? "text-amber-900" : "text-sky-900")} style={{ fontWeight: 600 }}>
                  {card.alert.title}
                </div>
                <div className={card.alert.severity === "high" ? "text-amber-800" : "text-sky-800"}>{card.alert.body}</div>
              </div>
            </div>
          )}
          {card.action && (
            <div className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
              <div className="flex items-start gap-2 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-emerald-900" style={{ fontWeight: 600 }}>{card.action.title}</div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">{card.action.body}</div>
                </div>
              </div>
              <Button size="sm" onClick={card.action.onClick} className="bg-emerald-600 hover:bg-emerald-700 w-full h-8">
                {card.action.cta} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {card.sources && card.sources.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Sources</span>
          {card.sources.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200">
              <span className="text-emerald-500">●</span>
              {s.collection}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function buildReply(
  intent: Intent,
  _q: string,
  navigate: ReturnType<typeof useNavigate>,
  setConfirm: (c: any) => void,
): ResponseCard {
  const lot = lots[0];
  const alertZone = zones.find(z => z.status === "Cold-chain Alert");

  switch (intent) {
    case "lot_location":
      return {
        intent,
        text: `${lot.lot_number} is in Z-A1 · ${lot.material} · last touched ${lot.created}.`,
        record: { title: lot.lot_number, sub: `${lot.material} · Z-A1 · ${lot.qty}`, status: lot.status, href: "/lots" },
        sources: [{ collection: "lots" }, { collection: "inventory_moves" }, { collection: "audit_logs" }],
      };
    case "cold_chain_alerts":
      if (!alertZone) return {
        intent,
        text: "No active cold-chain excursions in the last 24 hours.",
        sources: [{ collection: "warehouse_zones" }],
      };
      return {
        intent,
        text: `1 active excursion. Zone ${alertZone.id} is at ${alertZone.temp}°C, outside the ${alertZone.min}°C to ${alertZone.max}°C range.`,
        record: { title: alertZone.id, sub: `${alertZone.type} · Occupancy ${alertZone.occupancy}/${alertZone.capacity}`, status: alertZone.status, href: "/warehouse" },
        sources: [{ collection: "warehouse_zones" }, { collection: "audit_logs" }],
      };
    case "blocked_batches":
      return {
        intent,
        text: "1 lot blocked by QC, 1 zone blocked by cold-chain policy.",
        record: { title: "LOT-2026-0137", sub: "Cardamom · Defect 0.32 · Foreign matter flagged", status: "Blocked", href: "/lots" },
        alert: { title: "Z-A2 placements paused", body: "POL-COLD-01 blocks new placements while excursion is active.", severity: "med" },
        sources: [{ collection: "lots" }, { collection: "policies" }, { collection: "qc_inspections" }],
      };
    case "explain_slot":
      return {
        intent,
        text: "Z-B1 recommended for LOT-2026-0140 with a slot score of 94 — temperature match, no hazard conflict, capacity available, proximity to dispatch dock.",
        record: { title: "Z-B1 · Chilled", sub: "3.8°C · 45/80 capacity · 12m from dock", status: "OK", href: "/warehouse" },
        sources: [{ collection: "warehouse_zones" }, { collection: "policies" }, { collection: "lots" }],
      };
    case "assign_recommended_slot":
      return {
        intent,
        text: "I can draft this assignment, but slot placement always needs your confirmation.",
        action: {
          title: "Draft: Assign LOT-2026-0140 → Z-B1",
          body: "Opens confirmation. Nothing changes until you approve.",
          cta: "Review draft",
          onClick: () => setConfirm({
            title: "Confirm slot assignment",
            body: "Assign LOT-2026-0140 (Lavender Essence · 95 kg) to Z-B1 · Chilled. Slot score 94.",
            onConfirm: () => navigate("/warehouse"),
          }),
        },
        sources: [{ collection: "lots" }, { collection: "warehouse_zones" }],
      };
    case "audit_integrity":
      return {
        intent,
        text: "Each audit entry includes the hash of the previous entry — any tampering breaks the chain. Last verified 2 min ago.",
        record: { title: "AU-9821", sub: "QC Released LOT-2026-0142 · hash 9f3a…c142 · prev a812…0e7b", href: "/audit" },
        sources: [{ collection: "audit_logs" }],
      };
    case "operations_summary":
      return {
        intent,
        text: "12 inbound · 3 pending QC · 24 lots released (+12%) · 1 cold-chain excursion (resolved) · 5 samples in dispatch queue.",
        record: { title: "Open daily brief", sub: "AI Operations Summary · Manager-ready report", href: "/summary" },
        sources: [{ collection: "lots" }, { collection: "sample_dispatches" }, { collection: "warehouse_zones" }, { collection: "qc_inspections" }],
      };
    case "explain_qc_score":
      return {
        intent,
        text: "Vision QC combines colour (96), uniformity (92), defect risk (8%), and foreign-matter (4%) against the golden sample. Recommendation: Pass with optional spot-check.",
        alert: { title: "Always human-approved", body: "AI is a screening assistant. Final release requires your decision.", severity: "med" },
        sources: [{ collection: "qc_inspections" }, { collection: "materials" }],
      };
    case "what_to_review":
      return {
        intent,
        text: "3 items need attention: 1 pending QC approval, 1 cold-chain follow-up, 1 dispatch courier confirmation.",
        record: { title: "REC-3421", sub: "Vanilla Bean Extract · Vision Pass · Awaiting your approval", status: "Pending QC", href: "/qc" },
        sources: [{ collection: "inbound_receipts" }, { collection: "warehouse_zones" }, { collection: "sample_dispatches" }],
      };
    case "export_compliance":
      return {
        intent,
        text: "I can open the compliance export dialog — you set the range and confirm.",
        action: {
          title: "Open compliance export",
          body: "Navigates to Audit · no file generated until you confirm.",
          cta: "Open dialog",
          onClick: () => setConfirm({
            title: "Open compliance export",
            body: "Open the audit export dialog. The export itself is audit-logged when confirmed.",
            onConfirm: () => navigate("/audit"),
          }),
        },
        sources: [{ collection: "audit_logs" }, { collection: "qc_inspections" }, { collection: "lots" }],
      };
    case "what_if_approve":
      return {
        intent,
        text: "Approval creates LOT-2026-0143, links the QC inspection record, triggers smart-slot recommendation, and writes an audit entry under your role.",
        alert: { title: "Reversible within 5 minutes", body: "Approvals can be revoked from the Lot page within a grace window before slotting.", severity: "med" },
        sources: [{ collection: "qc_inspections" }, { collection: "lots" }, { collection: "policies" }],
      };
    case "samples_using_lot":
      return {
        intent,
        text: `2 sample dispatches reference ${lot.lot_number}: Aurora Beauty (12 kg, Friday) and a Verdant Wellness reserve (pending).`,
        record: { title: "DSP-0521", sub: "Aurora Beauty · 12 kg · ETA Friday 14:00", status: "In Transit", href: "/dispatch" },
        sources: [{ collection: "sample_dispatches" }, { collection: "lots" }],
      };
    case "show_qc_events":
      return {
        intent,
        text: `${auditEvents.filter(a => a.action.includes("QC")).length} QC events in the last 24h, including 1 release and 1 block.`,
        record: { title: "AU-9821", sub: "QC Released LOT-2026-0142 · Sarah Chen · 10 min ago", href: "/audit" },
        sources: [{ collection: "audit_logs" }, { collection: "qc_inspections" }],
      };
    default:
      return {
        intent: "unknown",
        text: "I'm not sure yet. Try one of the suggested prompts, or ask about a lot, a zone, QC, dispatch, or the audit log.",
      };
  }
}
