"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchItems } from "@/lib/api/client";

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

function getStatusIcon(status: string): string {
    if (status === "QC Released") return "check_circle";
    if (status === "Processing") return "pending";
    return "pending";
}

function getStatusColor(status: string): string {
    if (status === "QC Released") return "text-secondary";
    if (status === "Processing") return "text-tertiary";
    return "text-outline";
}

export default function InboundIntakePage() {
    const router = useRouter();
    const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="font-display font-bold text-3xl text-primary">Inbound Intake</h2>
                    <p className="text-on-surface-variant mt-1">Raw material staging and pre-production status.</p>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => {
                            let csv = "sep=,\nBatch Reference,Material,Supplier,Quantity,Unit,Arrival Date,Hazard Class,Status\n";
                            receipts.forEach((r: any) => {
                                csv += `"${r.batch_reference}","${getMaterialName(r)}","${getSupplierCode(r)}","${r.quantity}","${r.unit}","${r.arrival_date}","${r.hazard_class}","${r.status}"\n`;
                            });
                            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `inbound_intake_${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="border border-primary text-primary font-bold uppercase text-[10px] tracking-widest py-3 px-6 rounded-sm hover:bg-surface-container-low transition-colors"
                    >
                        Export CSV
                    </button>
                    <button onClick={() => router.push("/inbound/new")} className="bg-primary text-on-primary font-bold uppercase text-[10px] tracking-widest py-3 px-6 rounded-sm hover:opacity-90 transition-opacity">New Intake</button>
                </div>
            </div>

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
                    <button className="p-1 bg-white shadow-sm text-primary"><span className="material-symbols-outlined">table_rows</span></button>
                    <button className="p-1 text-on-surface-variant"><span className="material-symbols-outlined">grid_view</span></button>
                </div>
            </div>

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
                                <span className="material-symbols-outlined animate-spin mr-2">sync</span>Loading from DaaS...
                            </td></tr>
                        ) : receipts.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">No inbound receipts found.</td></tr>
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
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${priority === 'High' ? 'bg-error-container text-on-error-container' : priority === 'Med' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-variant'}`}>{priority}</span>
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        <div className={`flex items-center gap-1 ${getStatusColor(row.status)}`}>
                                            <span className="material-symbols-outlined text-sm">{getStatusIcon(row.status)}</span>
                                            {row.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-1 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined">more_vert</span></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="bg-surface-container p-4 border-t border-outline-variant flex justify-between items-center text-xs text-on-surface-variant">
                    <span>Showing {receipts.length} entries from DaaS</span>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-secondary">cloud_done</span>
                        <span className="text-secondary font-bold">Live from DaaS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
