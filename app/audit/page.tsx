"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canGenerateSummary } from "@/lib/rbac";

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
        try {
            // Send the most recent 15 logs to avoid context limit
            const recentLogs = filteredAudits.slice(0, 15).map(a => ({
                time: a.timestamp,
                actor: a.actor,
                action: a.action,
                detail: a.change_detail
            }));

            const res = await fetch("/api/ai/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logs: recentLogs })
            });
            const data = await res.json();
            
            if (data.text) {
                setSummary(data.text);
            } else {
                setSummary("Failed to generate summary.");
            }
        } catch (err) {
            console.error(err);
            setSummary("Error connecting to AI service.");
        }
        
        try {
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: "Current User",
                role: role,
                action: "Generated AI Operations summary",
                entity: "Report",
                change_detail: "Operations summary generated."
            });
            await loadData();
        } catch (e) {}
        
        setSummaryLoading(false);
    };

    const hasPermission = canGenerateSummary(role);

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="font-display font-bold text-3xl text-primary">Audit Log & Reports</h2>
                    <p className="text-on-surface-variant mt-1">Immutable ledger of all system actions and AI-generated insights.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            let csv = "sep=,\nTimestamp,Actor,Role,Action,Entity,Change Detail\n";
                            filteredAudits.forEach((a: any) => {
                                csv += `"${a.timestamp}","${a.actor}","${a.role}","${a.action}","${a.entity}","${a.change_detail}"\n`;
                            });
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="font-bold py-2.5 px-5 rounded-sm text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm border border-outline-variant bg-white text-on-surface hover:border-primary hover:text-primary"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Export CSV
                    </button>
                    <button 
                        onClick={handleGenerateSummary}
                        disabled={summaryLoading || !hasPermission}
                        className={`font-bold py-2.5 px-5 rounded-sm text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm
                            ${hasPermission ? 'bg-secondary text-on-secondary hover:opacity-90' : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                    >
                        {summaryLoading ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">auto_awesome</span>}
                        Generate AI Summary
                    </button>
                </div>
            </div>

            {summary && (
                <div className="bg-primary-container text-on-primary-container p-6 rounded-xl border border-primary/20 shadow-sm relative animate-in fade-in slide-in-from-top-4 duration-500 shrink-0">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">summarize</span>
                        <h3 className="font-bold">Daily Operations Insight</h3>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg font-mono text-sm leading-relaxed border border-primary/10 max-h-[250px] overflow-y-auto">
                        {summary.split('\n').map((line, i) => {
                            let formattedLine = line;
                            formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>');
                            
                            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                                return (
                                    <div key={i} className="ml-4 flex gap-2 mb-2">
                                        <span className="text-primary">•</span> 
                                        <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s/, '') }} />
                                    </div>
                                );
                            }
                            if (line.trim() === '') return <div key={i} className="h-2"></div>;
                            return <div key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                        })}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest mt-4 opacity-70">Generated from: inbound receipts, QC inspections, lots, temperature readings, warehouse moves, and dispatch records.</p>
                </div>
            )}

            <div className="flex-1 flex flex-col bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden min-h-0">
                <div className="p-4 border-b border-outline-variant bg-surface-container flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                        {['All', 'Intake', 'QC', 'Warehouse', 'Copilot', 'Summary'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${filter === f ? 'bg-primary text-on-primary border-primary' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                        <input 
                            type="text" 
                            placeholder="Search actor, entity, details..." 
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-outline-variant rounded-md text-xs focus:border-primary focus:ring-1"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-container-lowest sticky top-0 z-10 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-bold border-b border-outline-variant w-[15%]">Timestamp</th>
                                <th className="px-6 py-4 font-bold border-b border-outline-variant w-[20%]">Actor</th>
                                <th className="px-6 py-4 font-bold border-b border-outline-variant w-[20%]">Action</th>
                                <th className="px-6 py-4 font-bold border-b border-outline-variant w-[15%]">Entity</th>
                                <th className="px-6 py-4 font-bold border-b border-outline-variant w-[30%]">Change Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-primary">sync</span></td>
                                </tr>
                            ) : filteredAudits.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-on-surface-variant opacity-70">No audit events match your filters.</td>
                                </tr>
                            ) : (
                                filteredAudits.map(audit => (
                                    <tr key={audit.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-6 py-4 text-xs font-mono opacity-80">{new Date(audit.timestamp).toLocaleString('en-GB')}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-on-surface">{audit.actor}</div>
                                            <div className="text-[10px] uppercase tracking-widest opacity-70">{audit.role}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">{audit.action}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-xs">{audit.entity}</td>
                                        <td className="px-6 py-4 text-xs whitespace-normal max-w-xs">{audit.change_detail}</td>
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
