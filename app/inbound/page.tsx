"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface InboundReceipt {
    id: string;
    quantity: number;
    unit: string;
    arrival_date: string;
    batch_reference: string;
    temperature_requirement: string;
    hazard_class: string;
    status: string;
    supplier_id: { id: string; name: string; code: string } | string | null;
    material_id: { id: string; name: string; type: string; hazard_class: string } | string | null;
}

function getMaterialName(r: any): string {
    if (r.material_name) return r.material_name;
    if (typeof r.material_id === "object" && r.material_id) return r.material_id.name;
    if (typeof r.material_id === "string") return r.material_id;
    return "Unknown Material";
}

function getSupplierCode(r: any): string {
    if (r.supplier_name) return r.supplier_name;
    if (typeof r.supplier_id === "object" && r.supplier_id) return r.supplier_id.code || r.supplier_id.name;
    if (typeof r.supplier_id === "string") return r.supplier_id;
    return "—";
}

function getPriority(r: InboundReceipt): string {
    if (r.hazard_class === "Flammable") return "High";
    if (r.quantity > 100) return "Med";
    return "Low";
}

function getPriorityClass(priority: string): string {
    if (priority === "High") return "bg-error-container text-on-error-container";
    if (priority === "Med") return "bg-tertiary-container text-on-tertiary-container";
    return "bg-surface-variant text-on-surface-variant";
}

export default function InboundIntakePage() {
    const router = useRouter();
    const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        Promise.all([
            fetchItems<any>("inbound_receipts", { sort: "-arrival_date", limit: 25 }),
            fetchItems<any>("suppliers", {}),
            fetchItems<any>("materials", {})
        ]).then(([recRes, supRes, matRes]) => {
            const suppliers = new Map(supRes.data.map((s: any) => [s.id, s]));
            const materials = new Map(matRes.data.map((m: any) => [m.id, m]));
            
            const merged = recRes.data.map((r: any) => ({
                ...r,
                supplier_id: suppliers.get(r.supplier_id) || r.supplier_id,
                material_id: materials.get(r.material_id) || r.material_id,
            }));
            setReceipts(merged);
        }).catch(err => console.error("Failed to load inbound:", err))
        .finally(() => setLoading(false));
    }, []);

    // Close action menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleActionClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleViewInQC = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(null);
        router.push(`/qc?receipt=${id}`);
    };

    const handleViewDetail = (e: React.MouseEvent, row: any) => {
        e.stopPropagation();
        setOpenMenuId(null);
        router.push(`/lots`);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="font-display font-bold text-3xl text-primary">Inbound Intake</h2>
                    <p className="text-on-surface-variant mt-1">Raw material staging and pre-production status.</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => {
                        let csv = "Batch Ref,Material,Supplier,Quantity,Unit,Hazard,Temperature,Status\n";
                        receipts.forEach((r: any) => {
                            csv += `"${r.batch_reference}","${getMaterialName(r)}","${getSupplierCode(r)}",${r.quantity},"${r.unit}","${r.hazard_class}","${r.temperature_requirement}","${r.status}"\n`;
                        });
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `inbound_receipts_${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
                        URL.revokeObjectURL(url);
                    }} className="border border-primary text-primary font-bold uppercase text-[10px] tracking-widest py-3 px-6 rounded-sm hover:bg-surface-container-low transition-colors">Export CSV</button>
                    <button onClick={() => router.push("/inbound/new")} className="bg-primary text-on-primary font-bold uppercase text-[10px] tracking-widest py-3 px-6 rounded-sm hover:opacity-90 transition-opacity">New Intake</button>
                </div>
            </div>

            {/* Filters + View Toggle */}
            <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-6 items-center">
                    <div className="relative">
                        <label className="absolute -top-5 left-0 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Material Type</label>
                        <select className="bg-surface-container-low border-0 border-b-2 border-secondary py-2 pl-3 pr-8 text-sm focus:ring-0 focus:border-primary rounded-t-sm">
                            <option>All Materials</option>
                            <option>Essential Oils</option>
                        </select>
                    </div>
                    <div className="relative">
                        <label className="absolute -top-5 left-0 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</label>
                        <select className="bg-surface-container-low border-0 border-b-2 border-secondary py-2 pl-3 pr-8 text-sm focus:ring-0 focus:border-primary rounded-t-sm">
                            <option>All Statuses</option>
                            <option>Pending QC</option>
                            <option>QC Released</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center space-x-1 border border-outline-variant p-1 bg-surface-container-low rounded-sm">
                    <button
                        onClick={() => setViewMode("list")}
                        aria-pressed={viewMode === "list"}
                        aria-label="Table view"
                        className={`p-1.5 rounded-sm transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-primary"}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        aria-pressed={viewMode === "grid"}
                        aria-label="Grid view"
                        className={`p-1.5 rounded-sm transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-primary"}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    </button>
                </div>
            </div>

            {/* List View (Table) */}
            {viewMode === "list" && (
                <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-surface-container text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                            <tr>
                                <th className="px-6 py-4">Batch Ref.</th>
                                <th className="px-6 py-4">Material</th>
                                <th className="px-6 py-4">Quantity</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-outline-variant/30">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                                    <span className="material-symbols-outlined animate-spin mr-2">sync</span>Loading...
                                </td></tr>
                            ) : receipts.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">inbox</span>
                                    No inbound receipts found. Click "New Intake" to register a shipment.
                                </td></tr>
                            ) : receipts.map((row) => {
                                const priority = getPriority(row);
                                return (
                                    <tr key={row.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => router.push(`/qc?receipt=${row.id}`)}>
                                        <td className="px-6 py-4 font-bold text-primary">{row.batch_reference}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{getMaterialName(row)}</div>
                                            <div className="text-[10px] text-on-surface-variant">Supplier: {getSupplierCode(row)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono">{row.quantity} {row.unit}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${getPriorityClass(priority)}`}>{priority}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-6 py-4 text-center relative">
                                            <button
                                                onClick={(e) => handleActionClick(e, row.id)}
                                                className="p-1 hover:text-primary hover:bg-surface-container-high rounded transition-all"
                                                aria-label="Actions"
                                            >
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>
                                            {openMenuId === row.id && (
                                                <div ref={menuRef} className="absolute right-4 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-outline-variant z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                    <button
                                                        onClick={(e) => handleViewInQC(e, row.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-container-low transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-primary">biotech</span>
                                                        View in QC
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleViewDetail(e, row)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-container-low transition-colors border-t border-outline-variant/50"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">visibility</span>
                                                        View Detail
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="bg-surface-container p-4 border-t border-outline-variant flex justify-between items-center text-xs text-on-surface-variant">
                        <span>Showing {receipts.length} entries</span>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-secondary">cloud_done</span>
                            <span className="text-secondary font-bold">Live from DaaS</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid View (Cards) */}
            {viewMode === "grid" && (
                <div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                        </div>
                    ) : receipts.length === 0 ? (
                        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">inbox</span>
                            <p>No inbound receipts found. Click "New Intake" to register a shipment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {receipts.map((row) => {
                                const priority = getPriority(row);
                                return (
                                    <div
                                        key={row.id}
                                        className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative"
                                        onClick={() => router.push(`/qc?receipt=${row.id}`)}
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-mono text-xs font-bold text-primary">{row.batch_reference}</span>
                                            <StatusBadge status={row.status} />
                                        </div>

                                        {/* Material */}
                                        <h4 className="font-bold text-sm mb-1 line-clamp-1">{getMaterialName(row)}</h4>
                                        <p className="text-[10px] text-on-surface-variant mb-3">Supplier: {getSupplierCode(row)}</p>

                                        {/* Details */}
                                        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/50">
                                            <span className="font-mono text-xs">{row.quantity} {row.unit}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${getPriorityClass(priority)}`}>{priority}</span>
                                        </div>

                                        {/* Action button */}
                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={(e) => handleActionClick(e, row.id)}
                                                className="p-1 hover:text-primary hover:bg-surface-container-high rounded opacity-0 group-hover:opacity-100 transition-all"
                                                aria-label="Actions"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                            </button>
                                            {openMenuId === row.id && (
                                                <div ref={menuRef} className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-outline-variant z-50 overflow-hidden">
                                                    <button
                                                        onClick={(e) => handleViewInQC(e, row.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-container-low transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-primary">biotech</span>
                                                        View in QC
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleViewDetail(e, row)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-container-low transition-colors border-t border-outline-variant/50"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">visibility</span>
                                                        View Detail
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="mt-4 flex justify-between items-center text-xs text-on-surface-variant">
                        <span>Showing {receipts.length} entries</span>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-secondary">cloud_done</span>
                            <span className="text-secondary font-bold">Live from DaaS</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
