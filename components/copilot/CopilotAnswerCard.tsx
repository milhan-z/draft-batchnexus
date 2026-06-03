"use client";

import type { ResponseBlock } from "@/lib/copilotIntents";

const TONE_STYLES: Record<string, { ring: string; icon: string; bg: string }> = {
  neutral: { ring: "border-slate-200", icon: "text-slate-500", bg: "bg-white" },
  success: { ring: "border-emerald-200", icon: "text-emerald-600", bg: "bg-emerald-50/40" },
  warning: { ring: "border-amber-200", icon: "text-amber-600", bg: "bg-amber-50/40" },
  danger: { ring: "border-red-200", icon: "text-red-600", bg: "bg-red-50/40" },
};

const RISK_STYLES: Record<string, { ring: string; icon: string; bg: string; iconName: string; title: string }> = {
  info: { ring: "border-sky-200", icon: "text-sky-600", bg: "bg-sky-50/60", iconName: "info", title: "text-sky-800" },
  warning: { ring: "border-amber-200", icon: "text-amber-600", bg: "bg-amber-50/60", iconName: "warning", title: "text-amber-800" },
  danger: { ring: "border-red-200", icon: "text-red-600", bg: "bg-red-50/60", iconName: "report", title: "text-red-800" },
};

/**
 * Renders one Copilot response block. Supports text, record cards, lists, and
 * risk/alert cards so responses feel like a dynamic assistant rather than a
 * flat chat bubble.
 */
export function CopilotAnswerBlock({ block }: { block: ResponseBlock }) {
  if (block.type === "text") {
    return <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{block.text}</p>;
  }

  if (block.type === "record") {
    const tone = TONE_STYLES[block.tone || "neutral"];
    return (
      <div className={`rounded-xl border ${tone.ring} ${tone.bg} p-3.5`}>
        <div className="flex items-start gap-3">
          {block.icon && (
            <span className={`material-symbols-outlined text-[22px] ${tone.icon} shrink-0 mt-0.5`}>{block.icon}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{block.title}</p>
            {block.subtitle && <p className="text-xs text-slate-500 mt-0.5">{block.subtitle}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5">
              {block.fields.map((f, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{f.label}</span>
                  <span className="text-[13px] text-slate-800 font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <div>
        {block.title && <p className="micro-label mb-1.5">{block.title}</p>}
        <div className="space-y-1.5">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
              {item.icon && <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0 mt-0.5">{item.icon}</span>}
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800">{item.primary}</p>
                {item.secondary && <p className="text-xs text-slate-500 mt-0.5">{item.secondary}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "risk") {
    const s = RISK_STYLES[block.severity];
    return (
      <div className={`rounded-xl border ${s.ring} ${s.bg} p-3.5 flex items-start gap-3`}>
        <span className={`material-symbols-outlined text-[22px] ${s.icon} shrink-0 mt-0.5 icon-fill`}>{s.iconName}</span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${s.title}`}>{block.title}</p>
          <p className="text-[13px] text-slate-700 mt-0.5 leading-relaxed">{block.body}</p>
        </div>
      </div>
    );
  }

  return null;
}
