"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useRole, ROLE_ACCESS } from "@/lib/rbac";

export default function DashboardPage() {
    const role = useRole();
    const [stats, setStats] = useState({ inbound: 0, pendingQc: 0, released: 0, warehouseAlerts: 0, samplesPending: 0 });
    const [recentLots, setRecentLots] = useState<any[]>([]);
    const [recentAudits, setRecentAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState<Map<string, string>>(new Map());
    const [coldAlerts, setColdAlerts] = useState<any[]>([]);
    const [priorityLot, setPriorityLot] = useState<any | null>(null);
    const [priorityDispatch, setPriorityDispatch] = useState<any | null>(null);

    useEffect(() => {
        Promise.all([
            fetchItems<any>("inbound_receipts", { limit: 200 }),
            fetchItems<any>("lots", { sort: "-date_created", limit: 200 }),
            fetchItems<any>("audit_logs", { sort: "-timestamp", limit: 4 }),
            fetchItems<any>("materials", {}),
            fetchItems<any>("warehouse_zones", {}),
            fetchItems<any>("sample_dispatches", { limit: 200 }),
        ]).then(([inboundRes, lotsRes, auditRes, matRes, zoneRes, dispatchRes]) => {
            // Fully data-driven KPIs so the numbers always reconcile with the
            // records shown elsewhere in the app (no hard-coded minimums).
            const pendingQc = inboundRes.data.filter((r: any) => r.status === "Pending QC").length;
            const released = lotsRes.data.filter((l: any) =>
                ["QC Released", "Awaiting Slot", "Stored", "Dispatched"].includes(l.status)
            ).length;
            const coldAlerts = zoneRes.data.filter((z: any) => z.status === "Cold-chain Alert").length;
            const samplesPending = dispatchRes.data.filter((d: any) =>
                ["In Dispatch", "Pending Courier"].includes(d.status)
            ).length;

            setStats({
                inbound: inboundRes.data.length,
                pendingQc,
                released,
                warehouseAlerts: coldAlerts,
                samplesPending,
            });

            setRecentLots(lotsRes.data.slice(0, 5));
            setRecentAudits(auditRes.data);

            const matMap = new Map();
            matRes.data.forEach((m: any) => matMap.set(m.id, m.name));
            setMaterials(matMap);

            // Data-driven cold-chain alerts
            const alertZones = zoneRes.data.filter((z: any) => z.status === "Cold-chain Alert");
            setColdAlerts(alertZones);

            // Data-driven AI Insight: find priority lot for dispatch
            const storedLots = lotsRes.data.filter((l: any) => l.status === "Stored");
            const pLot = storedLots[0] || null;
            setPriorityLot(pLot);
            if (pLot) {
                const linkedDispatch = dispatchRes.data.find((d: any) => d.lot_id === pLot.id);
                setPriorityDispatch(linkedDispatch || null);
            }

            setLoading(false);
        }).catch(err => {
            console.error("Dashboard error", err);
            setLoading(false);
        });
    }, []);

    const getMaterialName = (id: string) => materials.get(id) || "Unknown Material";

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="font-display font-bold text-3xl text-primary">Operations Control Tower</h2>
                    <p className="text-on-surface-variant mt-1">Real-time visibility from supplier intake to sample dispatch.</p>
                </div>
                <div className="flex gap-4 hidden md:flex">
                    {ROLE_ACCESS[role]?.includes("/inbound/new") && (
                        <Link href="/inbound/new" className="px-4 py-2 border border-outline-variant bg-white font-bold rounded-sm text-xs uppercase tracking-widest text-on-surface flex items-center gap-2 hover:border-primary hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span> New Intake
                        </Link>
                    )}
                    {ROLE_ACCESS[role]?.includes("/qc") && (
                        <Link href="/qc" className="px-4 py-2 bg-primary text-on-primary font-bold rounded-sm text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity">
                            <span className="material-symbols-outlined text-[16px]">biotech</span> QC Queue
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Inbound Today</span>
                        <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
                    </div>
                    <div className="mt-auto">
                        <span className="text-4xl font-bold font-mono">{loading ? "..." : stats.inbound}</span>
                        <p className="text-xs text-on-surface-variant mt-1">Shipments registered</p>
                    </div>
                </div>
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Pending QC</span>
                        <span className="material-symbols-outlined text-secondary text-[20px]">science</span>
                    </div>
                    <div className="mt-auto">
                        <span className="text-4xl font-bold font-mono">{loading ? "..." : stats.pendingQc}</span>
                        <div className="w-full bg-outline-variant h-1 mt-2 rounded-full overflow-hidden">
                            <div className="bg-secondary h-full" style={{ width: `${Math.min((stats.pendingQc / 10) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Released Lots</span>
                        <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
                    </div>
                    <div className="mt-auto">
                        <span className="text-4xl font-bold font-mono">{loading ? "..." : stats.released}</span>
                        <p className="text-xs text-primary flex items-center mt-1"><span className="material-symbols-outlined text-sm mr-1">trending_up</span> Consistent</p>
                    </div>
                </div>
                <div className="bg-error-container/20 rounded-xl p-6 border border-error/20 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-error/10 rounded-full blur-xl group-hover:bg-error/20 transition-all"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="text-[10px] font-bold text-on-error-container uppercase tracking-widest">Alerts</span>
                        <span className="material-symbols-outlined text-error text-[20px] animate-pulse">warning</span>
                    </div>
                    <div className="mt-auto relative z-10">
                        <span className="text-4xl font-bold font-mono text-error">{loading ? "..." : stats.warehouseAlerts}</span>
                        <p className="text-xs text-on-error-container mt-1 font-bold">{coldAlerts.length > 0 ? `Cold-chain variance ${coldAlerts[0]?.id}` : "No active alerts"}</p>
                    </div>
                </div>
                <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Samples Pending</span>
                        <span className="material-symbols-outlined text-outline text-[20px]">send</span>
                    </div>
                    <div className="mt-auto">
                        <span className="text-4xl font-bold font-mono">{loading ? "..." : stats.samplesPending}</span>
                        <p className="text-xs text-on-surface-variant mt-1">Pending dispatch</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Cold-chain Alert — data-driven */}
                    {coldAlerts.length > 0 && coldAlerts.map((zone: any) => (
                    <div key={zone.id} className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                        <span className="material-symbols-outlined text-amber-500 icon-fill text-2xl mt-0.5">thermostat</span>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h3 className="font-bold text-amber-900 text-sm">Cold-chain deviation detected</h3>
                                <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Live Alert</span>
                            </div>
                            <p className="text-sm text-amber-800">Zone <span className="font-mono font-bold">{zone.id}</span> recorded <span className="font-bold">{zone.current_temperature}°C</span>, outside the required {zone.temp_min}°C to {zone.temp_max}°C range.</p>
                        </div>
                        <Link href="/warehouse" className="text-amber-700 font-bold text-xs uppercase tracking-widest border border-amber-300 px-3 py-2 rounded-sm hover:bg-amber-100 transition-colors whitespace-nowrap self-center">
                            Inspect →
                        </Link>
                    </div>
                    ))}
                    <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                            <h3 className="font-bold text-sm">Recent Lots Activity</h3>
                            <Link href="/lots" className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span></Link>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-3 border-b border-outline-variant">Lot ID</th>
                                    <th className="px-6 py-3 border-b border-outline-variant">Material</th>
                                    <th className="px-6 py-3 border-b border-outline-variant text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-outline-variant/30">
                                {loading ? (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-outline"><span className="material-symbols-outlined animate-spin">sync</span></td></tr>
                                ) : recentLots.map(lot => (
                                    <tr key={lot.id} className="hover:bg-surface-container-lowest transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold">{lot.lot_number || lot.id.substring(0,8)}</td>
                                        <td className="px-6 py-4">{getMaterialName(lot.material_id)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <StatusBadge status={lot.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                            <h3 className="font-bold text-sm">Recent Audit Events</h3>
                            <Link href="/audit" className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">View Log <span className="material-symbols-outlined text-[14px]">arrow_forward</span></Link>
                        </div>
                        <div className="p-0">
                            {loading ? (
                                <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                            ) : recentAudits.map((a, i) => (
                                <div key={a.id} className={`p-4 flex items-start gap-4 ${i !== recentAudits.length -1 ? 'border-b border-outline-variant' : ''}`}>
                                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                            {a.action.includes('QC') ? 'biotech' : a.action.includes('slot') ? 'warehouse' : 'edit_document'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{a.action}</p>
                                        <p className="text-xs text-on-surface-variant mt-0.5"><span className="font-bold">{a.actor}</span> • {new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        <p className="text-xs text-on-surface-variant mt-1 opacity-80">{a.change_detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-surface-container-low rounded-xl p-6 border border-primary/20 shadow-sm flex flex-col relative overflow-hidden h-full">
                        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 rounded bg-primary text-on-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">auto_awesome</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-primary">AI Insight</h3>
                                <p className="text-[10px] text-on-surface-variant">Human decision required</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-6 relative z-10">
                            {priorityLot ? (
                                <>
                                    <p className="text-sm text-on-surface-variant font-bold leading-relaxed">
                                        &ldquo;{priorityLot.lot_number} should be prioritized for dispatch{priorityDispatch ? ` to meet the ${priorityDispatch.customer_name} ${priorityDispatch.destination_type?.toLowerCase() || "export"} schedule` : ""}.&rdquo;
                                    </p>
                                    <div className="bg-white/50 p-3 rounded border border-outline-variant backdrop-blur-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">Sources Analyzed</p>
                                        <div className="space-y-1">
                                            <p className="text-xs font-mono"><span className="text-primary font-bold">{priorityLot.lot_number}</span> status: {priorityLot.status}</p>
                                            {priorityDispatch && <p className="text-xs font-mono"><span className="text-secondary font-bold">{priorityDispatch.id}</span> type: {priorityDispatch.destination_type || "Export"}</p>}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-on-surface-variant opacity-70">No priority dispatch recommendations at this time. All lots are on schedule.</p>
                            )}
                        </div>

                        <Link href="/copilot" className="mt-auto w-full text-left bg-white px-4 py-3 rounded-sm border border-outline-variant hover:border-primary transition-all flex justify-between items-center group relative z-10 font-bold uppercase tracking-widest text-[10px]">
                            <span className="group-hover:text-primary transition-colors">Ask Copilot</span>
                            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[16px]">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
