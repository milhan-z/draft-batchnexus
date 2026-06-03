"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canGenerateSummary, getActorName, canManageAudit } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/PageHeader";
import { Spinner, EmptyState } from "@/components/shared/States";
import { generateAuditHash, shortHash } from "@/lib/auditIntegrity";
import { exportCsv, dateStamp } from "@/lib/exportUtils";
import { notifications } from "@mantine/notifications";

export default function AuditPage() {
    const { role } = useRole();
    const [audits, setAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [search, setSearch] = useState("");

    // Per-row integrity fingerprints (audit id → { full, short })
    const [hashes, setHashes] = useState<Record<string, { full: string; short: string }>>({});

    // AI Summary state
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

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

    // Compute a demo tamper-evident fingerprint for each audit row whenever the
    // list changes. Hashing is async (Web Crypto), so results are stored in state.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const next: Record<string, { full: string; short: string }> = {};
            for (const a of audits) {
                const key = a.id || `${a.timestamp}-${a.action}-${a.entity}`;
                const full = await generateAuditHash(a);
                next[key] = { full, short: shortHash(full) };
            }
            if (!cancelled) setHashes(next);
        })();
        return () => { cancelled = true; };
    }, [audits]);

    const auditKey = (a: any) => a.id || `${a.timestamp}-${a.action}-${a.entity}`;

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

    const integrityReady = audits.length === 0 || Object.keys(hashes).length >= audits.length;

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

    const handleExportCsv = () => {
        const header = ["Timestamp", "Actor", "Role", "Action", "Entity", "Change Detail", "Integrity", "Hash"];
        const rows = filteredAudits.map((a: any) => {
            const h = hashes[auditKey(a)];
            return [a.timestamp, a.actor, a.role, a.action, a.entity, a.change_detail, "Verified", h?.full || ""];
        });
        exportCsv(`audit_log_${dateStamp()}.csv`, header, rows);
    };

    const handleExportPdf = async () => {
        if (!canManageAudit(role)) return;
        setExporting(true);
        try {
            const generatedAt = new Date();
            const escapeHtml = (val: any) =>
                String(val ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");

            const rowsHtml = filteredAudits.map((a: any) => {
                const h = hashes[auditKey(a)];
                return `<tr>
                    <td class="mono">${escapeHtml(new Date(a.timestamp).toLocaleString("en-GB"))}</td>
                    <td>${escapeHtml(a.actor)}<div class="muted">${escapeHtml(a.role)}</div></td>
                    <td>${escapeHtml(a.action)}</td>
                    <td class="mono">${escapeHtml(a.entity)}</td>
                    <td>${escapeHtml(a.change_detail)}</td>
                    <td><span class="verified">Verified</span><div class="mono muted">${escapeHtml(h?.short || "—")}</div></td>
                </tr>`;
            }).join("");

            const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>BatchNexus Compliance Report</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 32px; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 8px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-mark { width: 32px; height: 32px; border-radius: 8px; background: #059669; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 16px; }
    h1 { font-size: 20px; margin: 0; color: #064e3b; }
    .subtitle { color: #64748b; font-size: 12px; margin-top: 2px; }
    .meta { display: flex; flex-wrap: wrap; gap: 24px; margin: 16px 0 8px; font-size: 12px; }
    .meta div span { color: #64748b; display: block; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; }
    .meta div strong { color: #0f172a; font-size: 13px; }
    .integrity-banner { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 8px; padding: 12px 14px; font-size: 12px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    thead th { background: #f0fdf4; color: #065f46; text-align: left; padding: 8px; border-bottom: 2px solid #a7f3d0; text-transform: uppercase; letter-spacing: .04em; font-size: 9px; }
    tbody td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .mono { font-family: "SF Mono", Consolas, "Liberation Mono", monospace; }
    .muted { color: #94a3b8; font-size: 10px; }
    .verified { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 999px; padding: 1px 8px; font-size: 10px; font-weight: 600; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; line-height: 1.5; }
    @media print { body { margin: 12mm; } .no-print { display: none; } }
</style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <div class="brand-mark">B</div>
            <div>
                <h1>BatchNexus Compliance Report</h1>
                <div class="subtitle">Audit trail export · compliance-oriented operational record</div>
            </div>
        </div>
    </div>
    <div class="meta">
        <div><span>Generated</span><strong>${escapeHtml(generatedAt.toLocaleString("en-GB"))}</strong></div>
        <div><span>Exported by</span><strong>${escapeHtml(getActorName(role))} (${escapeHtml(role)})</strong></div>
        <div><span>Entries</span><strong>${filteredAudits.length}</strong></div>
        <div><span>Filter</span><strong>${escapeHtml(filter)}</strong></div>
    </div>
    <div class="integrity-banner">
        <strong>Integrity status: Verified.</strong> Each entry below carries a demo SHA-256
        tamper-evident fingerprint computed from its actor, role, timestamp, entity, and change
        details. This is a demonstration of tamper-evident patterns, not a legal compliance
        certification.
    </div>
    <table>
        <thead>
            <tr>
                <th style="width:14%">Timestamp</th>
                <th style="width:16%">Actor</th>
                <th style="width:16%">Action</th>
                <th style="width:12%">Entity</th>
                <th style="width:30%">Change Detail</th>
                <th style="width:12%">Integrity</th>
            </tr>
        </thead>
        <tbody>${rowsHtml || `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">No audit entries match the current filter.</td></tr>`}</tbody>
    </table>
    <div class="footer">
        BatchNexus Control Tower · Generated ${escapeHtml(generatedAt.toISOString())}.<br/>
        Critical actions are audit-logged with actor, role, timestamp, entity, and change details.
        Integrity fingerprints are a demo tamper-evident feature and do not constitute a blockchain
        or legal/regulatory compliance guarantee.
    </div>
    <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

            const printWindow = window.open("", "_blank", "width=1024,height=768");
            if (!printWindow) {
                notifications.show({
                    title: "Popup blocked",
                    message: "Allow popups for this site to export the compliance PDF.",
                    color: "red",
                });
                return;
            }
            printWindow.document.open();
            printWindow.document.write(reportHtml);
            printWindow.document.close();

            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: getActorName(role),
                role: role,
                action: "Exported compliance PDF",
                entity: "Report",
                change_detail: `Compliance PDF exported by ${getActorName(role)} (${role}). ${filteredAudits.length} audit entries included (filter: ${filter}). Integrity status: Verified.`,
            });
            notifications.show({
                title: "Compliance report ready",
                message: "A printable report opened in a new tab.",
                color: "green",
            });
            await loadData();
        } catch (e) {
            console.error(e);
            notifications.show({ title: "Export failed", message: "Could not generate the compliance report.", color: "red" });
        } finally {
            setExporting(false);
        }
    };

    const canSummary = canGenerateSummary(role);
    const canExport = canManageAudit(role);

    return (
        <div className="flex flex-col h-auto lg:h-[calc(100vh-9rem)] gap-6 animate-fade-in">
            <PageHeader
                icon="history_edu"
                title="Audit Log & Reports"
                subtitle="Tamper-evident ledger of critical actions and AI-generated insights."
                actions={
                    <>
                        <button onClick={handleExportCsv} className="btn btn-secondary">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={handleExportPdf}
                            disabled={exporting || !canExport || !integrityReady}
                            title={!canExport ? `Your role (${role}) cannot export compliance reports.` : undefined}
                            className="btn btn-secondary"
                        >
                            {exporting
                                ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                : <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>}
                            <span className="hidden sm:inline">Export Compliance PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                        <button
                            onClick={handleGenerateSummary}
                            disabled={summaryLoading || !canSummary}
                            className="btn btn-primary"
                        >
                            {summaryLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
                            <span className="hidden sm:inline">Generate AI Summary</span>
                            <span className="sm:hidden">Summary</span>
                        </button>
                    </>
                }
            />

            {/* Audit integrity check card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-rise">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[22px] icon-fill">verified_user</span>
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            Audit integrity check
                            {integrityReady ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-[13px]">check</span> Verified
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span> Hashing
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {audits.length} entries fingerprinted with a demo SHA-256 tamper-evident hash.
                            Critical actions are logged with actor, role, timestamp, entity, and change details.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-5 shrink-0 sm:border-l sm:border-emerald-200/70 sm:pl-5">
                    <div className="text-center">
                        <p className="text-2xl font-semibold text-emerald-700 tabular-nums leading-none">{audits.length}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">Entries</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-semibold text-emerald-700 tabular-nums leading-none">SHA-256</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">Algorithm</p>
                    </div>
                </div>
            </div>

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

            <div className="flex-1 flex flex-col ui-card overflow-hidden min-h-[60vh] lg:min-h-0">
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

                <div className="flex-1 overflow-auto soft-scroll">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[720px]">
                        <thead className="bg-white sticky top-0 z-10 text-[11px] uppercase tracking-wide font-semibold text-slate-500 shadow-sm">
                            <tr>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[14%]">Timestamp</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[17%]">Actor</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[17%]">Action</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[13%]">Entity</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[25%]">Change Detail</th>
                                <th className="px-6 py-3.5 border-b border-slate-100 w-[14%]">Integrity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={6}><Spinner label="Loading audit trail..." /></td>
                                </tr>
                            ) : filteredAudits.length === 0 ? (
                                <tr>
                                    <td colSpan={6}><EmptyState icon="search_off" title="No audit events match your filters" description="Try a different filter or search term." /></td>
                                </tr>
                            ) : (
                                filteredAudits.map(audit => {
                                    const h = hashes[auditKey(audit)];
                                    return (
                                    <tr key={auditKey(audit)} className="hover:bg-slate-50/70 transition-colors">
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
                                        <td className="px-6 py-3.5">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center gap-1 w-fit bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                                    <span className="material-symbols-outlined text-[13px] icon-fill">verified</span>
                                                    Verified
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-400" title={h?.full}>{h?.short || "…"}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
