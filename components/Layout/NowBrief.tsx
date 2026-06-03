"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const briefs = [
  { label: "COLD-CHAIN ALERT", value: "FRZ-C -3 C", sub: "Needs attention", href: "/warehouse", tone: "danger" },
  { label: "RELEASED TODAY", value: "24 lots", sub: "+12% vs yesterday", href: "/lots" },
  { label: "PENDING QC", value: "3 materials", sub: "2 high priority", href: "/qc" },
  { label: "DISPATCH QUEUE", value: "5 samples", sub: "2 export orders", href: "/dispatch" },
  { label: "AUDIT HEALTH", value: "42 events", sub: "Integrity verified", href: "/audit" },
];

export function NowBrief() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const brief = briefs[active];
  const isAlert = brief.tone === "danger";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % briefs.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push(brief.href)}
      className="w-full text-left rounded-2xl bg-[#fbfaf4] border border-emerald-100 p-4 shadow-sm text-slate-900 hover:border-emerald-200 hover:shadow-md transition-all"
      aria-label={`Open ${brief.label.toLowerCase()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] icon-fill text-emerald-600">auto_awesome</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">NOW BRIEF</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          live
        </span>
      </div>

      <div className="h-[68px] flex flex-col justify-center">
        <div className={`text-[10px] uppercase tracking-wider mb-0.5 font-medium ${isAlert ? "text-rose-700" : "text-emerald-700"}`}>
          {brief.label}
        </div>
        <div className="text-sm font-semibold text-slate-900">{brief.value}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{brief.sub}</div>
      </div>

      <div className="flex items-center gap-1 mt-2.5">
        {briefs.map((item, i) => (
          <span
            key={item.label}
            className={`block h-1 rounded-full transition-all ${i === active ? "w-3.5 bg-emerald-600" : "w-1 bg-emerald-200"}`}
          />
        ))}
      </div>
    </button>
  );
}
