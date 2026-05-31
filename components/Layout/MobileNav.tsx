"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useRole, canAccessRoute } from "@/lib/rbac";

const ALL_ITEMS = [
    { path: "/", label: "Dash", icon: "dashboard" },
    { path: "/inbound", label: "Inbound", icon: "input" },
    { path: "/qc", label: "QC", icon: "biotech" },
    { path: "/warehouse", label: "Whouse", icon: "warehouse" },
    { path: "/ppic", label: "PPIC", icon: "view_kanban" },
    { path: "/dispatch", label: "Dispatch", icon: "send" },
    { path: "/lots", label: "Lots", icon: "inventory_2" },
    { path: "/copilot", label: "Copilot", icon: "smart_toy" },
    { path: "/summary", label: "Summary", icon: "summarize" },
    { path: "/policy", label: "Policy", icon: "gavel" },
    { path: "/audit", label: "Audit", icon: "history_edu" },
];

export const MobileNav = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { role } = useRole();
    const [showMore, setShowMore] = useState(false);
    const isActive = (path: string) => pathname === path;

    const visible = ALL_ITEMS.filter(i => canAccessRoute(role, i.path));
    const primary = visible.slice(0, 4);
    const overflow = visible.slice(4);
    const moreActive = overflow.some(i => i.path === pathname);

    const go = (path: string) => {
        setShowMore(false);
        router.push(path);
    };

    return (
        <>
            {showMore && overflow.length > 0 && (
                <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowMore(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="absolute bottom-[72px] left-0 w-full bg-surface-container-high border-t border-outline-variant rounded-t-2xl p-4 animate-in slide-in-from-bottom duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 mb-2">More</p>
                        <div className="grid grid-cols-1 divide-y divide-outline-variant/30">
                            {overflow.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => go(item.path)}
                                    className={`flex items-center gap-3 px-2 py-3 text-left ${isActive(item.path) ? "text-primary font-bold" : "text-on-surface"}`}
                                >
                                    <span className={`material-symbols-outlined ${isActive(item.path) ? "icon-fill" : ""}`}>{item.icon}</span>
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <nav className="fixed bottom-0 left-0 w-full md:hidden flex justify-around items-center py-3 bg-surface-container-high border-t border-outline-variant z-50 rounded-t-xl ambient-shadow">
                {primary.map(item => (
                    <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className={`flex flex-col items-center gap-1 ${isActive(item.path) ? "text-primary" : "text-on-surface-variant"}`}
                    >
                        <span className={`material-symbols-outlined ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
                {overflow.length > 0 && (
                    <button onClick={() => setShowMore(s => !s)} className={`flex flex-col items-center gap-1 ${moreActive || showMore ? "text-primary" : "text-on-surface-variant"}`}>
                        <span className={`material-symbols-outlined ${moreActive ? 'icon-fill' : ''}`}>{showMore ? "close" : "more_horiz"}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
                    </button>
                )}
            </nav>
        </>
    );
};
