"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { runCopilot, type CopilotResponse, type CopilotActionDef } from "@/lib/copilotIntents";
import { getPromptsForPage, getPageLabel } from "@/lib/copilotPrompts";
import { CopilotAnswerBlock } from "./CopilotAnswerCard";
import { CopilotSourceCards } from "./CopilotSourceCards";
import { CopilotActionCard } from "./CopilotActionCard";
import { CopilotConfirmModal } from "./CopilotConfirmModal";

type ConfirmAction = Extract<CopilotActionDef, { kind: "confirm" }>;

/** States of the ambient assistant overlay */
type DockState = "closed" | "input" | "thinking" | "answered";

interface Turn {
  id: string;
  question: string;
  response?: CopilotResponse;
  loading: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedLot?: string | null;
}

/**
 * Ambient Ops Copilot dock — Siri / Google Assistant style.
 *
 * Layer stack (bottom to top):
 *   z-88  soft blur backdrop (page stays visible behind)
 *   z-93  prompt chip row (above dock)
 *   z-94  response card (floats above chips/dock)
 *   z-95  pill command dock (always anchored at bottom)
 *   z-120 confirm modal
 *
 * Context (page, role, lot) is used only in logic — never shown as visible chips.
 */
export function CopilotDock({ open, onClose, selectedLot }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useRole();

  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dockState, setDockState] = useState<DockState>("closed");
  const [chipsHidden, setChipsHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [voiceListening, setVoiceListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const startVoiceCapture = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setVoiceListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        setInput(transcript);
      };

      recognition.onerror = () => {
        setVoiceListening(false);
      };

      recognition.onend = () => {
        setVoiceListening(false);
      };

      recognition.start();
    } catch {
      setVoiceListening(false);
    }
  };

  // Page context used in logic only (not displayed)
  const prompts = getPromptsForPage(pathname);
  const pageLabel = getPageLabel(pathname);
  const isLoading = turns.some((t) => t.loading);

  // Sync dock state with open prop
  useEffect(() => {
    if (open) {
      setDockState("input");
      setChipsHidden(false);
      const t = setTimeout(() => inputRef.current?.focus(), 160);
      return () => clearTimeout(t);
    } else {
      setDockState("closed");
      setTurns([]);
      setInput("");
      setChipsHidden(false);
    }
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ESC: dismiss response first, then dock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmAction) {
        if (dockState === "answered") {
          clearResponse();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirmAction, onClose, dockState]);

  // Auto-scroll to bottom of response card
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollTop = cardRef.current.scrollHeight;
    }
  }, [turns]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || isLoading) return;
    setInput("");
    setChipsHidden(true);
    setDockState("thinking");

    const id = Date.now().toString();
    setTurns([{ id, question: q, loading: true }]);

    // Audit every query — non-blocking
    try {
      await logAudit(role, "Queried Ops Copilot", "Copilot", `Asked: "${q}" (page: ${pageLabel})`);
    } catch {
      /* non-blocking */
    }

    const response = await runCopilot(q, {
      role,
      page: pathname,
      selectedLot: selectedLot || null,
    });

    setTurns([{ id, question: q, response, loading: false }]);
    setDockState("answered");
  };

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleConfirmed = async (action: ConfirmAction) => {
    const c = action.confirm;
    try {
      if (c.mutate) await c.mutate();
      await logAudit(role, c.audit.action, c.audit.entity, c.audit.detail);
      setToast(c.successText);
      setTimeout(() => setToast(null), 4000);
      setTurns([{
        id: `${Date.now()}-confirm`,
        question: action.label,
        loading: false,
        response: {
          intent: "unknown",
          blocks: [{ type: "risk", severity: "info", title: "Action confirmed", body: c.successText }],
          sources: [{ collection: "audit_logs", label: "Audit log" }],
          actions: [{ id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" }],
        },
      }]);
      setDockState("answered");
    } catch {
      setToast("Could not complete the action. Please try again.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setConfirmAction(null);
    }
  };

  const clearResponse = () => {
    setDockState("input");
    setTurns([]);
    setChipsHidden(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const latestTurn = turns[turns.length - 1];
  const showResponse = dockState === "answered" && !!latestTurn?.response;
  const showThinking = dockState === "thinking";
  // Chips: visible in input state, hidden once user submits or response appears
  const showChips = open && !chipsHidden && !showResponse && !showThinking;
  const showSafetyPill = open;

  // Dock geometry — must match .copilot-dock bottom in globals.css
  // Desktop: 32px  |  Mobile: handled by CSS media query
  const DOCK_H = 72;        // px — pill height + padding
  const GAP = 12;           // px
  const CHIPS_H = 44;       // px
  const DOCK_BOTTOM = isMobile ? 80 : 32;

  const chipRowBottom = DOCK_BOTTOM + DOCK_H + GAP;                          // 108
  const cardBottomNoChips = DOCK_BOTTOM + DOCK_H + GAP;                      // 108
  const cardBottomWithChips = DOCK_BOTTOM + DOCK_H + GAP + CHIPS_H + GAP;   // 164

  const responseCardBottom = showChips ? cardBottomWithChips : cardBottomNoChips;

  if (!open) return null;

  return (
    <>
      {/* ── Soft blur backdrop — page stays recognisable behind ── */}
      <div
        className="copilot-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            if (dockState === "answered") clearResponse();
            else onClose();
          }
        }}
      />

      {/* ── Prompt chips row — horizontal scroll, auto-hides after query ── */}
      {showChips && (
        <div
          className="copilot-chips-row"
          style={{ bottom: `${chipRowBottom}px` }}
          aria-label="Suggested prompts"
        >
          <div className="copilot-chip-strip" style={{ justifyContent: "flex-start" }}>
            {prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => ask(p)}
                disabled={isLoading}
                className="copilot-chip"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Response / thinking card — floats above dock ── */}
      {(showResponse || showThinking) && (
        <div
          className={`copilot-response-card ${showResponse ? "copilot-card-visible" : "copilot-card-thinking"}`}
          style={{ bottom: `${responseCardBottom}px` }}
          aria-live="polite"
          aria-label="Ops Copilot response"
        >
          <div ref={cardRef} className="copilot-card-scroll">

            {/* Card header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`copilot-card-icon ${showThinking ? "copilot-icon-pulse" : ""}`}>
                  <span className="material-symbols-outlined text-[14px] icon-fill">auto_awesome</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  Ops Copilot
                  <span className="font-normal text-slate-400 ml-1">· From operational records</span>
                </span>
              </div>
              <button
                onClick={clearResponse}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>

            {/* Thinking dots */}
            {showThinking && (
              <div className="flex items-center gap-1.5 py-1.5 px-1">
                <span className="copilot-dot" style={{ animationDelay: "0ms" }} />
                <span className="copilot-dot" style={{ animationDelay: "140ms" }} />
                <span className="copilot-dot" style={{ animationDelay: "280ms" }} />
                <span className="text-xs text-slate-400 ml-2">Searching operational records...</span>
              </div>
            )}

            {/* Response blocks */}
            {showResponse && latestTurn?.response && (
              <div className="space-y-2">
                {latestTurn.response.blocks.map((b, i) => (
                  <CopilotAnswerBlock key={i} block={b} />
                ))}
                <CopilotSourceCards sources={latestTurn.response.sources} />
                <CopilotActionCard
                  actions={latestTurn.response.actions}
                  onNavigate={handleNavigate}
                  onConfirm={(a) => setConfirmAction(a)}
                />
              </div>
            )}

            {/* Safety note */}
            {showResponse && (
              <p className="text-[10px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                Answers are generated from operational records. Actions require confirmation.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Pill command dock — always the bottom anchor ── */}
      <div
        className={`copilot-dock ${open ? "copilot-dock-open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label="Ops Copilot command bar"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="copilot-input-pill"
        >
          {/* Sparkle icon — spins gently while thinking */}
          <span
            className={`material-symbols-outlined text-[20px] icon-fill shrink-0 ${
              showThinking ? "copilot-sparkle-spin text-emerald-400" : "text-emerald-500"
            }`}
          >
            auto_awesome
          </span>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask Ops Copilot..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400"
            aria-label="Ask Ops Copilot"
          />

          {/* New question button — only visible when a response exists */}
          {turns.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={clearResponse}
              className="shrink-0 text-[11px] text-slate-400 hover:text-emerald-600 transition-colors px-1 whitespace-nowrap"
              aria-label="Ask another question"
            >
              New ↩
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="copilot-close-btn"
            aria-label="Close Copilot"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>

          {/* Voice Input Assistance */}
          <button
            type="button"
            onClick={startVoiceCapture}
            disabled={isLoading || (!speechSupported && !voiceListening)}
            className={`shrink-0 p-1 mr-1 flex items-center justify-center rounded-full transition-all ${
              voiceListening 
                ? "bg-rose-500 text-white animate-pulse" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            }`}
            title={speechSupported ? "Voice input" : "Voice input experimental."}
            aria-label="Voice input"
          >
            <span className="material-symbols-outlined text-[18px]">
              {voiceListening ? "graphic_eq" : "mic"}
            </span>
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="copilot-send-btn"
            aria-label="Send"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isLoading ? "progress_activity" : "arrow_upward"}
            </span>
          </button>
        </form>

        {/* Dock footer row — close button only; no context chips */}
      </div>

      {showSafetyPill && (
        <div className="copilot-safety-pill" aria-live="polite">
          <span className="material-symbols-outlined text-[13px] text-emerald-600 icon-fill">shield_person</span>
          <span>Answers come from operational records. Actions require confirmation.</span>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <CopilotConfirmModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirmed={handleConfirmed}
        />
      )}

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[130] bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-rise">
          <span className="material-symbols-outlined text-[18px] text-emerald-400 icon-fill">check_circle</span>
          {toast}
        </div>
      )}
    </>
  );
}

// Backward-compat alias
export { CopilotDock as CopilotBottomSheet };
