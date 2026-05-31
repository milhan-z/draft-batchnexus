"use client";
import { useState } from "react";

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
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-5 border-b border-outline-variant bg-surface-container-low flex items-start gap-3">
                <span className="material-symbols-outlined text-primary icon-fill">{icon}</span>
                <div>
                    <h3 className="font-bold text-sm">{title}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function PolicyRulesPage() {
    const [activeHazard, setActiveHazard] = useState<string | null>(null);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-display font-bold text-3xl text-primary">Policy Rules</h2>
                <p className="text-on-surface-variant mt-1">Enforced rules for cold-chain, hazard segregation, QC release, and dispatch. Every recommendation in BatchNexus is checked against these policies.</p>
            </div>

            {/* Cold-chain */}
            <Section icon="thermostat" title="Cold-chain & Zone Policy" subtitle="Temperature ranges and hazard policy per warehouse zone">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant border-b border-outline-variant">
                            <tr>
                                <th className="py-2 pr-4">Zone</th>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Temp Range</th>
                                <th className="py-2 pr-4">Hazard Policy</th>
                                <th className="py-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                            {COLD_CHAIN.map(z => (
                                <tr key={z.zone} className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-3 pr-4 font-mono font-bold text-primary">{z.zone}</td>
                                    <td className="py-3 pr-4">{z.name}</td>
                                    <td className="py-3 pr-4 font-mono">{z.range}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${z.policy === "Flammable allowed" ? "bg-amber-100 text-amber-800" : "bg-surface-variant text-on-surface-variant"}`}>{z.policy}</span>
                                    </td>
                                    <td className="py-3 text-xs text-on-surface-variant">{z.note}</td>
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
                                <tr className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
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
                                        className={activeHazard === rowH ? "bg-primary/5" : ""}
                                    >
                                        <td className="py-2 px-2 text-left text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{rowH}</td>
                                        {HAZARD_CLASSES.map(colH => {
                                            const ok = HAZARD_MATRIX[rowH][colH];
                                            return (
                                                <td key={colH} className="py-2 px-2">
                                                    <span className={`material-symbols-outlined text-[18px] ${ok ? "text-secondary" : "text-error"}`}>
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
                    <p className="text-[10px] text-on-surface-variant mt-3 flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span> Compatible</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-error">block</span> Blocked by policy</span>
                    </p>
                </Section>

                {/* QC policy */}
                <Section icon="biotech" title="QC Release Policy" subtitle="AI is a screening assistant; humans approve the final release">
                    <ul className="space-y-3">
                        {QC_POLICY.map((p, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${p.severity === "ok" ? "text-secondary" : p.severity === "warn" ? "text-amber-500" : "text-error"}`}>
                                    {p.severity === "ok" ? "check_circle" : p.severity === "warn" ? "info" : "block"}
                                </span>
                                <div>
                                    <p className="text-sm font-bold">{p.rule}</p>
                                    <p className="text-xs text-on-surface-variant">{p.action}</p>
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
                        <div key={i} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{d.rule}</p>
                            <p className="text-sm">{d.req}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <div className="bg-primary-container/30 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary icon-fill">verified_user</span>
                <p className="text-xs text-on-surface-variant">
                    These policies are enforced across Inbound, QC, Warehouse, and Dispatch. When a recommendation violates a rule (for example, a flammable material in COLD-B), the action is blocked and the reason is shown. Every enforced decision is recorded in the <span className="font-bold text-primary">Audit Log</span>.
                </p>
            </div>
        </div>
    );
}
