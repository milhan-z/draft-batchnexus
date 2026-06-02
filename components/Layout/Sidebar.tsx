"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, canAccessRoute, canGenerateSummary } from "@/lib/rbac";

export const Sidebar = () => {
    const pathname = usePathname();
    const { role } = useRole();

    const navGroups = [
        {
            label: "Operations",
            items: [
                { path: "/", label: "Dashboard", icon: "dashboard" },
                { path: "/inbound", label: "Inbound Intake", icon: "move_to_inbox" },
                { path: "/qc", label: "QC Release", icon: "biotech" },
                { path: "/ppic", label: "PPIC Board", icon: "view_kanban" },
                { path: "/lots", label: "Lot Traceability", icon: "inventory_2" },
                { path: "/warehouse", label: "Warehouse", icon: "warehouse" },
                { path: "/dispatch", label: "Dispatch", icon: "send" },
                { path: "/copilot", label: "Ops Copilot", icon: "smart_toy" },
                { path: "/summary", label: "Daily Summary", icon: "summarize" },
                { path: "/policy", label: "Policy Rules", icon: "gavel" },
                { path: "/audit", label: "Audit Log", icon: "history_edu" },
            ],
        },
    ];

    const isActive = (path: string) => pathname === path;

    const visibleGroups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => canAccessRoute(role, item.path)),
        }))
        .filter(group => group.items.length > 0);

    return (
        <nav className="fixed left-0 top-0 h-screen flex flex-col w-64 z-40 bg-white border-r border-slate-200 hidden md:flex">
            {/* Logo area */}
            <div className="h-16 px-5 flex items-center border-b border-slate-200">
                <img src="/logo-batchnexus.png" alt="BatchNexus Control Tower" className="h-9 object-contain" />
            </div>

            {/* Navigation */}
            <div className="flex-1 p-3 overflow-y-auto hide-scrollbar">
                {visibleGroups.map(group => (
                    <div key={group.label} className="mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 py-2 font-medium">{group.label}</p>
                        <div className="space-y-0.5">
                            {group.items.map(item => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                        isActive(item.path)
                                            ? "bg-emerald-50 text-emerald-700 font-medium"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                >
                                    {isActive(item.path) && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-500" />
                                    )}
                                    <span className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {item.path === "/qc" && (
                                        <span className="h-5 px-1.5 text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-full flex items-center justify-center">3</span>
                                    )}
                                    {item.path === "/warehouse" && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Copilot promo card */}
            <div className="p-3 border-t border-slate-200">
                <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-300 text-[16px] icon-fill">auto_awesome</span>
                        <span className="text-xs font-medium">AI Copilot Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-3">Ask anything about lots, dispatch, or cold-chain.</p>
                    <Link
                        href="/copilot"
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
                    >
                        Open Copilot
                    </Link>
                </div>
            </div>

            {/* Role indicator */}
            <div className="px-3 pb-3">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px] icon-fill">shield_person</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500">Active Role</p>
                        <p className="text-xs font-medium text-slate-900 truncate">{role}</p>
                    </div>
                </div>
            </div>
        </nav>
    );
};
