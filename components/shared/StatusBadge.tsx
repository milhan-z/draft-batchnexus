import React from "react";

const statusStyles: Record<string, string> = {
    "QC Released": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Stored": "bg-sky-50 text-sky-700 border-sky-200",
    "Awaiting Slot": "bg-amber-50 text-amber-700 border-amber-200",
    "Pending QC": "bg-violet-50 text-violet-700 border-violet-200",
    "Dispatched": "bg-slate-50 text-slate-600 border-slate-200",
    "Blocked": "bg-rose-50 text-rose-700 border-rose-200",
    "BLOCKED": "bg-rose-50 text-rose-700 border-rose-200",
    "Received": "bg-slate-50 text-slate-600 border-slate-200",
    "In Transit": "bg-sky-50 text-sky-700 border-sky-200",
    "In Dispatch": "bg-sky-50 text-sky-700 border-sky-200",
    "Pending Courier": "bg-amber-50 text-amber-700 border-amber-200",
    "Preparing": "bg-violet-50 text-violet-700 border-violet-200",
    "Delivered": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "OK": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Cold-chain Alert": "bg-amber-50 text-amber-700 border-amber-200",
    "Policy Alert": "bg-rose-50 text-rose-700 border-rose-200",
    "Critical": "bg-rose-50 text-rose-700 border-rose-200",
    "High": "bg-amber-50 text-amber-700 border-amber-200",
    "Medium": "bg-sky-50 text-sky-700 border-sky-200",
    "Normal": "bg-slate-50 text-slate-600 border-slate-200",
    "Draft": "bg-slate-50 text-slate-600 border-slate-200",
    "Needs Review": "bg-violet-50 text-violet-700 border-violet-200",
    "QC hold": "bg-rose-50 text-rose-700 border-rose-200",
    "On Hold": "bg-amber-50 text-amber-700 border-amber-200",
    "Ready for Warehouse": "bg-sky-50 text-sky-700 border-sky-200",
    "READY": "bg-sky-50 text-sky-700 border-sky-200",
    "Lot Created": "bg-teal-50 text-teal-700 border-teal-200",
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
    const styles = statusStyles[status] || "bg-slate-50 text-slate-600 border-slate-200";

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${styles} ${className || ""}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {status}
        </span>
    );
};
