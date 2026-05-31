"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { fetchItems } from "@/lib/api/client";

export const Sidebar = () => {
    const pathname = usePathname();
    const [showReport, setShowReport] = useState(false);
    const [reportText, setReportText] = useState("");
    const [reportLoading, setReportLoading] = useState(false);

    const navItems = [
        { path: "/", label: "Dashboard", icon: "dashboard" },
        { path: "/inbound", label: "Inbound Intake", icon: "move_to_inbox" },
        { path: "/qc", label: "QC Station", icon: "biotech" },
        { path: "/ppic", label: "PPIC Board", icon: "view_kanban" },
        { path: "/lots", label: "Lots", icon: "inventory_2" },
        { path: "/warehouse", label: "Warehouse", icon: "warehouse" },
        { path: "/dispatch", label: "Dispatch", icon: "send" },
        { path: "/copilot", label: "Copilot", icon: "smart_toy" },
        { path: "/audit", label: "Audit Log", icon: "history_edu" },
    ];

    const isActive = (path: string) => pathname === path;

    const handleGenerateReport = async () => {
        setShowReport(true);
        setReportLoading(true);
        setReportText("");
        try {
            const logsRes = await fetchItems<any>("audit_logs", { sort: "-timestamp", limit: 15 });
            const recentLogs = logsRes.data.map(a => ({
                time: a.timestamp,
                actor: a.actor,
                action: a.action,
                detail: a.change_detail
            }));

            const res = await fetch("/api/ai/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logs: recentLogs }),
            });
            const data = await res.json();
            setReportText(data.text || "No summary available.");
        } catch {
            setReportText("Failed to generate report. Please try again.");
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <>
            <nav className="fixed left-0 top-0 h-screen flex flex-col py-6 w-64 z-40 bg-surface-container-low border-r border-outline-variant hidden md:flex">
                <div className="px-6 mb-10">
                    <h1 className="font-display font-bold text-2xl text-secondary">Sima Arôme</h1>
                    <p className="text-sm text-on-surface-variant mt-1">BatchNexus Control</p>
                </div>
                <ul className="flex-1 flex flex-col space-y-1">
                    {navItems.map(item => (
                        <li key={item.path}>
                            <Link 
                                href={item.path}
                                className={`flex items-center px-6 py-3 transition-all duration-200 ${
                                    isActive(item.path) 
                                    ? "text-primary font-bold border-r-4 border-primary bg-surface-container-high translate-x-1" 
                                    : "text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container translate-x-1"
                                }`}
                            >
                                <span className={`material-symbols-outlined mr-4 ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
                                <span className="text-lg">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="px-6 mt-auto pt-6 border-t border-outline-variant">
                    <button 
                        onClick={handleGenerateReport}
                        className="w-full bg-primary text-on-primary font-bold uppercase tracking-wider text-xs py-3 px-4 rounded-sm hover:opacity-90 transition-opacity mb-6"
                    >
                        Generate Report
                    </button>
                </div>
            </nav>

            {/* Generate Report Modal */}
            {showReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowReport(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary icon-fill">summarize</span>
                                <div>
                                    <h3 className="font-bold text-on-surface">AI Daily Report</h3>
                                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Powered by Groq Llama 3</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReport(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {reportLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                                    <p className="text-sm text-on-surface-variant font-bold uppercase tracking-widest">AI is analyzing operations...</p>
                                </div>
                            ) : (
                                <div className="text-sm text-on-surface leading-relaxed font-sans space-y-2">
                                    {reportText.split('\n').map((line, i) => {
                                        let formattedLine = line;
                                        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>');
                                        
                                        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                                            return (
                                                <div key={i} className="ml-4 flex gap-2 mb-1">
                                                    <span className="text-primary">•</span> 
                                                    <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s/, '') }} />
                                                </div>
                                            );
                                        }
                                        if (line.trim() === '') return <div key={i} className="h-1"></div>;
                                        return <div key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-3 border-t border-outline-variant bg-surface-container-low flex justify-end">
                            <button onClick={() => setShowReport(false)} className="bg-primary text-on-primary text-xs font-bold uppercase tracking-wider px-6 py-2 rounded-sm hover:opacity-90 transition-opacity">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
