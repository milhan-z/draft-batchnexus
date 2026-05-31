"use client";
import { useEffect, useState } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";

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

    const filteredLots = lots.filter(l => 
        l.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getMaterialName(l.material_id).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderTraceabilityTimeline = () => {
        if (!selectedLot) return null;
        
        // For hackathon deterministic timeline
        const events = [
            { title: "Supplier document received", time: "28 May 2026, 09:05 WIB", actor: "Dimas Pratama", role: "Receiving Operator", desc: "Received manifest from Java Citrus Farm.", icon: "mail" },
            { title: "AI extraction completed", time: "28 May 2026, 09:10 WIB", actor: "Dimas Pratama", role: "Receiving Operator", desc: "Extracted fields with 91% confidence.", icon: "auto_awesome" },
            { title: "Receipt submitted to QC", time: "28 May 2026, 09:18 WIB", actor: "Dimas Pratama", role: "Receiving Operator", desc: "Status changed to Pending QC.", icon: "send" },
            { title: "QC review completed", time: "28 May 2026, 10:42 WIB", actor: "Rani Wulandari", role: "QC Staff", desc: "Approved release based on visual & organoleptic AI.", icon: "biotech" },
            { title: "Lot number issued", time: "28 May 2026, 10:45 WIB", actor: "System", role: "BatchNexus", desc: `Lot ${selectedLot.lot_number} generated.`, icon: "tag" },
        ];

        // If stored
        if (selectedLot.status === "Stored" || selectedLot.status === "In Dispatch" || selectedLot.status === "Dispatched") {
            events.push({ title: "Warehouse slot assigned", time: "28 May 2026, 11:05 WIB", actor: "Andi Saputra", role: "Warehouse Admin", desc: `Assigned to ${selectedLot.current_location}.`, icon: "warehouse" });
        }

        return (
            <div className="relative pl-6 space-y-8 py-4 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
                {events.map((ev, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary-container text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <span className="material-symbols-outlined text-[18px]">{ev.icon}</span>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-sm text-on-surface">{ev.title}</h4>
                                <time className="text-[10px] font-mono text-on-surface-variant font-bold">{ev.time}</time>
                            </div>
                            <p className="text-xs text-on-surface-variant mb-3">{ev.desc}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-secondary-container text-secondary flex items-center justify-center text-[10px] font-bold">
                                    {ev.actor.charAt(0)}
                                </div>
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">{ev.actor} • {ev.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div>
                <h2 className="font-display font-bold text-3xl text-primary">Lot Traceability Timeline</h2>
                <p className="text-on-surface-variant mt-1">End-to-end operational visibility from inbound receipt to outbound dispatch.</p>
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left: Lot List */}
                <div className="w-1/3 flex flex-col bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden">
                    <div className="p-4 border-b border-outline-variant bg-surface-container sticky top-0 z-10">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                            <input 
                                type="text" 
                                placeholder="Search lot number..." 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-outline-variant rounded-md text-sm focus:border-primary focus:ring-1"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                        ) : filteredLots.length === 0 ? (
                            <div className="text-center p-8 text-on-surface-variant opacity-70">
                                <p className="text-xs">No lots found.</p>
                            </div>
                        ) : (
                            filteredLots.map(lot => (
                                <button
                                    key={lot.id}
                                    onClick={() => setSelectedLot(lot)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedLot?.id === lot.id ? 'bg-primary-container border-primary shadow-sm' : 'bg-white border-outline-variant hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-sm font-bold text-primary">{lot.lot_number}</span>
                                        <StatusBadge status={lot.status} />
                                    </div>
                                    <p className="font-bold text-sm line-clamp-1">{getMaterialName(lot.material_id)}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{getSupplierName(lot.receipt_id || lot.source_receipt_id)}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Tracing Details */}
                <div className="w-2/3 flex flex-col bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    {!selectedLot ? (
                        <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-50">
                            <span className="material-symbols-outlined text-6xl mb-4">timeline</span>
                            <p>Select a lot to view full traceability.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-outline-variant flex justify-between items-start bg-surface-container-lowest">
                                <div>
                                    <h3 className="font-display font-bold text-3xl text-primary">{selectedLot.lot_number}</h3>
                                    <p className="text-sm font-bold mt-1 text-on-surface">{getMaterialName(selectedLot.material_id)}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <StatusBadge status={selectedLot.status} />
                                    <button 
                                        className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 hover:underline mt-2"
                                        onClick={() => {
                                            // Generate real CSV export
                                            const lot = selectedLot;
                                            const receipt = receipts.get(lot.source_receipt_id);
                                            const mat = materials.get(lot.material_id);
                                            const sup = receipt ? suppliers.get(receipt.supplier_id) : null;
                                            const lotQc = qc.filter((q: any) => q.receipt_id === (lot.receipt_id || lot.source_receipt_id));
                                            const lotDisp = dispatches.filter((d: any) => d.lot_id === lot.id);
                                            const lotAudits = audits.filter((a: any) =>
                                                a.entity === lot.id || a.entity === (lot.receipt_id || lot.source_receipt_id) ||
                                                (a.change_detail && a.change_detail.includes(lot.lot_number))
                                            );

                                            let csv = "BATCHNEXUS TRACEABILITY REPORT\n";
                                            csv += `Generated:,${new Date().toISOString()}\n\n`;
                                            csv += "LOT INFORMATION\n";
                                            csv += `Lot Number:,${lot.lot_number}\n`;
                                            csv += `Material:,${mat?.name || getMaterialName(lot.material_id)}\n`;
                                            csv += `Supplier:,${sup?.name || getSupplierName(lot.receipt_id || lot.source_receipt_id)}\n`;
                                            csv += `Quantity:,${lot.quantity}\n`;
                                            csv += `Status:,${lot.status}\n`;
                                            csv += `Location:,${lot.current_location || "N/A"}\n`;
                                            csv += `Created:,${lot.date_created}\n\n`;

                                            if (receipt) {
                                                csv += "SOURCE RECEIPT\n";
                                                csv += `Receipt No:,${receipt.receipt_no}\n`;
                                                csv += `Batch Ref:,${receipt.batch_reference}\n`;
                                                csv += `Hazard:,${receipt.hazard_class}\n`;
                                                csv += `Temperature:,${receipt.temperature_requirement}\n\n`;
                                            }

                                            if (lotQc.length > 0) {
                                                csv += "QC INSPECTION\n";
                                                csv += "ID,Colour Score,Defect Risk,Foreign Matter,Decision,Confidence\n";
                                                lotQc.forEach((q: any) => {
                                                    csv += `${q.id},${q.colour_score},${q.defect_risk},${q.foreign_matter_risk},${q.human_decision},${q.confidence}\n`;
                                                });
                                                csv += "\n";
                                            }

                                            if (lotDisp.length > 0) {
                                                csv += "DISPATCHES\n";
                                                csv += "ID,Customer,Destination,Status,Quantity\n";
                                                lotDisp.forEach((d: any) => {
                                                    csv += `${d.id},${d.customer_name},${d.destination},${d.status},${d.quantity_sample}\n`;
                                                });
                                                csv += "\n";
                                            }

                                            if (lotAudits.length > 0) {
                                                csv += "AUDIT TRAIL\n";
                                                csv += "Timestamp,Actor,Role,Action,Detail\n";
                                                lotAudits.forEach((a: any) => {
                                                    csv += `${a.timestamp},${a.actor},${a.role},${a.action},"${a.change_detail}"\n`;
                                                });
                                            }

                                            const blob = new Blob([csv], { type: "text/csv" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `traceability_${lot.lot_number}.csv`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">download</span> Export Trace Report
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex border-b border-outline-variant bg-surface-container-low px-2">
                                {['traceability', 'overview', 'qc data', 'audit log'].map(tab => (
                                    <button 
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-primary bg-white' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
                                {activeTab === 'traceability' && renderTraceabilityTimeline()}
                                
                                {activeTab === 'overview' && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-sm border-b pb-2">Material Origin</h4>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70">Supplier</p>
                                                <p className="font-bold text-sm">{getSupplierName(selectedLot.receipt_id || selectedLot.source_receipt_id)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70">Source Receipt</p>
                                                <p className="font-mono text-sm">{getReceipt(selectedLot.source_receipt_id)?.receipt_no}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70">Quantity</p>
                                                <p className="text-sm font-bold">{selectedLot.quantity} {getReceipt(selectedLot.source_receipt_id)?.unit}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-sm border-b pb-2">Current State</h4>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70">Location</p>
                                                <p className="font-mono font-bold text-primary text-sm">{selectedLot.current_location || "Awaiting Slot"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70">Related Dispatches</p>
                                                <div className="mt-1 space-y-2">
                                                    {dispatches.filter(d => d.lot_id === selectedLot.id).map(dsp => (
                                                        <div key={dsp.id} className="bg-surface-container-low p-2 rounded border border-outline-variant flex justify-between items-center">
                                                            <span className="font-mono text-xs font-bold">{dsp.id}</span>
                                                            <span className="text-[10px] uppercase tracking-widest">{dsp.customer_name}</span>
                                                        </div>
                                                    ))}
                                                    {dispatches.filter(d => d.lot_id === selectedLot.id).length === 0 && (
                                                        <span className="text-xs opacity-50">None</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'qc data' && (
                                    <div className="max-w-xl">
                                        {qc.filter(q => q.receipt_id === selectedLot.source_receipt_id).map(q => (
                                            <div key={q.id} className="bg-surface-container-low border border-outline-variant p-5 rounded-xl space-y-4">
                                                <div className="flex justify-between items-center border-b pb-3">
                                                    <span className="font-mono font-bold">{q.id}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-primary-container text-primary px-2 py-1 rounded">{q.human_decision}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold opacity-70">AI Recommendation</p>
                                                        <p className="text-sm font-bold">{q.recommendation}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold opacity-70">Confidence</p>
                                                        <p className="text-sm font-bold">{q.confidence * 100}%</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-white p-2 rounded text-center">
                                                        <p className="text-[10px] uppercase font-bold opacity-70">Colour</p>
                                                        <p className="font-mono font-bold text-primary">{q.colour_score}/100</p>
                                                    </div>
                                                    <div className="bg-white p-2 rounded text-center">
                                                        <p className="text-[10px] uppercase font-bold opacity-70">Defect</p>
                                                        <p className="font-bold">{q.defect_risk}</p>
                                                    </div>
                                                    <div className="bg-white p-2 rounded text-center">
                                                        <p className="text-[10px] uppercase font-bold opacity-70">Foreign</p>
                                                        <p className="font-bold">{q.foreign_matter_risk}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {qc.filter(q => q.receipt_id === selectedLot.source_receipt_id).length === 0 && (
                                            <p className="text-sm text-on-surface-variant opacity-70">No QC records found.</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'audit log' && (
                                    <div className="space-y-2">
                                        {audits.filter(a => a.entity === selectedLot.id || a.entity === selectedLot.source_receipt_id || a.entity.includes('QC-') || a.entity.includes('REC-') || a.change_detail?.includes(selectedLot.lot_number)).map(a => (
                                            <div key={a.id} className="text-xs p-3 border-b flex gap-4 hover:bg-surface-container-low transition-colors rounded">
                                                <div className="w-32 font-mono opacity-70 shrink-0">{new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                <div className="w-40 font-bold shrink-0">{a.actor}</div>
                                                <div className="w-48 text-primary font-bold uppercase tracking-widest text-[10px] mt-0.5 shrink-0">{a.action}</div>
                                                <div className="flex-1 opacity-80">{a.change_detail}</div>
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
