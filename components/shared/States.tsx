import React from "react";

/* ── Empty State ───────────────────────────────────────────── */
interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = "inbox",
    title,
    description,
    action,
    className = "",
}) => (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-14 ${className}`}>
        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

/* ── Spinner ───────────────────────────────────────────────── */
export const Spinner: React.FC<{ label?: string; className?: string }> = ({
    label,
    className = "",
}) => (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-slate-400 ${className}`}>
        <span className="material-symbols-outlined animate-spin text-3xl text-emerald-600">progress_activity</span>
        {label && <p className="text-xs font-medium text-slate-500">{label}</p>}
    </div>
);

/* ── Skeleton line ─────────────────────────────────────────── */
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`skeleton ${className}`} />
);

/* ── Skeleton row group for tables ─────────────────────────── */
export const SkeletonRows: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4,
}) => (
    <>
        {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-slate-100">
                {Array.from({ length: cols }).map((_, c) => (
                    <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-3.5 ${c === 0 ? "w-20" : c === cols - 1 ? "w-16 ml-auto" : "w-28"}`} />
                    </td>
                ))}
            </tr>
        ))}
    </>
);
