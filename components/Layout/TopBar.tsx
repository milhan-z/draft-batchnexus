"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export const TopBar = () => {
    const router = useRouter();
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

    // Load data-driven notifications from operational records
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
                // Cold-chain alerts
                zonesRes.data.filter((z: any) => z.status === "Cold-chain Alert").forEach((z: any) => {
                    items.push({ id: `cold-${z.id}`, icon: "warning", color: "text-amber-600", title: "Cold-chain Alert", message: `${z.id} at ${z.current_temperature}°C — outside safe range`, time: "Active", unread: true });
                });
                // Pending QC
                const pendingQc = receiptsRes.data.filter((r: any) => r.status === "Pending QC").length;
                if (pendingQc > 0) {
                    items.push({ id: "pending-qc", icon: "science", color: "text-purple-600", title: "Pending QC", message: `${pendingQc} material(s) awaiting QC review`, time: "Now", unread: true });
                }
                // Recent audit events
                auditsRes.data.slice(0, 2).forEach((a: any) => {
                    const icon = a.action.includes("QC") ? "biotech" : a.action.includes("slot") ? "warehouse" : "edit_document";
                    const color = a.action.includes("Block") ? "text-red-600" : "text-blue-600";
                    items.push({ id: a.id, icon, color, title: a.action, message: `${a.actor} • ${a.change_detail?.substring(0, 60) || ""}`, time: new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), unread: false });
                });
                setNotifications(items);
                setNotifsLoaded(true);
            } catch { setNotifsLoaded(true); }
        };
        loadNotifs();
    }, [notifsLoaded]);

    // Close dropdowns when clicking outside
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
        mantineNotifications.show({
            title: "Notifications Cleared",
            message: "All notifications have been marked as read.",
            color: "green"
        });
    };

    const handleRoleChange = (roleId: string) => {
        changeRole(roleId as UserRole);
        setShowRoleMenu(false);
        mantineNotifications.show({
            title: "Role Switched",
            message: `You are now viewing the app as ${ROLES.find(r => r.id === roleId)?.label}.`,
            color: "indigo"
        });
    };

    const handleLogout = () => {
        setShowProfile(false);
        localStorage.removeItem("batchnexus_role");
        router.push("/login");
    };

    const currentRole = ROLES.find(r => r.id === activeRole) || ROLES[0];
    const personaName = getActorName(activeRole);
    const personaInitials = personaName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const personaEmail = personaName.toLowerCase().replace(/\s+/g, ".") + "@sima-arome.com";

    const closeAll = () => {
        setShowRoleMenu(false);
        setShowNotifications(false);
        setShowProfile(false);
    };

    return (
        <header className="bg-surface shadow-sm sticky top-0 z-30 h-16 flex justify-between items-center px-4 md:px-8 md:ml-64 w-full md:w-[calc(100%-16rem)]">
            <div className="flex items-center flex-1">
                <div className="relative w-full max-w-md hidden md:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:bg-surface transition-colors" placeholder="Search orders, lots, or materials..." type="text"/>
                </div>
                <div className="md:hidden font-bold text-xl text-primary">BatchNexus</div>
            </div>
            <div className="flex items-center space-x-3">
                {/* Role Switcher */}
                <div className="relative" ref={roleRef}>
                    <button 
                        onClick={() => { const s = !showRoleMenu; closeAll(); setShowRoleMenu(s); }}
                        className="hidden md:flex items-center text-on-surface-variant text-xs font-bold px-3 py-1.5 border border-outline-variant rounded-sm hover:bg-surface-container-highest transition-colors uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined mr-1 text-sm icon-fill text-primary">{currentRole.icon}</span>
                        {currentRole.label}
                        <span className="material-symbols-outlined ml-1 text-sm">arrow_drop_down</span>
                    </button>
                    {showRoleMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Switch Demo Role</p>
                            </div>
                            {ROLES.map(role => (
                                <button 
                                    key={role.id}
                                    onClick={() => handleRoleChange(role.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                        activeRole === role.id 
                                        ? "bg-primary/5 text-primary" 
                                        : "hover:bg-surface-container-high text-on-surface"
                                    }`}
                                >
                                    <span className={`material-symbols-outlined ${activeRole === role.id ? 'icon-fill' : ''}`}>{role.icon}</span>
                                    <div>
                                        <p className="text-sm font-bold">{role.label}</p>
                                        <p className="text-[10px] text-on-surface-variant">{role.desc}</p>
                                    </div>
                                    {activeRole === role.id && <span className="material-symbols-outlined ml-auto text-primary icon-fill text-sm">check_circle</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => { const s = !showNotifications; closeAll(); setShowNotifications(s); }}
                        className="text-on-surface-variant hover:bg-surface-container-highest p-2 rounded-full transition-colors relative"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in duration-200">
                            <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Notifications</p>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">Mark all read</button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-on-surface-variant">
                                        <span className="material-symbols-outlined text-2xl opacity-50 mb-1">notifications_off</span>
                                        <p className="text-xs">No notifications</p>
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/50 last:border-0 ${n.unread ? 'bg-primary/3' : ''}`}>
                                        <span className={`material-symbols-outlined icon-fill mt-0.5 ${n.color}`}>{n.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs ${n.unread ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{n.title}</p>
                                            <p className="text-xs text-on-surface-variant truncate">{n.message}</p>
                                            <p className="text-[10px] text-outline mt-0.5">{n.time}</p>
                                        </div>
                                        {n.unread && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Avatar */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => { const s = !showProfile; closeAll(); setShowProfile(s); }}
                        className="w-9 h-9 rounded-full bg-primary text-on-primary ml-2 flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                        aria-label="Profile"
                    >
                        {personaInitials}
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in duration-200">
                            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center text-xl font-bold mb-3">{personaInitials}</div>
                                <h3 className="font-bold text-on-surface text-base">{personaName}</h3>
                                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{personaEmail}</p>
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-sm icon-fill">{currentRole.icon}</span>
                                    {currentRole.label}
                                </div>
                            </div>
                            <div className="p-2">
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-error-container/30 text-left transition-colors group">
                                    <span className="material-symbols-outlined text-error text-sm">logout</span>
                                    <span className="text-sm text-error font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
