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
                { path: "/qc", label: "QC Station", icon: "biotech" },
                { path: "/ppic", label: "PPIC Board", icon: "view_kanban" },
                { path: "/lots", label: "Lots", icon: "inventory_2" },
                { path: "/warehouse", label: "Warehouse", icon: "warehouse" },
                { path: "/dispatch", label: "Dispatch", icon: "send" },
            ],
        },
        {
            label: "Intelligence",
            items: [
                { path: "/copilot", label: "Ops Copilot", icon: "smart_toy" },
                { path: "/summary", label: "AI Summary", icon: "summarize" },
            ],
        },
        {
            label: "Governance",
            items: [
                { path: "/policy", label: "Policy Rules", icon: "gavel" },
                { path: "/audit", label: "Audit Log", icon: "history_edu" },
            ],
        },
    ];

    const isActive = (path: string) => pathname === path;

    // Filter nav items by the active role's permissions, then drop empty groups.
    // This ensures each role sees ONLY the modules relevant to their job.
    const visibleGroups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => canAccessRoute(role, item.path)),
        }))
        .filter(group => group.items.length > 0);

    return (
        <nav className="fixed left-0 top-0 h-screen flex flex-col py-6 w-64 z-40 bg-surface-container-low border-r border-outline-variant hidden md:flex">
            <div className="px-6 mb-8">
                <h1 className="font-display font-bold text-2xl text-primary">Sima Arôme</h1>
                <p className="text-sm text-on-surface-variant mt-1">BatchNexus Control</p>
            </div>
            <ul className="flex-1 flex flex-col space-y-1 overflow-y-auto hide-scrollbar">
                {visibleGroups.map(group => (
                    <li key={group.label} className="mb-2">
                        <p className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{group.label}</p>
                        <ul className="flex flex-col space-y-1">
                            {group.items.map(item => (
                                <li key={item.path}>
                                    <Link
                                        href={item.path}
                                        className={`flex items-center px-6 py-2.5 transition-all duration-200 ${
                                            isActive(item.path)
                                            ? "text-primary font-bold border-r-4 border-primary bg-surface-container-high"
                                            : "text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container"
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined mr-4 text-[20px] ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
                                        <span className="text-sm">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
            {canGenerateSummary(role) && (
                <div className="px-6 mt-auto pt-6 border-t border-outline-variant">
                    <Link
                        href="/summary"
                        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-bold uppercase tracking-wider text-xs py-3 px-4 rounded-sm hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                        Generate Report
                    </Link>
                </div>
            )}
            {/* Role indicator at bottom */}
            <div className="px-6 pt-4 border-t border-outline-variant mt-2">
                <div className="flex items-center gap-2 px-2 py-2 bg-surface-container rounded-lg">
                    <span className="material-symbols-outlined text-primary text-[18px] icon-fill">shield_person</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Active Role</p>
                        <p className="text-xs font-bold text-primary truncate">{role}</p>
                    </div>
                </div>
            </div>
        </nav>
    );
};
