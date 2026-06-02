"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { fetchItems } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, SkeletonRows } from "@/components/shared/States";

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
    if (priority === "High") return "bg-rose-50 text-rose-700 border-rose-200";
    if (priority === "Med") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function InboundIntakePage() {
    const router = useRouter();
    const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [materialFilter, setMaterialFilter] = useState("All Materials");
    const [statusFilter, setStatusFilter] = useState("All Statuses");
    const [search, setSearch] = useState("");
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

    const exportCsv = () => {
        let csv = "Batch Ref,Material,Supplier,Quantity,Unit,Hazard,Temperature,Status\n";
        filtered.forEach((r: any) => {
            csv += `"${r.batch_reference}","${getMaterialName(r)}","${getSupplierCode(r)}",${r.quantity},"${r.unit}","${r.hazard_class}","${r.temperature_requirement}","${r.status}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `inbound_receipts_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filtered = useMemo(() => {
        return receipts.filter(r => {
            if (statusFilter !== "All Statuses" && r.status !== statusFilter) return false;
            if (materialFilter !== "All Materials") {
                const mt = (typeof r.material_id === "object" && r.material_id) ? (r.material_id as any).type : "";
                if (mt !== materialFilter) return false;
            }
            if (search) {
                const q = search.toLowerCase();
                return (
                    (r.batch_reference || "").toLowerCase().includes(q) ||
                    getMaterialName(r).toLowerCase().includes(q) ||
                    getSupplierCode(r).toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [receipts, statusFilter, materialFilter, search]);

    const pendingCount = receipts.filter(r => r.status === "Pending QC").length;

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="move_to_inbox"
                title="Inbound Intake"
                subtitle="Raw material staging and pre-production status."
                badge={!loading && (
                    <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {pendingCount} pending QC
                    </span>
                )}
                actions={
                    <>
                        <button onClick={exportCsv} className="btn btn-secondary">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                        <button onClick={() => router.push("/inbound/new")} className="btn btn-primary">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            New Intake
                        </button>
                    </>
                }
            />

            {/* Filters + View Toggle */}
            <div className="ui-card p-3 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1 min-w-0">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search batch, material, supplier..."
                            className="field pl-9 h-10"
                        />
                    </div>
                    <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="field h-10 w-auto cursor-pointer">
                        <option>All Materials</option>
                        <option>Essential Oils</option>
                        <option>Aroma Chemical</option>
                        <option>Solvent</option>
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field h-10 w-auto cursor-pointer">
                        <option>All Statuses</option>
                        <option>Pending QC</option>
                        <option>QC Released</option>
                        <option>Blocked</option>
                    </select>
                </div>
                <div className="flex items-center gap-1 border border-slate-200 p-1 bg-slate-50 rounded-lg">
                    <button
                        onClick={() => setViewMode("list")}
                        aria-pressed={viewMode === "list"}
                        aria-label="Table view"
                        className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        aria-pressed={viewMode === "grid"}
                        aria-label="Grid view"
                        className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    </button>
                </div>
            </div>

            {/* List View (Table) */}
            {viewMode === "list" && (
                <div className="ui-card overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-100">
                                <th className="px-5 py-3 font-semibold">Batch Ref.</th>
                                <th className="px-5 py-3 font-semibold">Material</th>
                                <th className="px-5 py-3 font-semibold">Quantity</th>
                                <th className="px-5 py-3 font-semibold">Priority</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                                <th className="px-5 py-3 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <SkeletonRows rows={6} cols={6} />
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6}>
                                    <EmptyState
                                        icon="inbox"
                                        title="No inbound receipts found"
                                        description="Try adjusting your filters, or register a new shipment to get started."
                                        action={<button onClick={() => router.push("/inbound/new")} className="btn btn-primary"><span className="material-symbols-outlined text-[18px]">add</span>New Intake</button>}
                                    />
                                </td></tr>
                            ) : filtered.map((row) => {
                                const priority = getPriority(row);
                                return (
                                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors group cursor-pointer" onClick={() => router.push(`/qc?receipt=${row.id}`)}>
                                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-emerald-700">{row.batch_reference}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-slate-900">{getMaterialName(row)}</div>
                                            <div className="text-[11px] text-slate-500">Supplier: {getSupplierCode(row)}</div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-slate-600 tabular-nums">{row.quantity} {row.unit}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityClass(priority)}`}>{priority}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-center relative">
                                            <button
                                                onClick={(e) => handleActionClick(e, row.id)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
                                                aria-label="Actions"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                            </button>
                                            {openMenuId === row.id && (
                                                <div ref={menuRef} className="absolute right-4 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-rise text-left">
                                                    <button
                                                        onClick={(e) => handleViewInQC(e, row.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-emerald-600">biotech</span>
                                                        View in QC
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleViewDetail(e, row)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-slate-400">visibility</span>
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
                    </div>
                    <div className="bg-slate-50/70 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                        <span>Showing {filtered.length} of {receipts.length} entries</span>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">cloud_done</span>
                            <span className="text-emerald-700 font-medium">Live from DaaS</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid View (Cards) */}
            {viewMode === "grid" && (
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="ui-card p-5 space-y-3">
                                    <div className="flex justify-between"><div className="skeleton h-3 w-20" /><div className="skeleton h-5 w-16 rounded-full" /></div>
                                    <div className="skeleton h-4 w-32" />
                                    <div className="skeleton h-3 w-24" />
                                    <div className="skeleton h-3 w-full mt-3" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="ui-card">
                            <EmptyState
                                icon="inbox"
                                title="No inbound receipts found"
                                description="Try adjusting your filters, or register a new shipment to get started."
                                action={<button onClick={() => router.push("/inbound/new")} className="btn btn-primary"><span className="material-symbols-outlined text-[18px]">add</span>New Intake</button>}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map((row) => {
                                const priority = getPriority(row);
                                return (
                                    <div
                                        key={row.id}
                                        className="ui-card ui-card-hover p-5 cursor-pointer group relative"
                                        onClick={() => router.push(`/qc?receipt=${row.id}`)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-mono text-xs font-semibold text-emerald-700">{row.batch_reference}</span>
                                            <StatusBadge status={row.status} />
                                        </div>

                                        <h4 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-1 pr-6">{getMaterialName(row)}</h4>
                                        <p className="text-[11px] text-slate-500 mb-3">Supplier: {getSupplierCode(row)}</p>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <span className="font-mono text-xs text-slate-600 tabular-nums">{row.quantity} {row.unit}</span>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityClass(priority)}`}>{priority}</span>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={(e) => handleActionClick(e, row.id)}
                                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                aria-label="Actions"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                            </button>
                                            {openMenuId === row.id && (
                                                <div ref={menuRef} className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-rise text-left">
                                                    <button
                                                        onClick={(e) => handleViewInQC(e, row.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-emerald-600">biotech</span>
                                                        View in QC
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleViewDetail(e, row)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] text-slate-400">visibility</span>
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
                    <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
                        <span>Showing {filtered.length} of {receipts.length} entries</span>
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">cloud_done</span>
                            <span className="text-emerald-700 font-medium">Live from DaaS</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
