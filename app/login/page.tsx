"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLES, UserRole } from "@/lib/rbac";

const PERSONAS: {
    roleId: UserRole;
    name: string;
    initial: string;
    desc: string;
    cardClass: string;
    badgeClass: string;
    avatarClass: string;
}[] = [
    {
        roleId: "Receiving Operator",
        name: "Dimas Pratama",
        initial: "DP",
        desc: "Inbound receipts, AI extraction, submit to QC",
        cardClass: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100",
        badgeClass: "bg-blue-100 text-blue-700",
        avatarClass: "bg-blue-500",
    },
    {
        roleId: "QC Staff",
        name: "Rani Wulandari",
        initial: "RW",
        desc: "Review AI QC results, approve/block material release",
        cardClass: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100",
        badgeClass: "bg-purple-100 text-purple-700",
        avatarClass: "bg-purple-500",
    },
    {
        roleId: "PPIC Planner",
        name: "Budi Hartono",
        initial: "BH",
        desc: "Production scheduling, readiness board, lot prioritization",
        cardClass: "bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100",
        badgeClass: "bg-amber-100 text-amber-700",
        avatarClass: "bg-amber-500",
    },
    {
        roleId: "Warehouse Admin",
        name: "Andi Saputra",
        initial: "AS",
        desc: "Smart slotting, manual override, cold-chain monitoring",
        cardClass: "bg-teal-50 border-teal-200 hover:border-teal-400 hover:bg-teal-100",
        badgeClass: "bg-teal-100 text-teal-700",
        avatarClass: "bg-teal-600",
    },
    {
        roleId: "Operations Manager",
        name: "Maya Santoso",
        initial: "MS",
        desc: "Full oversight — all modules, AI reports, audit trail",
        cardClass: "bg-primary-container/30 border-primary/20 hover:border-primary hover:bg-primary-container/50",
        badgeClass: "bg-primary text-on-primary",
        avatarClass: "bg-primary",
    },
    {
        roleId: "Customer Service",
        name: "Sari Putri",
        initial: "SP",
        desc: "Lot status, sample dispatch, Ops Copilot (read-only)",
        cardClass: "bg-surface-container border-outline-variant hover:border-outline hover:bg-surface-container-high",
        badgeClass: "bg-surface-variant text-on-surface-variant",
        avatarClass: "bg-outline",
    },
];

export default function LoginPage() {
    const router = useRouter();
    const [selecting, setSelecting] = useState<string | null>(null);

    const handleSelect = (roleId: UserRole) => {
        if (selecting) return;
        setSelecting(roleId);
        localStorage.setItem("batchnexus_role", roleId);
        window.dispatchEvent(new Event("roleChange"));
        setTimeout(() => router.push("/"), 500);
    };

    return (
        <div className="min-h-screen flex">
            {/* ── LEFT: Branding Panel ───────────────────────── */}
            <div className="hidden lg:flex w-[38%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
                {/* decorative circles */}
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
                <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-white/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/3" />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary icon-fill">factory</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-2xl text-on-primary leading-none">Sima Arôme</h1>
                            <p className="text-on-primary/60 text-[10px] font-mono uppercase tracking-widest mt-0.5">BatchNexus Control Tower</p>
                        </div>
                    </div>
                </div>

                {/* Tagline */}
                <div className="relative z-10 space-y-8">
                    <blockquote className="text-on-primary/90 text-2xl font-display font-bold leading-snug">
                        "Input once.<br />
                        Trace everything.<br />
                        Slot safely.<br />
                        Answer instantly."
                    </blockquote>

                    <div className="space-y-3">
                        {[
                            "AI-powered document extraction",
                            "End-to-end lot traceability",
                            "Smart warehouse slotting",
                            "Immutable audit trail",
                            "Role-based access control",
                        ].map((feat) => (
                            <div key={feat} className="flex items-center gap-2.5 text-on-primary/70 text-sm">
                                <span className="material-symbols-outlined text-on-primary/60 icon-fill text-base">check_circle</span>
                                {feat}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <div className="flex items-center gap-4">
                        <span className="text-on-primary/30 text-[10px] uppercase tracking-widest">Powered by</span>
                        <span className="text-on-primary/50 text-[10px] font-mono font-bold">BuildPad DaaS</span>
                        <span className="text-on-primary/20">×</span>
                        <span className="text-on-primary/50 text-[10px] font-mono font-bold">Groq Llama-3</span>
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Role Selector ───────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-surface-container-lowest overflow-y-auto">
                <div className="w-full max-w-2xl">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary icon-fill">factory</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-xl text-primary leading-none">Sima Arôme</h1>
                            <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">BatchNexus Control Tower</p>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="font-display font-bold text-2xl text-on-surface">Select your role</h2>
                        <p className="text-on-surface-variant text-sm mt-1">
                            Choose a persona to explore the system with appropriate access permissions.
                        </p>
                    </div>

                    {/* Persona cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PERSONAS.map((p) => {
                            const isSelecting = selecting === p.roleId;
                            const isLoading = !!selecting;

                            return (
                                <button
                                    key={p.roleId}
                                    onClick={() => handleSelect(p.roleId)}
                                    disabled={isLoading}
                                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200
                                        ${p.cardClass}
                                        ${isSelecting ? "scale-[0.97] opacity-70" : "hover:shadow-md hover:-translate-y-0.5"}
                                        ${isLoading && !isSelecting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                    `}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div
                                            className={`w-11 h-11 rounded-full ${p.avatarClass} text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm`}
                                        >
                                            {isSelecting ? (
                                                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                            ) : (
                                                p.initial
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <p className="font-bold text-sm text-on-surface">{p.name}</p>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${p.badgeClass}`}>
                                                    {p.roleId === "Operations Manager" ? "Ops Manager" : p.roleId}
                                                </span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant leading-relaxed">{p.desc}</p>
                                        </div>
                                    </div>

                                    {/* Entering indicator */}
                                    {isSelecting && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                                            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                            Entering as {p.name}...
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Demo note */}
                    <div className="mt-8 text-center">
                        <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-widest font-bold">
                            Demo Mode — No password required
                        </p>
                        <p className="text-[10px] text-on-surface-variant/40 mt-1">
                            Each role has different permissions. Try switching roles via the topbar after login.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
