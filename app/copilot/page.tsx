"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { useRole } from "@/lib/rbac";
import { runCopilot, type CopilotActionDef, type CopilotResponse } from "@/lib/copilotIntents";
import { CopilotActionCard } from "@/components/copilot/CopilotActionCard";
import { CopilotAnswerBlock } from "@/components/copilot/CopilotAnswerCard";
import { CopilotConfirmModal } from "@/components/copilot/CopilotConfirmModal";
import { CopilotSourceCards } from "@/components/copilot/CopilotSourceCards";

type ConfirmAction = Extract<CopilotActionDef, { kind: "confirm" }>;

const SUGGESTED_PROMPTS = [
  "Where is LOT-2026-051?",
  "Which samples used this lot?",
  "What batches are blocked today?",
  "Any cold-chain alerts today?",
  "Explain the audit integrity hash",
  "What lots should be prioritized for dispatch?",
  "What happens if QC approves this receipt?",
  "Why is COLD-B blocked?",
];

interface Turn {
  id: string;
  role: "user" | "assistant";
  text?: string;
  response?: CopilotResponse;
}

export default function CopilotPage() {
  const router = useRouter();
  const { role } = useRole();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = turns.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);
    const userTurn: Turn = { id: `${Date.now()}-user`, role: "user", text: question };
    setTurns((current) => [...current, userTurn]);

    try {
      await logAudit(role, "Queried Ops Copilot", "Copilot", `Asked: "${question}" (page: Ops Copilot)`);
    } catch {
      /* audit logging should not block the assistant */
    }

    const response = await runCopilot(question, { role, page: "/copilot", selectedLot: null });
    setTurns((current) => [
      ...current,
      { id: `${Date.now()}-assistant`, role: "assistant", response },
    ]);
    setLoading(false);
  };

  const handleConfirmed = async (action: ConfirmAction) => {
    const c = action.confirm;
    try {
      if (c.mutate) await c.mutate();
      await logAudit(role, c.audit.action, c.audit.entity, c.audit.detail);
      setTurns((current) => [
        ...current,
        {
          id: `${Date.now()}-confirm`,
          role: "assistant",
          response: {
            intent: "unknown",
            blocks: [{ type: "risk", severity: "info", title: "Action confirmed", body: c.successText }],
            sources: [{ collection: "audit_logs", label: "Audit log" }],
            actions: [{ id: "open-audit", kind: "navigate", label: "Open audit log", href: "/audit", icon: "history_edu", variant: "secondary" }],
          },
        },
      ]);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-9rem)] max-w-[900px] mx-auto w-full flex flex-col">
      {isEmpty ? (
        <div className="flex-1 flex flex-col justify-center py-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-sm mx-auto mb-5">
              <span className="material-symbols-outlined text-[28px] icon-fill">auto_awesome</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">How can I help with operations?</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Ask about lots, QC records, warehouse moves, dispatches, or audit history. Answers come from operational records.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => ask(prompt)}
                disabled={loading}
                className="ui-card ui-card-hover p-4 text-left flex items-start gap-3 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-600 mt-0.5">auto_awesome</span>
                <span className="text-sm font-medium text-slate-700 leading-snug">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-4 space-y-5 soft-scroll">
          {turns.map((turn) => {
            if (turn.role === "user") {
              return (
                <div key={turn.id} className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-emerald-600 text-white px-4 py-2.5 text-sm leading-relaxed">
                    {turn.text}
                  </div>
                </div>
              );
            }

            return (
              <div key={turn.id} className="flex justify-start">
                <div className="ui-card p-4 max-w-[82%] w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                      <span className="material-symbols-outlined text-[16px] icon-fill">auto_awesome</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Ops Copilot</p>
                      <p className="text-[11px] text-slate-400">From operational records</p>
                    </div>
                  </div>
                  {turn.response && (
                    <div className="space-y-2">
                      {turn.response.blocks.map((block, index) => (
                        <CopilotAnswerBlock key={index} block={block} />
                      ))}
                      <CopilotSourceCards sources={turn.response.sources} />
                      <CopilotActionCard
                        actions={turn.response.actions}
                        onNavigate={(href) => router.push(href)}
                        onConfirm={(action) => setConfirmAction(action)}
                      />
                      <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        Answers are generated from operational records. Verify before external reporting.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="ui-card p-4 max-w-[82%] flex items-center gap-2 text-sm text-slate-500">
              <span className="copilot-dot" />
              <span className="copilot-dot" style={{ animationDelay: "140ms" }} />
              <span className="copilot-dot" style={{ animationDelay: "280ms" }} />
              <span className="ml-2">Searching operational records...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="sticky bottom-0 pt-4 pb-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-emerald-300 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask Ops Copilot..."
            className="w-full resize-none bg-transparent text-slate-900 placeholder-slate-400 text-[15px] px-4 py-3.5 pr-14 rounded-2xl focus:outline-none disabled:opacity-60"
            style={{ minHeight: "52px", maxHeight: "160px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <span className="material-symbols-outlined text-[18px]">{loading ? "progress_activity" : "arrow_upward"}</span>
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-2.5">
          <span className="material-symbols-outlined text-[14px]">shield_person</span>
          Answers are generated from operational records. Verify before external reporting.
        </p>
      </form>

      {confirmAction && (
        <CopilotConfirmModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </div>
  );
}
