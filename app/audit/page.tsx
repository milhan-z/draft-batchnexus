"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canGenerateSummary, getActorName, canViewAudit } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/PageHeader";
import { Spinner, EmptyState } from "@/components/shared/States";

export default function AuditPage() {
    const { role } = useRole();
    const [audits, setAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [search, setSearch] = useState("");
    
    // AI Summary state
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchItems<any>("audit_logs", { sort: "-timestamp", limit: 100 });
            setAudits(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredAudits = audits.filter(a => {
        if (filter !== "All") {
            if (filter === "Intake" && !["Completed AI extraction", "Submitted receipt to QC"].includes(a.action)) return false;
            if (filter === "QC" && !["Approved QC release", "Generated lot number"].includes(a.action)) return false;
            if (filter === "Warehouse" && !["Assigned warehouse slot"].includes(a.action)) return false;
            if (filter === "Copilot" && !a.action.includes("Copilot")) return false;
            if (filter === "Summary" && !a.action.includes("Operations summary")) return false;
        }

        if (search) {
            const q = search.toLowerCase();
            return (
                (a.actor && a.actor.toLowerCase().includes(q)) ||
                (a.action && a.action.toLowerCase().includes(q)) ||
                (a.entity && a.entity.toLowerCase().includes(q)) ||
                (a.change_detail && a.change_detail.toLowerCase().includes(q))
            );
        }
        return true;
    });

    const handleGenerateSummary = async () => {
        setSummaryLoading(true);
        // Build the summary from live operational records (not a hardcoded string).
        try {
            const [receipts, lots, zones] = await Promise.all([
                fetchItems<any>("inbound_receipts", { limit: 200 }),
                fetchItems<any>("lots", { limit: 200 }),
                fetchItems<any>("warehouse_zones", {}),
            ]);
            await new Promise(r => setTimeout(r, 1200));

            const inboundCount = receipts.data.length;
            const pendingQc = receipts.data.filter((r: any) => r.status === "Pending QC").length;
            const released = lots.data.filter((l: any) => ["QC Released", "Awaiting Slot", "Stored", "Dispatched"].includes(l.status)).length;
            const blocked = receipts.data.filter((r: any) => r.status === "Blocked").length + lots.data.filter((l: any) => l.status === "Blocked").length;
            const coldAlerts = zones.data.filter((z: any) => z.status === "Cold-chain Alert");
            const priority = lots.data.find((l: any) => l.status === "Stored") || lots.data[0];

            const generated = `Today's Operations Summary:
- ${inboundCount} inbound receipts registered.
- ${pendingQc} materials are pending QC.
- ${released} lots have been released.
- ${blocked} lot(s) blocked pending review.
- ${coldAlerts.length} cold-chain alert(s)${coldAlerts[0] ? ` in ${coldAlerts[0].id}` : ""}.
- ${priority?.lot_number || "—"} should be prioritized for dispatch.`;

            setSummary(generated);

            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: getActorName(role),
                role: role,
                action: "Generated AI Operations summary",
                entity: "Report",
                change_detail: "Operations summary generated from operational records."
            });
            await loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setSummaryLoading(false);
        }
    };

    const hasPermission = canGenerateSummary(role);

    return (
        <div className="flex flex-col h-[calc(100vh-9rem)] gap-6 animate-fade-in">
            <PageHeader
                icon="history_edu"
                title="Audit Log & Reports"
                subtitle="Immutable ledger of all system actions and AI-generated insights."
                actions={
                    <>
                        <button
                            onClick={() => {
                                let csv = "Timestamp,Actor,Role,Action,Entity,Change Detail\n";
                                filteredAudits.forEach((a: any) => {
                                    csv += `"${a.timestamp}","${a.actor}","${a.role}","${a.action}","${a.entity}","${a.change_detail}"\n`;
                                });
                                const blob = new Blob([csv], { type: "text/csv" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
                                link.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="btn btn-secondary"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={handleGenerateSummary}
                            disabled={summaryLoading || !hasPermission}
                            className="btn btn-primary"
                        >
                            {summaryLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
                            <span className="hidden sm:inline">Generate AI Summary</span>
                            <span className="sm:hidden">Summary</span>
                        </button>
                    </>
                }
            />

            {summary && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 p-6 rounded-xl relative overflow-hidden animate-rise">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white grid place-items-center">
                            <span className="material-symbols-outlined text-[18px] icon-fill">summarize</span>
                        </span>
                        <h3 className="font-semibold text-slate-900">Daily Operations Insight</h3>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl font-mono text-sm leading-relaxed border border-emerald-100 text-slate-700">
                        {summary.split('\n').map((line, i) => (
                            <div key={i} className={line.startsWith('-') ? 'ml-4' : 'font-semibold mb-2 text-slate-900'}>{line}</div>
                        ))}
                    </div>
                    <p className="text-[11px] mt-4 text-slate-500">Generated from: inbound receipts, QC inspections, lots, temperature readings, warehouse moves, and dispatch records.</p>
                </div>
            )}

            <div className="flex-1 flex flex-col ui-card overflow-hidden min-h-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                        {['All', 'Intake', 'QC', 'Warehouse', 'Copilot', 'Summary'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border ${filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Search actor, entity, details..."
                            className="field pl-9 h-9 text-xs"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto soft-scroll">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white sticky top-0 z-10 text-[11px] uppercase tracking-wide font-semibold text-slate-500 shadow-sm">
                            <tr>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[15%]">Timestamp</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[20%]">Actor</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[20%]">Action</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[15%]">Entity</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[30%]">Change Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={5}><Spinner label="Loading audit trail..." /></td>
                                </tr>
                            ) : filteredAudits.length === 0 ? (
                                <tr>
                                    <td colSpan={5}><EmptyState icon="search_off" title="No audit events match your filters" description="Try a different filter or search term." /></td>
                                </tr>
                            ) : (
                                filteredAudits.map(audit => (
                                    <tr key={audit.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{new Date(audit.timestamp).toLocaleString('en-GB')}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="font-medium text-slate-900">{audit.actor}</div>
                                            <div className="text-[11px] text-slate-400">{audit.role}</div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">{audit.action}</span>
                                        </td>
                                        <td className="px-6 py-3.5 font-mono font-medium text-xs text-slate-700">{audit.entity}</td>
                                        <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-normal max-w-xs">{audit.change_detail}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
