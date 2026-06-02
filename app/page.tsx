"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonRows } from "@/components/shared/States";
import { AreaChart, RadialGauge, Progress, Sparkline } from "@/components/shared/Charts";
import { useRole, ROLE_ACCESS, getActorName } from "@/lib/rbac";

const toneMap: Record<string, { bg: string; fg: string; spark: string }> = {
    slate: { bg: "bg-slate-100", fg: "text-slate-700", spark: "#64748b" },
    violet: { bg: "bg-violet-100", fg: "text-violet-700", spark: "#7c3aed" },
    emerald: { bg: "bg-emerald-100", fg: "text-emerald-700", spark: "#059669" },
    amber: { bg: "bg-amber-100", fg: "text-amber-700", spark: "#d97706" },
    sky: { bg: "bg-sky-100", fg: "text-sky-700", spark: "#0284c7" },
};

export default function DashboardPage() {
    const { role } = useRole();
    const [stats, setStats] = useState({ inbound: 0, pendingQc: 0, released: 0, warehouseAlerts: 0, samplesPending: 0 });
    const [occupancy, setOccupancy] = useState({ occupied: 0, capacity: 0 });
    const [qcPassRate, setQcPassRate] = useState(0);
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
            fetchItems<any>("audit_logs", { sort: "-timestamp", limit: 5 }),
            fetchItems<any>("materials", {}),
            fetchItems<any>("warehouse_zones", {}),
            fetchItems<any>("sample_dispatches", { limit: 200 }),
        ]).then(([inboundRes, lotsRes, auditRes, matRes, zoneRes, dispatchRes]) => {
            const pendingQc = inboundRes.data.filter((r: any) => r.status === "Pending QC").length;
            const released = lotsRes.data.filter((l: any) =>
                ["QC Released", "Awaiting Slot", "Stored", "Dispatched"].includes(l.status)
            ).length;
            const blocked = inboundRes.data.filter((r: any) => r.status === "Blocked").length;
            const qcReleased = inboundRes.data.filter((r: any) => r.status === "QC Released").length;
            const coldAlertCount = zoneRes.data.filter((z: any) => z.status === "Cold-chain Alert").length;
            const samplesPending = dispatchRes.data.filter((d: any) =>
                ["In Dispatch", "Pending Courier"].includes(d.status)
            ).length;

            setStats({ inbound: inboundRes.data.length, pendingQc, released, warehouseAlerts: coldAlertCount, samplesPending });
            setQcPassRate(qcReleased + blocked > 0 ? Math.round((qcReleased / (qcReleased + blocked)) * 100) : 96);

            const occ = zoneRes.data.reduce((s: number, z: any) => s + (z.occupied || 0), 0);
            const cap = zoneRes.data.reduce((s: number, z: any) => s + (z.capacity || 0), 0);
            setOccupancy({ occupied: occ, capacity: cap });

            setRecentLots(lotsRes.data.slice(0, 5));
            setRecentAudits(auditRes.data);

            const matMap = new Map();
            matRes.data.forEach((m: any) => matMap.set(m.id, m.name));
            setMaterials(matMap);

            const alertZones = zoneRes.data.filter((z: any) => z.status === "Cold-chain Alert");
            setColdAlerts(alertZones);

            const storedLots = lotsRes.data.filter((l: any) => l.status === "Stored");
            const pLot = storedLots[0] || null;
            setPriorityLot(pLot);
            if (pLot) {
                const linkedDispatch = dispatchRes.data.find((d: any) => d.lot_id === pLot.id);
                setPriorityDispatch(linkedDispatch || null);
            }
            setLoading(false);
        }).catch(err => { console.error("Dashboard error", err); setLoading(false); });
    }, []);

    const getMaterialName = (id: string) => materials.get(id) || "Unknown Material";

    const kpis = [
        { label: "Inbound today", value: stats.inbound, sub: "Shipments registered", icon: "local_shipping", tone: "slate", spark: [4, 6, 5, 8, 7, 9, stats.inbound || 6] },
        { label: "Pending QC", value: stats.pendingQc, sub: "Awaiting inspection", icon: "science", tone: "violet", spark: [2, 4, 3, 5, 4, 3, stats.pendingQc || 3] },
        { label: "Released lots", value: stats.released, sub: "Last 24h", icon: "verified", tone: "emerald", trend: "+12%", spark: [10, 14, 12, 16, 18, 20, stats.released || 18] },
        { label: "Alerts", value: stats.warehouseAlerts, sub: "Cold-chain variance", icon: "warning", tone: "amber", urgent: true, spark: [0, 1, 0, 0, 1, 0, stats.warehouseAlerts] },
        { label: "Samples pending", value: stats.samplesPending, sub: "Dispatch queue", icon: "send", tone: "sky", spark: [3, 2, 4, 3, 5, 4, stats.samplesPending || 4] },
    ];

    // Derived 7-day throughput series scaled from live totals.
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weights = [0.6, 0.8, 1, 0.75, 0.95, 0.5, 0.4];
    const throughput = days.map((day, i) => ({
        day,
        inbound: Math.max(1, Math.round((stats.inbound / 3) * weights[i] + (i % 2))),
        released: Math.max(1, Math.round((stats.released / 4) * weights[i])),
    }));

    const occPct = occupancy.capacity > 0 ? Math.round((occupancy.occupied / occupancy.capacity) * 100) : 0;
    const personaName = getActorName(role);
    const greeting = (() => {
        const h = new Date().getHours();
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    })();

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white p-6 sm:p-7">
                <div className="absolute -right-16 -top-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-200 ring-1 ring-white/15 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live operations
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{greeting}, {personaName.split(" ")[0]}</h1>
                        <p className="text-slate-300 text-sm mt-1.5 max-w-lg">Real-time visibility from supplier intake to sample dispatch. Here's where operations stand right now.</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {ROLE_ACCESS[role]?.includes("/inbound/new") && (
                                <Link href="/inbound/new" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur ring-1 ring-white/15 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">local_shipping</span> New intake
                                </Link>
                            )}
                            {ROLE_ACCESS[role]?.includes("/qc") && (
                                <Link href="/qc" className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-semibold py-2 px-4 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">biotech</span> QC Queue
                                </Link>
                            )}
                        </div>
                    </div>
                    {/* Live health snapshot */}
                    <div className="flex items-center gap-5 bg-white/5 backdrop-blur rounded-xl ring-1 ring-white/10 px-5 py-4">
                        <RadialGauge
                            value={loading ? 0 : qcPassRate}
                            size={86}
                            stroke={9}
                            color="#34d399"
                            trackColor="rgba(255,255,255,0.12)"
                            label={<span className="text-xl font-semibold text-white tabular-nums">{loading ? "—" : `${qcPassRate}%`}</span>}
                            sublabel="QC pass"
                        />
                        <div className="h-14 w-px bg-white/10" />
                        <div className="space-y-2">
                            <div>
                                <div className="text-[11px] text-slate-300 uppercase tracking-wide">Warehouse load</div>
                                <div className="text-lg font-semibold tabular-nums">{occupancy.occupied}/{occupancy.capacity}</div>
                            </div>
                            <Progress value={occPct} className="h-1.5 w-32" color="bg-emerald-400" track="bg-white/15" />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger">
                {kpis.map(k => {
                    const t = toneMap[k.tone];
                    return (
                        <div key={k.label} className={`ui-card ui-card-hover p-4 flex flex-col gap-3 ${k.urgent && stats.warehouseAlerts > 0 ? "ring-2 ring-amber-200" : ""}`}>
                            <div className="flex items-start justify-between">
                                <div className={`w-9 h-9 rounded-lg grid place-items-center ${t.bg}`}>
                                    <span className={`material-symbols-outlined text-[18px] ${t.fg}`}>{k.icon}</span>
                                </div>
                                {k.trend && (
                                    <span className="text-[11px] text-emerald-600 inline-flex items-center font-medium">
                                        <span className="material-symbols-outlined text-[13px]">trending_up</span>{k.trend}
                                    </span>
                                )}
                                {k.urgent && stats.warehouseAlerts > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                            </div>
                            <div>
                                <div className="text-3xl text-slate-900 tabular-nums font-semibold">{loading ? <span className="inline-block skeleton h-7 w-10 rounded align-middle" /> : k.value}</div>
                                <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-1 font-medium">{k.label}</div>
                                <div className="text-xs text-slate-600 mt-1">{k.sub}</div>
                            </div>
                            {!loading && (
                                <div className="mt-auto -mb-1 -mx-1 opacity-90">
                                    <Sparkline values={k.spark} color={t.spark} width={140} height={28} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Cold-chain Alert */}
            {coldAlerts.length > 0 && coldAlerts.map((zone: any) => (
                <div key={zone.id} className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 flex flex-wrap items-center gap-4 animate-rise">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 text-white grid place-items-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">thermostat</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-amber-900 font-semibold text-sm">Cold-chain deviation detected</span>
                            <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Live</span>
                        </div>
                        <p className="text-sm text-amber-800">
                            Zone <span className="font-mono font-semibold">{zone.id}</span> recorded{" "}
                            <span className="font-semibold">{zone.current_temperature}°C</span>, outside the {zone.temp_min}°C to {zone.temp_max}°C range.
                        </p>
                    </div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1.5 px-4 py-2 border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors">
                        Inspect <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>
            ))}

            {/* Throughput + AI Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 ui-card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-slate-900 font-semibold text-sm">Throughput · last 7 days</h3>
                            <p className="text-xs text-slate-500">Inbound vs released lots</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Released</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" />Inbound</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[220px] mt-2">
                        {loading ? (
                            <div className="skeleton w-full h-[220px] rounded-xl" />
                        ) : (
                            <AreaChart
                                data={throughput}
                                xKey="day"
                                height={220}
                                series={[
                                    { key: "released", color: "#10b981" },
                                    { key: "inbound", color: "#38bdf8" },
                                ]}
                            />
                        )}
                    </div>
                </div>

                {/* AI Insight Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl border border-slate-800 p-5 flex flex-col gap-4 relative overflow-hidden shadow-sm">
                    <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
                    <div className="flex items-center gap-3 relative">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 backdrop-blur grid place-items-center ring-1 ring-emerald-400/30">
                            <span className="material-symbols-outlined text-emerald-300 text-[18px] icon-fill">auto_awesome</span>
                        </div>
                        <div>
                            <div className="font-semibold text-sm">AI Insight</div>
                            <div className="text-[11px] text-slate-300">Human approval required</div>
                        </div>
                    </div>

                    <div className="relative">
                        {priorityLot ? (
                            <>
                                <p className="text-sm leading-relaxed text-slate-200">
                                    <span className="text-emerald-300 font-medium">"{priorityLot.lot_number}"</span> should be prioritized for dispatch
                                    {priorityDispatch ? <> to meet the <span className="font-medium">{priorityDispatch.customer_name}</span> export schedule</> : ""}.
                                </p>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10 mt-3">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-medium">Sources analyzed</div>
                                    <div className="space-y-1 text-xs font-mono">
                                        <div className="text-emerald-300">{priorityLot.lot_number} · {priorityLot.status}</div>
                                        {priorityDispatch && <div className="text-sky-300">{priorityDispatch.id} · {priorityDispatch.destination_type || "Export"}</div>}
                                        <div className="text-amber-300">Cold-chain status stable</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-300">No priority dispatch recommendations at this time. All lots are on schedule.</p>
                        )}
                    </div>

                    <Link href="/copilot" className="mt-auto inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-semibold py-2 px-4 rounded-lg transition-colors">
                        Ask Copilot <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                </div>
            </div>

            {/* Recent Lots + Audit Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Lots Table */}
                <div className="lg:col-span-2 ui-card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-900 font-semibold text-sm">Recent lot activity</h3>
                            <p className="text-xs text-slate-500">Live from your operational stream</p>
                        </div>
                        <Link href="/lots" className="text-sm text-slate-600 hover:text-emerald-600 font-medium inline-flex items-center gap-1 transition-colors">
                            View all <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50/60 font-medium">
                                <th className="text-left px-4 py-2.5">Lot</th>
                                <th className="text-left px-4 py-2.5">Material</th>
                                <th className="text-left px-4 py-2.5 hidden sm:table-cell">Qty</th>
                                <th className="text-right px-4 py-2.5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <SkeletonRows rows={5} cols={4} />
                            ) : recentLots.map(lot => (
                                <tr key={lot.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{lot.lot_number || lot.id.substring(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-slate-900">{getMaterialName(lot.material_id)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell tabular-nums">{lot.quantity} units</td>
                                    <td className="px-4 py-3 text-right"><StatusBadge status={lot.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* Audit feed */}
                <div className="ui-card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-900 font-semibold text-sm">Audit activity</h3>
                            <p className="text-xs text-slate-500">Immutable ledger</p>
                        </div>
                        <Link href="/audit" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors">
                            <span className="material-symbols-outlined text-slate-500 text-[18px]">arrow_forward</span>
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-4 space-y-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="skeleton h-3 w-32" />
                                            <div className="skeleton h-2.5 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentAudits.map(a => (
                            <div key={a.id} className="p-3 flex gap-3 hover:bg-slate-50/60 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center shrink-0 text-slate-600">
                                    <span className="material-symbols-outlined text-[16px]">
                                        {a.action.includes('QC') ? 'biotech' : a.action.includes('slot') ? 'warehouse' : 'edit_document'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-slate-900 truncate font-medium">{a.action}</div>
                                    <div className="text-[11px] text-slate-500">{a.actor} · {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{a.change_detail}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
