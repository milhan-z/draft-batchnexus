"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLES, UserRole } from "@/lib/rbac";

const PERSONAS: {
    roleId: UserRole;
    name: string;
    initial: string;
    desc: string;
    icon: string;
}[] = [
    { roleId: "Receiving Operator", name: "Dimas Pratama", initial: "DP", desc: "Inbound receipts, AI extraction, submit to QC", icon: "📦" },
    { roleId: "QC Staff", name: "Rani Wulandari", initial: "RW", desc: "Review AI QC results, approve/block material release", icon: "🔬" },
    { roleId: "PPIC Planner", name: "Budi Hartono", initial: "BH", desc: "Production scheduling, readiness board, lot prioritization", icon: "📅" },
    { roleId: "Warehouse Admin", name: "Andi Saputra", initial: "AS", desc: "Smart slotting, manual override, cold-chain monitoring", icon: "🏭" },
    { roleId: "Operations Manager", name: "Maya Santoso", initial: "MS", desc: "Full oversight — all modules, AI reports, audit trail", icon: "🎛️" },
    { roleId: "Customer Service", name: "Sari Putri", initial: "SP", desc: "Lot status, sample dispatch, Ops Copilot (read-only)", icon: "💬" },
];

export default function LoginPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<string>("Operations Manager");
    const [selecting, setSelecting] = useState(false);

    const handleEnter = () => {
        if (selecting) return;
        setSelecting(true);
        localStorage.setItem("batchnexus_role", selected);
        window.dispatchEvent(new Event("roleChange"));
        setTimeout(() => router.push("/"), 500);
    };

    return (
        <div className="min-h-screen w-full grid lg:grid-cols-2 bg-slate-950">
            {/* Left brand panel */}
            <div className="relative hidden lg:flex flex-col p-12 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl animate-float-slow" />
                <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />

                {/* Logo */}
                <div className="relative">
                    <img src="/logo-batchnexus.png" alt="BatchNexus Control Tower" className="h-10 object-contain brightness-0 invert" />
                </div>

                {/* Tagline */}
                <div className="relative mt-auto">
                    <h1 className="text-4xl leading-tight font-semibold font-display">
                        One operational brain for intake, QC, lot tracking, warehouse & dispatch.
                    </h1>
                    <p className="mt-4 text-emerald-100/80 max-w-md">
                        Input once. Trace everything. Slot safely. Answer instantly. AI assists at every step — humans approve every critical decision.
                    </p>

                    <div className="mt-8 flex flex-col gap-2.5 max-w-md">
                        {[
                            { icon: "bolt", text: "AI-assisted intake from any supplier message" },
                            { icon: "verified", text: "Computer-vision QC with human sign-off" },
                            { icon: "inventory_2", text: "Smart slotting with cold-chain & hazard policy" },
                        ].map(f => (
                            <div key={f.icon} className="flex items-center gap-3 text-sm text-emerald-50/90">
                                <span className="w-7 h-7 rounded-lg bg-white/10 ring-1 ring-white/15 grid place-items-center shrink-0">
                                    <span className="material-symbols-outlined text-emerald-300 text-[16px]">{f.icon}</span>
                                </span>
                                {f.text}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 max-w-md pt-6 border-t border-white/10">
                        <div>
                            <div className="text-3xl text-emerald-300 font-semibold">98<span className="text-lg">%</span></div>
                            <div className="text-xs text-emerald-100/70 mt-1">QC accuracy</div>
                        </div>
                        <div>
                            <div className="text-3xl text-emerald-300 font-semibold">3.2<span className="text-lg">x</span></div>
                            <div className="text-xs text-emerald-100/70 mt-1">Faster intake</div>
                        </div>
                        <div>
                            <div className="text-3xl text-emerald-300 font-semibold">0</div>
                            <div className="text-xs text-emerald-100/70 mt-1">Lost lots</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right login */}
            <div className="flex items-center justify-center p-6 bg-slate-50 min-h-screen">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 flex flex-col gap-5">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-emerald-600 mb-1 font-semibold">Demo mode</div>
                        <h2 className="text-2xl text-slate-900 font-semibold">Choose your role</h2>
                        <p className="text-sm text-slate-500 mt-1">No password required. Each role unlocks different permissions across the control tower.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 stagger">
                        {PERSONAS.map(r => (
                            <button
                                key={r.roleId}
                                onClick={() => setSelected(r.roleId)}
                                className={`text-left p-3 rounded-lg border transition-all ${
                                    selected === r.roleId
                                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                }`}
                            >
                                <div className="text-lg leading-none">{r.icon}</div>
                                <div className="text-sm text-slate-900 mt-1.5 font-medium">{r.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{r.roleId}</div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleEnter}
                        disabled={selecting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {selecting ? (
                            <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Entering...</>
                        ) : (
                            <>Enter control tower <span className="material-symbols-outlined text-[16px]">arrow_forward</span></>
                        )}
                    </button>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-500 text-[14px] icon-fill">shield</span> RBAC
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-500 text-[14px] icon-fill">lock</span> Audit logged
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-500 text-[14px] icon-fill">language</span> SOC-2 ready
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
