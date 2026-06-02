import { cn } from "./ui/utils";

const map: Record<string, string> = {
  "QC Released": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Stored": "bg-sky-50 text-sky-700 border-sky-200",
  "Awaiting Slot": "bg-amber-50 text-amber-700 border-amber-200",
  "Pending QC": "bg-violet-50 text-violet-700 border-violet-200",
  "Dispatched": "bg-slate-50 text-slate-600 border-slate-200",
  "Blocked": "bg-rose-50 text-rose-700 border-rose-200",
  "Received": "bg-slate-50 text-slate-600 border-slate-200",
  "In Transit": "bg-sky-50 text-sky-700 border-sky-200",
  "Pending Courier": "bg-amber-50 text-amber-700 border-amber-200",
  "Preparing": "bg-violet-50 text-violet-700 border-violet-200",
  "Delivered": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "OK": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Cold-chain Alert": "bg-amber-50 text-amber-700 border-amber-200",
  "Critical": "bg-rose-50 text-rose-700 border-rose-200",
  "High": "bg-amber-50 text-amber-700 border-amber-200",
  "Medium": "bg-sky-50 text-sky-700 border-sky-200",
  "Normal": "bg-slate-50 text-slate-600 border-slate-200",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const styles = map[status] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs whitespace-nowrap", styles, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
