"use client";

import type { CopilotSource } from "@/lib/copilotIntents";

/**
 * Enterprise-readiness affordance: shows which operational record collections
 * an answer was derived from. Microcopy reinforces that answers are grounded
 * in real records, not generated freely.
 */
export function CopilotSourceCards({ sources }: { sources: CopilotSource[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="micro-label mb-1.5">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span
            key={s.collection}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600"
            title={s.collection}
          >
            <span className="material-symbols-outlined text-[14px] text-emerald-600">database</span>
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">Answers are generated from operational records.</p>
    </div>
  );
}
