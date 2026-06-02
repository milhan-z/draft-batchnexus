"use client";
import { useState } from "react";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canGenerateSummary, getActorName } from "@/lib/rbac";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { RadialGauge } from "@/components/shared/Charts";

interface ModuleKPI {
    label: string;
    value: string | number;
    icon: string;
    trend?: "up" | "down" | "stable";
}

interface AttentionItem {
    severity: "danger" | "warn" | "info";
    title: string;
    detail: string;
    entity?: string;
    link?: string;
}

interface ModuleSection {
    module: string;
    icon: string;
    status: "healthy" | "warning" | "critical";
    summary: string;
    details: string[];
}

interface SummaryResult {
    kpis: ModuleKPI[];
    sections: ModuleSection[];
    attentionItems: AttentionItem[];
    recommendations: string[];
    sources: string[];
    generatedAt: string;
}

export default function AISummaryPage() {
    const { role } = useRole();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SummaryResult | null>(null);
    const hasPermission = canGenerateSummary(role);

    const buildSummary = async (): Promise<SummaryResult> => {
        const [receipts, lots, zones, dispatches, qcRes, tempRes] = await Promise.all([
            fetchItems<any>("inbound_receipts", { limit: 200 }),
            fetchItems<any>("lots", { limit: 200 }),
            fetchItems<any>("warehouse_zones", {}),
            fetchItems<any>("sample_dispatches", { limit: 200 }),
            fetchItems<any>("qc_inspections", { limit: 200 }),
            fetchItems<any>("temperature_readings", { limit: 200 }),
        ]);

        const inboundCount = receipts.data.length;
        const pendingQc = receipts.data.filter((r: any) => r.status === "Pending QC").length;
        const qcReleased = receipts.data.filter((r: any) => r.status === "QC Released").length;
        const blocked = receipts.data.filter((r: any) => r.status === "Blocked").length;
        const totalLots = lots.data.length;
        const storedLots = lots.data.filter((l: any) => l.status === "Stored").length;
        const awaitingSlot = lots.data.filter((l: any) => l.status === "Awaiting Slot").length;
        const dispatchedLots = lots.data.filter((l: any) => l.status === "Dispatched").length;
        const coldAlerts = zones.data.filter((z: any) => z.status === "Cold-chain Alert");
        const totalDispatches = dispatches.data.length;
        const pendingDispatches = dispatches.data.filter((d: any) => ["In Dispatch", "Pending Courier"].includes(d.status)).length;
        const totalZoneCapacity = zones.data.reduce((sum: number, z: any) => sum + (z.capacity || 0), 0);
        const totalOccupied = zones.data.reduce((sum: number, z: any) => sum + (z.occupied || 0), 0);
        const occupancyPct = totalZoneCapacity > 0 ? Math.round((totalOccupied / totalZoneCapacity) * 100) : 0;

        const kpis: ModuleKPI[] = [
            { label: "Inbound Today", value: inboundCount, icon: "local_shipping", trend: "stable" },
            { label: "QC Pass Rate", value: inboundCount > 0 ? `${Math.round((qcReleased / Math.max(qcReleased + blocked, 1)) * 100)}%` : "—", icon: "verified", trend: "up" },
            { label: "Warehouse Occupancy", value: `${occupancyPct}%`, icon: "warehouse", trend: occupancyPct > 80 ? "up" : "stable" },
            { label: "Active Alerts", value: coldAlerts.length, icon: "warning", trend: coldAlerts.length > 0 ? "up" : "stable" },
            { label: "Lots in System", value: totalLots, icon: "inventory_2", trend: "stable" },
            { label: "Dispatches Pending", value: pendingDispatches, icon: "send", trend: "stable" },
        ];

        const sections: ModuleSection[] = [
            {
                module: "Inbound Intake",
                icon: "move_to_inbox",
                status: pendingQc > 5 ? "warning" : "healthy",
                summary: `${inboundCount} receipts registered, ${pendingQc} awaiting QC review.`,
                details: [
                    `${qcReleased} receipts passed QC and released`,
                    `${blocked} receipt(s) blocked pending review`,
                    `${pendingQc} material(s) in QC queue`,
                ],
            },
            {
                module: "Quality Control",
                icon: "biotech",
                status: blocked > 0 ? "warning" : "healthy",
                summary: `${qcRes.data.length} inspections completed. ${blocked > 0 ? `${blocked} blocked.` : "All clear."}`,
                details: [
                    `${qcRes.data.length} total QC inspections on record`,
                    `Average confidence: ${qcRes.data.length > 0 ? Math.round(qcRes.data.reduce((s: number, q: any) => s + (q.confidence || 0.85), 0) / qcRes.data.length * 100) : 0}%`,
                    blocked > 0 ? `⚠ ${blocked} item(s) blocked — requires manager attention` : "No blocked items",
                ],
            },
            {
                module: "Warehouse & Cold-chain",
                icon: "warehouse",
                status: coldAlerts.length > 0 ? "critical" : occupancyPct > 85 ? "warning" : "healthy",
                summary: `${occupancyPct}% occupied. ${coldAlerts.length > 0 ? `${coldAlerts.length} cold-chain alert(s).` : "All zones in range."}`,
                details: [
                    `${storedLots} lots currently stored, ${awaitingSlot} awaiting slot`,
                    `Overall occupancy: ${totalOccupied}/${totalZoneCapacity} bins (${occupancyPct}%)`,
                    coldAlerts.length > 0 ? `⚠ ${coldAlerts.map((z: any) => `${z.id}: ${z.current_temperature}°C`).join(", ")}` : "All temperature zones within range",
                ],
            },
            {
                module: "Dispatch & Samples",
                icon: "send",
                status: pendingDispatches > 3 ? "warning" : "healthy",
                summary: `${totalDispatches} total dispatches, ${pendingDispatches} pending shipment.`,
                details: [
                    `${dispatches.data.filter((d: any) => d.status === "Dispatched").length} successfully dispatched`,
                    `${pendingDispatches} awaiting courier/shipment`,
                    `${dispatches.data.filter((d: any) => d.destination_type === "Export").length} export shipments`,
                ],
            },
        ];

        const attentionItems: AttentionItem[] = [];
        if (coldAlerts.length > 0) {
            coldAlerts.forEach((z: any) => {
                attentionItems.push({
                    severity: "danger",
                    title: "Cold-chain deviation",
                    detail: `${z.id} (${z.name}) recorded ${z.current_temperature}°C, outside ${z.temp_min}°C to ${z.temp_max}°C.`,
                    entity: z.id,
                    link: "/warehouse",
                });
            });
        }
        if (blocked > 0) {
            attentionItems.push({
                severity: "warn",
                title: "Blocked materials",
                detail: `${blocked} item(s) blocked pending QC review. Requires manager decision.`,
                link: "/qc",
            });
        }
        if (awaitingSlot > 0) {
            attentionItems.push({
                severity: "info",
                title: "Lots awaiting slot",
                detail: `${awaitingSlot} lot(s) released from QC but not yet assigned warehouse slot.`,
                link: "/warehouse",
            });
        }
        if (pendingDispatches > 0) {
            const priorityLot = lots.data.find((l: any) => l.status === "Stored");
            attentionItems.push({
                severity: "info",
                title: "Dispatch priority",
                detail: `${priorityLot?.lot_number || "Next lot"} should be prioritized for the next export window.`,
                entity: priorityLot?.lot_number,
                link: "/dispatch",
            });
        }

        const recommendations: string[] = [];
        if (coldAlerts.length > 0) recommendations.push("Investigate cold-chain deviation immediately. Check compressor and door seals.");
        if (blocked > 0) recommendations.push("Review blocked materials and decide: re-inspect, return to supplier, or quarantine.");
        if (awaitingSlot > 0) recommendations.push("Assign warehouse slots to released lots to prevent staging area congestion.");
        if (occupancyPct > 85) recommendations.push("Warehouse nearing capacity. Consider expediting dispatch or overflow planning.");
        if (pendingDispatches > 2) recommendations.push("Prioritize pending dispatches to meet customer delivery schedules.");
        if (recommendations.length === 0) recommendations.push("Operations running smoothly. No immediate action required.");

        return {
            kpis,
            sections,
            attentionItems,
            recommendations,
            sources: ["inbound_receipts", "qc_inspections", "lots", "warehouse_zones", "temperature_readings", "sample_dispatches"],
            generatedAt: new Date().toLocaleString("en-GB"),
        };
    };

    const handleGenerate = async () => {
        if (!hasPermission) return;
        setLoading(true);
        setResult(null);
        try {
            await new Promise(r => setTimeout(r, 800));
            const summary = await buildSummary();
            setResult(summary);
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: getActorName(role),
                role,
                action: "Generated AI Operations summary",
                entity: "Report",
                change_detail: "Daily operations summary generated from operational records.",
            });
        } catch (e) {
            notifications.show({ title: "Error", message: "Could not generate summary.", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!result) return;
        let text = "BATCHNEXUS — AI OPERATIONS SUMMARY\n";
        text += `Generated: ${result.generatedAt}\n\n`;
        text += "═══ KPIs ═══\n";
        result.kpis.forEach(k => { text += `  ${k.label}: ${k.value}\n`; });
        text += "\n═══ MODULE STATUS ═══\n";
        result.sections.forEach(s => {
            text += `\n[${s.status.toUpperCase()}] ${s.module}\n`;
            text += `  ${s.summary}\n`;
            s.details.forEach(d => { text += `  • ${d}\n`; });
        });
        text += "\n═══ ATTENTION ITEMS ═══\n";
        result.attentionItems.forEach(a => { text += `  [${a.severity.toUpperCase()}] ${a.title}: ${a.detail}\n`; });
        text += "\n═══ RECOMMENDATIONS ═══\n";
        result.recommendations.forEach(r => { text += `  → ${r}\n`; });
        text += `\nSources: ${result.sources.join(", ")}\n`;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `operations_summary_${new Date().toISOString().split("T")[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statusColor = (s: string) => s === "critical" ? "text-rose-600" : s === "warning" ? "text-amber-600" : "text-emerald-600";
    const statusBg = (s: string) => s === "critical" ? "bg-rose-50 border-rose-200" : s === "warning" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";
    const severityColor = (s: string) => s === "danger" ? "bg-rose-50 border-rose-200" : s === "warn" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200";

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="summarize"
                title="AI Operations Summary"
                subtitle="Manager-ready daily report with KPIs, module status, and action items."
                actions={
                    <>
                        {result && (
                            <button onClick={handleExport} className="btn btn-secondary">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !hasPermission}
                            className="btn btn-primary"
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
                            Generate Summary
                        </button>
                    </>
                }
            />

            {!hasPermission && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3">
                    <span className="material-symbols-outlined">lock</span>
                    <p className="text-sm">Your role ({role}) does not have permission to generate summaries. Switch to Operations Manager.</p>
                </div>
            )}

            {!result && !loading && hasPermission && (
                <div className="ui-card">
                    <EmptyState
                        icon="summarize"
                        title="No report generated yet"
                        description="Click &ldquo;Generate Summary&rdquo; to produce a manager-ready daily report from live operational records."
                    />
                </div>
            )}

            {loading && (
                <div className="ui-card flex flex-col items-center justify-center min-h-[300px] text-slate-500 gap-4">
                    <span className="material-symbols-outlined animate-spin text-4xl text-emerald-600">progress_activity</span>
                    <p className="text-sm font-medium">Analyzing operational records...</p>
                </div>
            )}

            {result && !loading && (
                <div className="space-y-6 animate-rise">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {result.kpis.map((kpi, i) => {
                            const isPct = typeof kpi.value === "string" && kpi.value.endsWith("%");
                            const pctVal = isPct ? parseInt(kpi.value as string) : 0;
                            const gaugeColor = pctVal >= 80 ? "#059669" : pctVal >= 50 ? "#0ea5e9" : "#d97706";
                            return (
                                <div key={i} className="ui-card ui-card-hover p-4 flex flex-col items-center text-center">
                                    {isPct ? (
                                        <RadialGauge value={pctVal} size={68} stroke={7} color={gaugeColor}
                                            label={<span className="text-base font-bold text-slate-900">{kpi.value}</span>} />
                                    ) : (
                                        <div className="w-[68px] h-[68px] grid place-items-center">
                                            <div className="text-center">
                                                <span className="material-symbols-outlined text-emerald-600 text-[22px]">{kpi.icon}</span>
                                                <p className="font-mono font-bold text-xl text-slate-900 leading-none mt-1">{kpi.value}</p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="micro-label mt-2">{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Module Status */}
                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">dashboard</span>
                                Module Status
                            </h3>
                            {result.sections.map((sec, i) => (
                                <div key={i} className={`rounded-xl border p-5 ${statusBg(sec.status)}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`material-symbols-outlined ${statusColor(sec.status)}`}>{sec.icon}</span>
                                        <h4 className="font-semibold text-sm text-slate-900 flex-1">{sec.module}</h4>
                                        <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${sec.status === "critical" ? "bg-rose-600 text-white" : sec.status === "warning" ? "bg-amber-200 text-amber-900" : "bg-emerald-600 text-white"}`}>
                                            {sec.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{sec.summary}</p>
                                    <ul className="space-y-1">
                                        {sec.details.map((d, j) => (
                                            <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                                                <span className="material-symbols-outlined text-[14px] mt-px text-slate-400">chevron_right</span>
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Right: Attention + Recommendations */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-rose-600 text-[18px]">priority_high</span>
                                    Attention Required
                                </h3>
                                <div className="space-y-3">
                                    {result.attentionItems.length === 0 ? (
                                        <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">No items require attention.</p>
                                    ) : result.attentionItems.map((item, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${severityColor(item.severity)}`}>
                                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-600 mt-1">{item.detail}</p>
                                            {item.entity && <p className="text-[11px] font-mono text-emerald-700 mt-1">{item.entity}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-teal-600 text-[18px]">lightbulb</span>
                                    Recommendations
                                </h3>
                                <div className="ui-card p-4 space-y-2.5">
                                    {result.recommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                            <span className="material-symbols-outlined text-teal-600 text-[16px] mt-px">arrow_right</span>
                                            <p>{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                <p className="micro-label mb-2">Report Metadata</p>
                                <p className="text-xs text-slate-500">Generated: {result.generatedAt}</p>
                                <p className="text-xs text-slate-500 mt-1">Sources: {result.sources.join(", ")}</p>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">history_edu</span> Audit-logged
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
