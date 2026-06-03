"use client";

import type { CopilotActionDef } from "@/lib/copilotIntents";

interface Props {
  actions: CopilotActionDef[];
  onNavigate: (href: string) => void;
  onConfirm: (action: Extract<CopilotActionDef, { kind: "confirm" }>) => void;
}

/**
 * Suggested-action area. Navigation actions move the operator to the relevant
 * module; confirm actions open a confirmation modal before any data changes.
 * No action ever mutates data directly from this card — that is the core
 * enterprise safety rule.
 */
export function CopilotActionCard({ actions, onNavigate, onConfirm }: Props) {
  if (!actions || actions.length === 0) return null;

  const hasConfirm = actions.some((a) => a.kind === "confirm");

  return (
    <div className="mt-3">
      <p className="micro-label mb-1.5">Suggested actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const primary = a.variant === "primary";
          const cls = primary ? "btn btn-primary" : "btn btn-secondary";
          return (
            <button
              key={a.id}
              className={`${cls} text-xs`}
              onClick={() => (a.kind === "confirm" ? onConfirm(a) : onNavigate(a.href))}
            >
              {a.icon && <span className="material-symbols-outlined text-[16px]">{a.icon}</span>}
              {a.label}
            </button>
          );
        })}
      </div>
      {hasConfirm && (
        <p className="text-[11px] text-slate-400 mt-1.5">
          Operational actions require human confirmation and are audit-logged.
        </p>
      )}
    </div>
  );
}
