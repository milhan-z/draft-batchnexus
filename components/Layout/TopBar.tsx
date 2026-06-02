"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { notifications as mantineNotifications } from "@mantine/notifications";
import { ROLES, useRole, UserRole, getActorName } from "@/lib/rbac";
import { fetchItems } from "@/lib/api/client";

interface NotifItem {
    id: string;
    icon: string;
    color: string;
    title: string;
    message: string;
    time: string;
    unread: boolean;
}

const navLabels: Record<string, string> = {
    "/": "Dashboard",
    "/inbound": "Inbound Intake",
    "/qc": "QC Release",
    "/ppic": "PPIC Board",
    "/lots": "Lot Traceability",
    "/warehouse": "Warehouse",
    "/dispatch": "Dispatch",
    "/copilot": "Ops Copilot",
    "/summary": "Daily Summary",
    "/policy": "Policy Rules",
    "/audit": "Audit Log",
};

const navIcons: Record<string, string> = {
    "/": "dashboard",
    "/inbound": "move_to_inbox",
    "/qc": "biotech",
    "/ppic": "view_kanban",
    "/lots": "inventory_2",
    "/warehouse": "warehouse",
    "/dispatch": "send",
    "/copilot": "smart_toy",
    "/summary": "summarize",
    "/policy": "gavel",
    "/audit": "history_edu",
};

export const TopBar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { role: activeRole, changeRole } = useRole();
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState<NotifItem[]>([]);
    const [notifsLoaded, setNotifsLoaded] = useState(false);

    const roleRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => n.unread).length;
    const currentLabel = navLabels[pathname] || "Page";
    const currentIcon = navIcons[pathname] || "article";

    useEffect(() => {
        if (notifsLoaded) return;
        const loadNotifs = async () => {
            try {
                const [zonesRes, auditsRes, receiptsRes] = await Promise.all([
                    fetchItems<any>("warehouse_zones", {}),
                    fetchItems<any>("audit_logs", { sort: "-timestamp", limit: 5 }),
                    fetchItems<any>("inbound_receipts", { limit: 50 }),
                ]);
                const items: NotifItem[] = [];
                zonesRes.data.filter((z: any) => z.status === "Cold-chain Alert").forEach((z: any) => {
                    items.push({ id: `cold-${z.id}`, icon: "warning", color: "text-amber-600", title: "Cold-chain Alert", message: `${z.id} at ${z.current_temperature}°C — outside safe range`, time: "Active", unread: true });
                });
                const pendingQc = receiptsRes.data.filter((r: any) => r.status === "Pending QC").length;
                if (pendingQc > 0) {
                    items.push({ id: "pending-qc", icon: "science", color: "text-violet-600", title: "Pending QC", message: `${pendingQc} material(s) awaiting QC review`, time: "Now", unread: true });
                }
                auditsRes.data.slice(0, 2).forEach((a: any) => {
                    const icon = a.action.includes("QC") ? "biotech" : a.action.includes("slot") ? "warehouse" : "edit_document";
                    const color = a.action.includes("Block") ? "text-rose-600" : "text-sky-600";
                    items.push({ id: a.id, icon, color, title: a.action, message: `${a.actor} • ${a.change_detail?.substring(0, 60) || ""}`, time: new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), unread: false });
                });
                setNotifications(items);
                setNotifsLoaded(true);
            } catch { setNotifsLoaded(true); }
        };
        loadNotifs();
    }, [notifsLoaded]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (roleRef.current && !roleRef.current.contains(e.target as Node)) setShowRoleMenu(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        mantineNotifications.show({ title: "Notifications Cleared", message: "All notifications marked as read.", color: "green" });
    };

    const handleRoleChange = (roleId: string) => {
        changeRole(roleId as UserRole);
        setShowRoleMenu(false);
        mantineNotifications.show({ title: "Role Switched", message: `Now viewing as ${ROLES.find(r => r.id === roleId)?.label}.`, color: "teal" });
    };

    const handleLogout = () => {
        setShowProfile(false);
        localStorage.removeItem("batchnexus_role");
        router.push("/login");
    };

    const currentRole = ROLES.find(r => r.id === activeRole) || ROLES[0];
    const personaName = getActorName(activeRole);
    const personaInitials = personaName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    const closeAll = () => { setShowRoleMenu(false); setShowNotifications(false); setShowProfile(false); };

    return (
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 flex items-center gap-4 sticky top-0 z-30 w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{currentIcon}</span>
                </span>
                <span className="text-sm text-slate-400 hidden sm:inline">Operations</span>
                <span className="material-symbols-outlined text-slate-300 text-[16px] hidden sm:inline">chevron_right</span>
                <span className="text-sm text-slate-900 truncate font-semibold">{currentLabel}</span>
            </div>

            {/* Search + Actions */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                    <input
                        placeholder="Search lots, suppliers, customers..."
                        className="pl-9 pr-9 w-72 h-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all outline-none"
                        type="text"
                    />
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-sans hidden lg:block">⌘K</kbd>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { const s = !showNotifications; closeAll(); setShowNotifications(s); }}
                        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-600 text-[20px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-900">Notifications</p>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-[11px] text-emerald-600 font-medium hover:underline">Mark all read</button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-2xl opacity-50 mb-1">notifications_off</span>
                                        <p className="text-xs">No notifications</p>
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${n.unread ? 'bg-emerald-50/30' : ''}`}>
                                        <span className={`material-symbols-outlined icon-fill mt-0.5 text-[16px] ${n.color}`}>{n.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs ${n.unread ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                                        </div>
                                        {n.unread && <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile with role switch */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => { const s = !showProfile; closeAll(); setShowProfile(s); }}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-[10px] font-bold">
                            {personaInitials}
                        </div>
                        <div className="hidden sm:block text-left">
                            <div className="text-xs text-slate-900 leading-tight font-medium">{personaName}</div>
                            <div className="text-[10px] text-slate-500 leading-tight">{currentRole.label}</div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 text-[14px]">expand_more</span>
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-xs font-semibold text-slate-900">Switch role (RBAC)</p>
                            </div>
                            {ROLES.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleRoleChange(r.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                        activeRole === r.id
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${activeRole === r.id ? 'icon-fill' : ''}`}>{r.icon}</span>
                                    <span className="flex-1 text-sm">{r.label}</span>
                                    {activeRole === r.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                </button>
                            ))}
                            <div className="border-t border-slate-100">
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-rose-50 transition-colors">
                                    <span className="material-symbols-outlined text-rose-600 text-[18px]">logout</span>
                                    <span className="text-sm text-rose-600 font-medium">Sign out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
