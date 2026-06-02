import React from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    /** Optional Material Symbols icon name shown in a soft tile to the left of the title. */
    icon?: string;
    /** Optional small badge/pill rendered next to the title (e.g. counts). */
    badge?: React.ReactNode;
    /** Action buttons rendered on the right side of the header. */
    actions?: React.ReactNode;
}

/**
 * Consistent page header used across all routes.
 * Provides a uniform title/subtitle treatment plus an optional icon tile,
 * inline badge, and right-aligned action slot.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    badge,
    actions,
}) => {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
                {icon && (
                    <div className="hidden sm:grid place-items-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 shrink-0">
                        <span className="material-symbols-outlined text-[22px] icon-fill">{icon}</span>
                    </div>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl text-slate-900 font-semibold tracking-tight">{title}</h1>
                        {badge}
                    </div>
                    {subtitle && (
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">{subtitle}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
};

export default PageHeader;
