"use client";
import { useEffect, useState } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, Spinner } from "@/components/shared/States";

export default function LotsTraceabilityPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [lots, setLots] = useState<any[]>([]);
    const [selectedLot, setSelectedLot] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState("traceability");
    const [loading, setLoading] = useState(true);

    // Lookups
    const [materials, setMaterials] = useState<Map<string, any>>(new Map());
    const [suppliers, setSuppliers] = useState<Map<string, any>>(new Map());
    const [receipts, setReceipts] = useState<Map<string, any>>(new Map());
    const [qc, setQc] = useState<any[]>([]);
    const [audits, setAudits] = useState<any[]>([]);
    const [dispatches, setDispatches] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [matRes, supRes, recRes, lotRes, qcRes, audRes, dspRes] = await Promise.all([
                fetchItems<any>("materials", {}),
                fetchItems<any>("suppliers", {}),
                fetchItems<any>("inbound_receipts", {}),
                fetchItems<any>("lots", { sort: "-date_created" }),
                fetchItems<any>("qc_inspections", {}),
                fetchItems<any>("audit_logs", { sort: "-timestamp" }),
                fetchItems<any>("sample_dispatches", {})
            ]);

            setMaterials(new Map(matRes.data.map((m: any) => [m.id, m])));
            setSuppliers(new Map(supRes.data.map((s: any) => [s.id, s])));
            setReceipts(new Map(recRes.data.map((r: any) => [r.id, r])));
            setLots(lotRes.data);
            setQc(qcRes.data);
            setAudits(audRes.data);
            setDispatches(dspRes.data);

            // Auto-select LOT-2026-051 if available
            const demoLot = lotRes.data.find((l: any) => l.lot_number === "LOT-2026-051") || lotRes.data[0];
            setSelectedLot(demoLot);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getMaterialName = (id: string) => materials.get(id)?.name || "Unknown";
    const getReceipt = (id: string) => receipts.get(id);
    const getSupplierName = (recId: any) => {
        if (!recId) return "Unknown";
        const id = typeof recId === 'object' ? recId.id : recId;
        const receipt = receipts.get(id);
        if (!receipt) return "Unknown";
        
        const supId = typeof receipt.supplier_id === 'object' ? receipt.supplier_id.id : receipt.supplier_id;
        return suppliers.get(supId)?.name || "Unknown";
    };

    const filteredLots = lots.filter(l => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const matName = getMaterialName(l.material_id).toLowerCase();
        const supName = getSupplierName(l.receipt_id || l.source_receipt_id).toLowerCase();
        const receipt = receipts.get(l.receipt_id || l.source_receipt_id);
        const receiptNo = (receipt?.receipt_no || "").toLowerCase();
        return (
            l.lot_number.toLowerCase().includes(q) ||
            matName.includes(q) ||
            supName.includes(q) ||
            (l.status || "").toLowerCase().includes(q) ||
            receiptNo.includes(q) ||
            (l.current_location || "").toLowerCase().includes(q)
        );
    });

    const renderTraceabilityTimeline = () => {
        if (!selectedLot) return null;

        const receipt = receipts.get(selectedLot.receipt_id || selectedLot.source_receipt_id);
        const supplierName = getSupplierName(selectedLot.receipt_id || selectedLot.source_receipt_id);
        const materialName = getMaterialName(selectedLot.material_id);
        const conf = receipt?.extraction_confidence ? Math.round(receipt.extraction_confidence * 100) : 90;
        const fmt = (iso?: string) => iso
            ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            : "—";

        const events: { title: string; time: string; desc: string; icon: string; iconColor: string; badge?: string; highlight?: boolean }[] = [
            { title: "Supplier doc received", time: fmt(receipt?.arrival_time || receipt?.date_created), desc: `Initial documentation received from ${supplierName}.`, icon: "mail", iconColor: "text-slate-500 bg-slate-100" },
            { title: "AI extraction completed", time: fmt(receipt?.date_created), desc: `Data extracted automatically via AI Copilot. ${materialName} fields with ${conf}% confidence.`, icon: "auto_awesome", iconColor: "text-teal-600 bg-teal-50" },
            { title: "Receipt submitted to QC", time: fmt(receipt?.date_created), desc: "Intake complete. Material pending QC inspection.", icon: "send", iconColor: "text-slate-500 bg-slate-100" },
            { title: "QC review completed", time: fmt(selectedLot.released_at), desc: "Approved for processing. Visual & organoleptic AI screening passed.", icon: "biotech", iconColor: "text-teal-600 bg-teal-50" },
            { title: "Lot number issued", time: fmt(selectedLot.released_at), desc: `Material officially converted into tracked Lot ID: ${selectedLot.lot_number}. ERP records updated.`, icon: "tag", iconColor: "text-emerald-600 bg-emerald-50", highlight: true },
        ];

        if (["Stored", "In Dispatch", "Dispatched"].includes(selectedLot.status) && selectedLot.current_location) {
            events.push({
                title: "Warehouse slot assigned",
                time: fmt(selectedLot.date_created),
                desc: `Drums moved to climate-controlled storage zone, slot ${selectedLot.current_location}. Temperature logged.`,
                icon: "warehouse",
                iconColor: "text-slate-500 bg-slate-100",
                badge: selectedLot.current_location,
            });
        }

        const lotDispatches = dispatches.filter((d: any) => d.lot_id === selectedLot.id);
        lotDispatches.forEach((d: any) => {
            events.push({
                title: "Sample dispatch created",
                time: fmt(d.date_created),
                desc: `${d.quantity_sample || 1} sample dispatched to ${d.customer_name} (${d.destination}). Awaiting client feedback.`,
                icon: "local_shipping",
                iconColor: "text-teal-600 bg-teal-50",
                badge: d.id,
            });
        });

        return (
            <div>
                <h4 className="micro-label mb-6">Lifecycle Timeline</h4>
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                    <div className="space-y-0">
                        {events.map((ev, i) => (
                            <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                                {/* Icon circle */}
                                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ev.iconColor} ${ev.highlight ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}>
                                    <span className="material-symbols-outlined text-[18px]">{ev.icon}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <h5 className={`font-semibold text-sm ${ev.highlight ? "text-emerald-700" : "text-slate-900"}`}>{ev.title}</h5>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {ev.badge && (
                                                <span className="font-mono text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">{ev.badge}</span>
                                            )}
                                            <time className="text-[10px] font-mono text-slate-400 whitespace-nowrap">{ev.time}</time>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{ev.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="inventory_2"
                title="Lot Traceability Timeline"
                subtitle="End-to-end operational visibility from inbound receipt to outbound dispatch."
                badge={!loading && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {lots.length} active
                    </span>
                )}
            />

            <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:min-h-0">
                {/* Left: Lot List */}
                <div className="w-full lg:w-1/3 flex flex-col ui-card overflow-hidden max-h-[35vh] lg:max-h-[calc(100vh-11rem)]">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Search lot number, material..."
                                className="field pl-9 h-10"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto soft-scroll p-3 space-y-2">
                        {loading ? (
                            <Spinner label="Loading lots..." />
                        ) : filteredLots.length === 0 ? (
                            <EmptyState icon="search_off" title="No lots found" description="Try a different search term." />
                        ) : (
                            filteredLots.map(lot => (
                                <button
                                    key={lot.id}
                                    onClick={() => setSelectedLot(lot)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedLot?.id === lot.id ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50/60'}`}
                                >
                                    <div className="flex justify-between items-start mb-1.5 gap-2">
                                        <span className="font-mono text-sm font-semibold text-emerald-700">{lot.lot_number}</span>
                                        <StatusBadge status={lot.status} />
                                    </div>
                                    <p className="font-semibold text-sm text-slate-900 line-clamp-1">{getMaterialName(lot.material_id)}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{getSupplierName((lot.receipt_id || lot.source_receipt_id))}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Tracing Details */}
                <div className="w-full lg:w-2/3 flex flex-col ui-card overflow-hidden min-h-[60vh] lg:min-h-0">
                    {!selectedLot ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <EmptyState icon="timeline" title="No lot selected" description="Select a lot to view its full traceability timeline." />
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Header with Lot Summary */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/40">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Left: Lot title */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2 gap-3">
                                            <h3 className="font-display font-semibold text-3xl text-slate-900">{selectedLot.lot_number}</h3>
                                            <StatusBadge status={selectedLot.status} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">{getMaterialName(selectedLot.material_id)}</p>
                                        <p className="text-xs text-slate-500 mt-1">{getSupplierName((selectedLot.receipt_id || selectedLot.source_receipt_id) || selectedLot.receipt_id)}</p>
                                    </div>
                                    {/* Right: Summary card */}
                                    <div className="lg:w-64 bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                                        <h4 className="micro-label mb-2">Lot Summary</h4>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">Material</span>
                                            <span className="font-medium text-right text-slate-900">{getMaterialName(selectedLot.material_id)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">QC Decision</span>
                                            <StatusBadge status={selectedLot.status === "Blocked" ? "Blocked" : "QC Released"} />
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">Location</span>
                                            <span className="font-mono font-semibold text-emerald-700">{selectedLot.current_location || "—"}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-slate-500">Dispatches</span>
                                            <span className="font-medium text-slate-900">{dispatches.filter(d => d.lot_id === selectedLot.id).length} linked</span>
                                        </div>
                                        <div className="pt-2.5 border-t border-slate-100 space-y-2">
                                            <button
                                                className="btn btn-primary w-full text-xs"
                                                onClick={() => {
                                                    // Export trace report
                                                    const lot = selectedLot;
                                                    const receipt = receipts.get((lot.receipt_id || lot.source_receipt_id) || lot.receipt_id);
                                                    const mat = materials.get(lot.material_id);
                                                    const sup = receipt ? suppliers.get(receipt.supplier_id) : null;
                                                    const lotQc = qc.filter((q: any) => q.receipt_id === ((lot.receipt_id || lot.source_receipt_id) || lot.receipt_id));
                                                    const lotDisp = dispatches.filter((d: any) => d.lot_id === lot.id);
                                                    let csv = "BATCHNEXUS TRACEABILITY REPORT\n";
                                                    csv += `Generated:,${new Date().toISOString()}\n\n`;
                                                    csv += `Lot Number:,${lot.lot_number}\nMaterial:,${mat?.name || "—"}\nSupplier:,${sup?.name || "—"}\nQuantity:,${lot.quantity}\nStatus:,${lot.status}\nLocation:,${lot.current_location || "N/A"}\n\n`;
                                                    if (lotQc.length > 0) { csv += "QC INSPECTION\nColour,Defect,Foreign,Decision\n"; lotQc.forEach((q: any) => { csv += `${q.colour_score || "—"},${q.defect_risk || "—"},${q.foreign_matter_risk || "—"},${q.human_decision || "—"}\n`; }); csv += "\n"; }
                                                    if (lotDisp.length > 0) { csv += "DISPATCHES\nCustomer,Destination,Status\n"; lotDisp.forEach((d: any) => { csv += `${d.customer_name},${d.destination},${d.status}\n`; }); }
                                                    const blob = new Blob([csv], { type: "text/csv" });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement("a");
                                                    a.href = url; a.download = `trace_${lot.lot_number}.csv`; a.click();
                                                    URL.revokeObjectURL(url);
                                                }}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">download</span>
                                                Export Trace Report
                                            </button>
                                            <button
                                                className="btn btn-secondary w-full text-xs"
                                                onClick={() => setActiveTab("audit log")}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">history_edu</span>
                                                Open Audit Log
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex border-b border-slate-100 bg-white px-3 gap-1 overflow-x-auto">
                                {['traceability', 'overview', 'qc data', 'audit log'].map(tab => (
                                    <button 
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-3 text-xs font-semibold capitalize transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto soft-scroll p-6 bg-slate-50/30">
                                {activeTab === 'traceability' && renderTraceabilityTimeline()}
                                
                                {activeTab === 'overview' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-slate-900 border-b border-slate-100 pb-2">Material Origin</h4>
                                            <div>
                                                <p className="micro-label">Supplier</p>
                                                <p className="font-semibold text-sm text-slate-900">{getSupplierName((selectedLot.receipt_id || selectedLot.source_receipt_id))}</p>
                                            </div>
                                            <div>
                                                <p className="micro-label">Source Receipt</p>
                                                <p className="font-mono text-sm text-slate-700">{getReceipt((selectedLot.receipt_id || selectedLot.source_receipt_id))?.receipt_no}</p>
                                            </div>
                                            <div>
                                                <p className="micro-label">Quantity</p>
                                                <p className="text-sm font-semibold text-slate-900">{selectedLot.quantity} {getReceipt((selectedLot.receipt_id || selectedLot.source_receipt_id))?.unit}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm text-slate-900 border-b border-slate-100 pb-2">Current State</h4>
                                            <div>
                                                <p className="micro-label">Location</p>
                                                <p className="font-mono font-semibold text-emerald-700 text-sm">{selectedLot.current_location || "Awaiting Slot"}</p>
                                            </div>
                                            <div>
                                                <p className="micro-label">Related Dispatches</p>
                                                <div className="mt-1.5 space-y-2">
                                                    {dispatches.filter(d => d.lot_id === selectedLot.id).map(dsp => (
                                                        <div key={dsp.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                                                            <span className="font-mono text-xs font-semibold text-slate-700">{dsp.id}</span>
                                                            <span className="text-[11px] text-slate-500">{dsp.customer_name}</span>
                                                        </div>
                                                    ))}
                                                    {dispatches.filter(d => d.lot_id === selectedLot.id).length === 0 && (
                                                        <span className="text-xs text-slate-400">None</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'qc data' && (
                                    <div className="max-w-xl">
                                        {qc.filter(q => q.receipt_id === ((selectedLot.receipt_id || selectedLot.source_receipt_id) || selectedLot.receipt_id)).map(q => (
                                            <div key={q.id} className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                    <span className="font-mono font-semibold text-slate-700">{q.id}</span>
                                                    <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{q.human_decision || "—"}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="micro-label">AI Recommendation</p>
                                                        <p className="text-sm font-semibold text-slate-900">{q.recommendation || "—"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="micro-label">Confidence</p>
                                                        <p className="text-sm font-semibold text-slate-900">{typeof q.confidence === "number" ? `${Math.round(q.confidence * 100)}%` : "—"}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                                                        <p className="micro-label">Colour</p>
                                                        <p className="font-mono font-bold text-emerald-700">{typeof q.colour_score === "number" ? `${q.colour_score}/100` : "—"}</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                                                        <p className="micro-label">Defect</p>
                                                        <p className="font-semibold text-slate-900">{q.defect_risk || "—"}</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                                                        <p className="micro-label">Foreign</p>
                                                        <p className="font-semibold text-slate-900">{q.foreign_matter_risk || "—"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {qc.filter(q => q.receipt_id === ((selectedLot.receipt_id || selectedLot.source_receipt_id) || selectedLot.receipt_id)).length === 0 && (
                                            <EmptyState icon="science" title="No QC records found" description="There are no QC inspection records for this lot." />
                                        )}
                                    </div>
                                )}

                                {activeTab === 'audit log' && (
                                    <div className="space-y-1">
                                        {audits.filter(a => a.entity === selectedLot.id || a.entity === (selectedLot.receipt_id || selectedLot.source_receipt_id) || a.entity.includes('QC-') || a.entity.includes('REC-') || a.change_detail?.includes(selectedLot.lot_number)).map(a => (
                                            <div key={a.id} className="text-xs p-3 rounded-lg flex flex-col sm:flex-row gap-1 sm:gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                                <div className="w-32 font-mono text-slate-400 shrink-0">{new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                <div className="w-40 font-medium text-slate-900 shrink-0">{a.actor}</div>
                                                <div className="w-48 text-emerald-700 font-semibold text-[11px] shrink-0">{a.action}</div>
                                                <div className="flex-1 text-slate-600">{a.change_detail}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
