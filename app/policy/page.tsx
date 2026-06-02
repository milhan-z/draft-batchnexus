"use client";
import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";

const COLD_CHAIN = [
    { zone: "AMB-A", name: "Ambient storage", range: "15°C to 30°C", policy: "No flammable", note: "Standard dry goods" },
    { zone: "COLD-B", name: "Cold storage", range: "-4°C to 4°C", policy: "No flammable", note: "Chilled extracts" },
    { zone: "FRZ-C", name: "Freezer storage", range: "-20°C to -4°C", policy: "No flammable", note: "Cold-chain critical" },
    { zone: "HAZ-D", name: "Hazard-compatible", range: "-20°C to 25°C", policy: "Flammable allowed", note: "Segregated hazard bay" },
    { zone: "HOLD-QC", name: "Quarantine", range: "Ambient", policy: "QC hold only", note: "Pending inspection" },
];

// Hazard segregation matrix — true = compatible, false = blocked
const HAZARD_CLASSES = ["Normal", "Flammable", "Oxidizer", "Toxic"];
const HAZARD_MATRIX: Record<string, Record<string, boolean>> = {
    Normal:    { Normal: true,  Flammable: true,  Oxidizer: true,  Toxic: true },
    Flammable: { Normal: true,  Flammable: true,  Oxidizer: false, Toxic: false },
    Oxidizer:  { Normal: true,  Flammable: false, Oxidizer: true,  Toxic: false },
    Toxic:     { Normal: true,  Flammable: false, Oxidizer: false, Toxic: true },
};

const QC_POLICY = [
    { rule: "AI confidence ≥ 85%", action: "Eligible for human approval", severity: "ok" },
    { rule: "AI confidence 70–84%", action: "Review recommended before release", severity: "warn" },
    { rule: "AI confidence < 70%", action: "Human re-inspection required", severity: "warn" },
    { rule: "Defect or foreign-matter risk = High", action: "Auto-flag, block release", severity: "danger" },
    { rule: "Final QC release", action: "Always human-approved & audit-logged", severity: "ok" },
];

const DISPATCH_POLICY = [
    { rule: "Lot status", req: "Must be Stored or QC Released" },
    { rule: "QC record", req: "Linked QC inspection with human decision" },
    { rule: "Cold-chain materials", req: "Verified zone temperature within range" },
    { rule: "Export shipments", req: "Traceability report attached" },
];

function Section({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="ui-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                    <span className="material-symbols-outlined icon-fill text-[20px]">{icon}</span>
                </span>
                <div>
                    <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function PolicyRulesPage() {
    const [activeHazard, setActiveHazard] = useState<string | null>(null);

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="gavel"
                title="Policy Rules"
                subtitle="Enforced rules for cold-chain, hazard segregation, QC release, and dispatch. Every recommendation in BatchNexus is checked against these policies."
            />

            {/* Cold-chain */}
            <Section icon="thermostat" title="Cold-chain & Zone Policy" subtitle="Temperature ranges and hazard policy per warehouse zone">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="py-2.5 pr-4">Zone</th>
                                <th className="py-2.5 pr-4">Name</th>
                                <th className="py-2.5 pr-4">Temp Range</th>
                                <th className="py-2.5 pr-4">Hazard Policy</th>
                                <th className="py-2.5">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {COLD_CHAIN.map(z => (
                                <tr key={z.zone} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 pr-4 font-mono font-semibold text-emerald-700">{z.zone}</td>
                                    <td className="py-3 pr-4 text-slate-900">{z.name}</td>
                                    <td className="py-3 pr-4 font-mono text-slate-600">{z.range}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${z.policy === "Flammable allowed" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{z.policy}</span>
                                    </td>
                                    <td className="py-3 text-xs text-slate-500">{z.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hazard matrix */}
                <Section icon="warning" title="Hazard Segregation Matrix" subtitle="Which hazard classes can be co-located. Hover a row to highlight.">
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-sm">
                            <thead>
                                <tr className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                                    <th className="py-2 px-2 text-left"></th>
                                    {HAZARD_CLASSES.map(h => <th key={h} className="py-2 px-2">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {HAZARD_CLASSES.map(rowH => (
                                    <tr
                                        key={rowH}
                                        onMouseEnter={() => setActiveHazard(rowH)}
                                        onMouseLeave={() => setActiveHazard(null)}
                                        className={`transition-colors ${activeHazard === rowH ? "bg-emerald-50/60" : ""}`}
                                    >
                                        <td className="py-2 px-2 text-left text-[11px] uppercase tracking-wide font-semibold text-slate-500">{rowH}</td>
                                        {HAZARD_CLASSES.map(colH => {
                                            const ok = HAZARD_MATRIX[rowH][colH];
                                            return (
                                                <td key={colH} className="py-2 px-2">
                                                    <span className={`material-symbols-outlined text-[18px] ${ok ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {ok ? "check_circle" : "block"}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span> Compatible</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-rose-500">block</span> Blocked by policy</span>
                    </p>
                </Section>

                {/* QC policy */}
                <Section icon="biotech" title="QC Release Policy" subtitle="AI is a screening assistant; humans approve the final release">
                    <ul className="space-y-3">
                        {QC_POLICY.map((p, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${p.severity === "ok" ? "text-emerald-500" : p.severity === "warn" ? "text-amber-500" : "text-rose-500"}`}>
                                    {p.severity === "ok" ? "check_circle" : p.severity === "warn" ? "info" : "block"}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{p.rule}</p>
                                    <p className="text-xs text-slate-500">{p.action}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>

            {/* Dispatch policy */}
            <Section icon="send" title="Dispatch Requirements" subtitle="Conditions a lot must satisfy before it can be dispatched">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {DISPATCH_POLICY.map((d, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                            <p className="micro-label mb-1">{d.rule}</p>
                            <p className="text-sm text-slate-800">{d.req}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 icon-fill">verified_user</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                    These policies are enforced across Inbound, QC, Warehouse, and Dispatch. When a recommendation violates a rule (for example, a flammable material in COLD-B), the action is blocked and the reason is shown. Every enforced decision is recorded in the <span className="font-semibold text-emerald-700">Audit Log</span>.
                </p>
            </div>
        </div>
    );
}
