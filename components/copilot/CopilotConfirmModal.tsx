"use client";

import { useState } from "react";
import type { CopilotActionDef } from "@/lib/copilotIntents";

type ConfirmAction = Extract<CopilotActionDef, { kind: "confirm" }>;

interface Props {
  action: ConfirmAction;
  onClose: () => void;
  onConfirmed: (action: ConfirmAction) => Promise<void>;
}

/**
 * Human-confirmation gate. Nothing in the Copilot mutates data without passing
 * through here. On confirm, the parent runs the mutation + audit log.
 */
export function CopilotConfirmModal({ action, onClose, onConfirmed }: Props) {
  const [busy, setBusy] = useState(false);
  const c = action.confirm;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirmed(action);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={busy ? undefined : onClose} />
      <div className="relative ui-card w-full max-w-md p-5 animate-rise shadow-xl">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[24px] text-emerald-600 shrink-0 mt-0.5 icon-fill">task_alt</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">{c.title}</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{c.body}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-[11px] text-slate-500">
            <span className="material-symbols-outlined text-[13px] align-middle mr-1 text-slate-400">history_edu</span>
            This action will be recorded in the audit log with your role and a timestamp.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary text-sm" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">check</span>
            )}
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
