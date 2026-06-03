"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem, updateItem } from "@/lib/api/client";
import { notifications } from "@mantine/notifications";
import { useRole, canMarkReadyForProduction, getActorName } from "@/lib/rbac";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Spinner } from "@/components/shared/States";

interface Lot {
    id: string;
    lot_number: string;
    quantity: number;
    status: string;
    current_location: string | null;
    material_id: { id: string; name: string } | string | null;
    date_created: string;
}

const COLUMNS = [
    { id: "Pending QC", label: "Awaiting QC", color: "bg-slate-400", icon: "hourglass_top", accent: "slate" },
    { id: "QC Released", label: "QC Released", color: "bg-teal-500", icon: "verified", accent: "teal" },
    { id: "Ready for Warehouse", label: "Ready for Warehouse", color: "bg-emerald-500", icon: "warehouse", accent: "emerald" },
    { id: "On Hold", label: "On Hold", color: "bg-amber-500", icon: "pause_circle", accent: "amber" },
];

// Valid transitions per source status (PPIC Planner)
const VALID_TRANSITIONS: Record<string, string[]> = {
    "Pending QC": [], // Only QC Staff can release
    "QC Released": ["Ready for Warehouse", "On Hold"],
    "Ready for Warehouse": ["On Hold"],
    "On Hold": ["QC Released", "Ready for Warehouse"],
    "Blocked": [], // Blocked lots cannot be moved via PPIC drag-and-drop
    "Stored": [], // Already in warehouse
    "Dispatched": [], // Already dispatched
};

const TRANSITION_REASONS: Record<string, string> = {
    "Pending QC→QC Released": "Status ini hanya bisa diperbarui oleh QC Staff setelah approval QC.",
    "Pending QC→Ready for Warehouse": "Material harus lolos QC terlebih dahulu sebelum bisa dijadwalkan.",
    "Pending QC→On Hold": "Material harus lolos QC terlebih dahulu.",
    "Blocked→QC Released": "Lot yang diblokir hanya bisa dibuka oleh Manager/Admin atau QC Staff melalui re-inspection.",
    "Blocked→Ready for Warehouse": "Lot yang diblokir tidak boleh masuk ke antrian warehouse.",
    "Blocked→On Hold": "Lot yang diblokir harus melalui unblock oleh Manager/Admin terlebih dahulu.",
    "Ready for Warehouse→QC Released": "Lot sudah melewati tahap QC Released.",
    "Stored→QC Released": "Lot sudah tersimpan di warehouse dan tidak bisa dikembalikan.",
    "Stored→Ready for Warehouse": "Lot sudah tersimpan di warehouse.",
    "Dispatched→QC Released": "Lot sudah dikirim.",
};

function getDisplayStatus(status: string): string {
    if (status === "Awaiting Slot") return "Ready for Warehouse";
    return status;
}

export default function PPICPage() {
    const { role } = useRole();
    const hasPermission = canMarkReadyForProduction(role);
    const [lots, setLots] = useState<Lot[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    // Mobile tap-to-move: id of the lot whose move menu is currently open.
    const [moveMenuLotId, setMoveMenuLotId] = useState<string | null>(null);

    // Copilot suggestion
    const [applying, setApplying] = useState(false);
    const [copilotLot, setCopilotLot] = useState<Lot | null>(null);

    useEffect(() => {
        Promise.all([
            fetchItems<any>("lots", { sort: "-date_created", limit: 100 }),
            fetchItems<any>("materials", {}),
        ]).then(([lotsRes, matRes]) => {
            const matMap = new Map(matRes.data.map((m: any) => [m.id, m]));
            const merged = lotsRes.data.map((l: any) => ({
                ...l,
                material_id: matMap.get(l.material_id) || l.material_id,
            }));
            setLots(merged);
            setMaterials(matRes.data);
            const qcReleased = merged.filter((l: Lot) => l.status === "QC Released");
            if (qcReleased.length > 0) setCopilotLot(qcReleased[0]);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load PPIC data", err);
            setLoading(false);
        });
    }, []);

    const getMaterialName = (mat: any) => {
        if (!mat) return "Unknown Material";
        if (typeof mat === "object" && mat.name) return mat.name;
        return "Material";
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // ── Validated Drag & Drop ──────────────────────────────
    const handleDragStart = (e: React.DragEvent, lotId: string, fromStatus: string) => {
        e.dataTransfer.setData("lotId", lotId);
        e.dataTransfer.setData("fromStatus", fromStatus);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverCol(colId);
    };

    const handleDragLeave = () => setDragOverCol(null);

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        setDragOverCol(null);
        const lotId = e.dataTransfer.getData("lotId");
        const fromStatus = e.dataTransfer.getData("fromStatus");
        if (!lotId || !fromStatus) return;
        await applyTransition(lotId, fromStatus, targetStatus);
    };

    // Shared transition logic used by both desktop drag-drop and the mobile
    // tap-to-move menu. Validates permission + allowed transitions, then
    // persists and audit-logs the change with optimistic UI update.
    const applyTransition = async (lotId: string, fromStatus: string, targetStatus: string) => {
        if (!lotId || !fromStatus) return;
        if (fromStatus === targetStatus) return;

        // Check permission
        if (!hasPermission) {
            notifications.show({ title: "Access Denied", message: `Your role (${role}) cannot modify production readiness.`, color: "red", autoClose: 4000 });
            return;
        }

        // Validate transition
        const allowed = VALID_TRANSITIONS[fromStatus] || [];
        if (!allowed.includes(targetStatus)) {
            const reason = TRANSITION_REASONS[`${fromStatus}→${targetStatus}`] || `Cannot move from "${fromStatus}" to "${targetStatus}".`;
            notifications.show({ title: "Invalid Transition", message: reason, color: "orange", autoClose: 5000 });
            return;
        }

        // Apply transition
        const actor = getActorName(role);
        setLots(prev => prev.map(lot => lot.id === lotId ? { ...lot, status: targetStatus } : lot));
        try {
            await updateItem("lots", lotId, { status: targetStatus });
            const lot = lots.find(l => l.id === lotId);
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role,
                action: targetStatus === "Blocked" ? "Put lot on hold" : "Updated production readiness",
                entity: lot?.lot_number || lotId,
                change_detail: `${lot?.lot_number || lotId} moved from "${fromStatus}" to "${targetStatus}" by ${actor}.`,
            });
            notifications.show({ title: "Status Updated ✓", message: `${lot?.lot_number || "Lot"} → ${targetStatus}. Audit-logged.`, color: "green", autoClose: 4000 });
        } catch (err) {
            console.error(err);
            setLots(prev => prev.map(lot => lot.id === lotId ? { ...lot, status: fromStatus } : lot));
            notifications.show({ title: "Error", message: "Could not update status.", color: "red" });
        }
    };

    // Targets a lot can move to from its current (display) status, for the
    // mobile tap-to-move menu. Maps target status ids to friendly column labels.
    const getMoveTargets = (status: string): { id: string; label: string }[] => {
        const allowed = VALID_TRANSITIONS[status] || [];
        return allowed
            .map(id => {
                const col = COLUMNS.find(c => c.id === id);
                return col ? { id: col.id, label: col.label } : null;
            })
            .filter((x): x is { id: string; label: string } => x !== null);
    };

    // ── Copilot Apply ──────────────────────────────────────
    const handleApplyCopilot = async () => {
        if (!copilotLot || !hasPermission) return;
        setApplying(true);
        const actor = getActorName(role);
        try {
            await updateItem("lots", copilotLot.id, { status: "Awaiting Slot" });
            setLots(prev => prev.map(l => l.id === copilotLot.id ? { ...l, status: "Awaiting Slot" } : l));
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role,
                action: "Applied copilot suggestion",
                entity: copilotLot.lot_number || copilotLot.id,
                change_detail: `${copilotLot.lot_number} marked Ready for Warehouse via AI suggestion by ${actor}.`,
            });
            notifications.show({ title: "Applied ✓", message: `${copilotLot.lot_number} → Ready for Warehouse.`, color: "green", autoClose: 4000 });
            const remaining = lots.filter(l => l.status === "QC Released" && l.id !== copilotLot.id);
            setCopilotLot(remaining.length > 0 ? remaining[0] : null);
        } catch (err) {
            notifications.show({ title: "Error", message: "Could not apply suggestion.", color: "red" });
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="view_kanban"
                title="PPIC Board"
                subtitle="Production planning — drag lots between stages (or tap “Move to…” on mobile). Transitions are validated and audit-logged."
                actions={!hasPermission && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Read-only view
                    </div>
                )}
            />

            {/* Copilot Suggestion */}
            {copilotLot && hasPermission && (
                <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 flex items-start gap-4 animate-rise">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white grid place-items-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[20px] icon-fill">auto_awesome</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-sm text-emerald-900">AI Suggestion</h4>
                            <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Recommended</span>
                        </div>
                        <p className="text-xs text-emerald-800/90 leading-relaxed"><span className="font-mono font-semibold">{copilotLot.lot_number}</span> is recommended for warehouse readiness based on QC release time and dispatch priority.</p>
                    </div>
                    <button
                        onClick={handleApplyCopilot}
                        disabled={applying}
                        className="btn btn-primary shrink-0"
                    >
                        {applying ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">check</span>}
                        {applying ? "Applying..." : "Apply"}
                    </button>
                </div>
            )}

            {/* Transition Rules Info */}
            <details className="ui-card group">
                <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">info</span>
                    <span className="text-sm font-medium text-slate-700 flex-1">Drag-and-drop rules</span>
                    <span className="material-symbols-outlined text-slate-400 text-[20px] transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 space-y-1.5 border-t border-slate-100 leading-relaxed">
                    <p className="pt-2">• <span className="font-semibold text-slate-700">Awaiting QC → QC Released:</span> Only via QC Staff approval (cannot be dragged)</p>
                    <p>• <span className="font-semibold text-slate-700">QC Released → Ready for Warehouse:</span> PPIC can move when lot is ready</p>
                    <p>• <span className="font-semibold text-slate-700">QC Released / Ready → On Hold:</span> PPIC can hold for scheduling/capacity reasons</p>
                    <p>• <span className="font-semibold text-slate-700">On Hold → QC Released / Ready:</span> PPIC can resume when ready</p>
                    <p>• <span className="font-semibold text-slate-700">Blocked:</span> Cannot be moved via drag-and-drop (requires Manager/Admin override)</p>
                    <p>• Every transition is validated and recorded in the audit log</p>
                </div>
            </details>

            {/* Kanban Board */}
            {loading ? (
                <div className="ui-card"><Spinner label="Loading production board..." /></div>
            ) : (
                <>
                {/* Pipeline flow summary */}
                <div className="ui-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900">Production pipeline</h3>
                        <span className="text-xs text-slate-500">{lots.length} lots tracked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {COLUMNS.map((col, i) => {
                            const count = lots.filter(lot => getDisplayStatus(lot.status) === col.id).length;
                            const pct = lots.length > 0 ? (count / lots.length) * 100 : 0;
                            return (
                                <div key={col.id} className="flex-1 group" title={`${col.label}: ${count}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 truncate">
                                            <span className={`w-2 h-2 rounded-full ${col.color}`} />
                                            <span className="hidden sm:inline truncate">{col.label}</span>
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 tabular-nums">{count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${col.color} transition-[width] duration-700`} style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {COLUMNS.map((col) => {
                        const columnLots = lots.filter(lot => getDisplayStatus(lot.status) === col.id);
                        const isDragOver = dragOverCol === col.id;
                        return (
                            <div
                                key={col.id}
                                className={`flex flex-col rounded-xl border transition-all min-h-[200px] md:min-h-[420px] ${isDragOver ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-200" : "border-slate-200 bg-slate-50/60"}`}
                                onDragOver={(e) => handleDragOver(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                                        {col.label}
                                    </h3>
                                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-500">{columnLots.length}</span>
                                </div>
                                <div className="p-3 space-y-2.5 flex-1 overflow-y-auto soft-scroll">
                                    {columnLots.length > 0 ? columnLots.map((item) => {
                                        const moveTargets = getMoveTargets(getDisplayStatus(item.status));
                                        const menuOpen = moveMenuLotId === item.id;
                                        return (
                                        <div
                                            key={item.id}
                                            className={`relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md ${hasPermission ? "md:cursor-grab md:active:cursor-grabbing active:shadow-lg md:active:rotate-1" : "cursor-default"}`}
                                            draggable={hasPermission}
                                            onDragStart={(e) => handleDragStart(e, item.id, getDisplayStatus(item.status))}
                                        >
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <span className="font-mono text-xs font-semibold text-emerald-700">{item.lot_number || item.id.substring(0, 8)}</span>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${item.quantity > 100 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                    {item.quantity > 100 ? "High" : "Normal"}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-sm text-slate-900 line-clamp-1">{getMaterialName(item.material_id)}</p>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                                                <span className="font-mono">{item.quantity} kg</span>
                                                <span>{formatDate(item.date_created)}</span>
                                            </div>
                                            {item.current_location && (
                                                <div className="mt-2 flex items-center gap-1 text-[11px] text-teal-600 font-medium">
                                                    <span className="material-symbols-outlined text-[13px]">place</span>
                                                    {item.current_location}
                                                </div>
                                            )}
                                            {hasPermission && (
                                                <>
                                                    {/* Desktop drag hint */}
                                                    <div className="mt-2 -mb-1 hidden md:flex items-center gap-1 text-[10px] text-slate-300">
                                                        <span className="material-symbols-outlined text-[12px]">drag_indicator</span>
                                                        Drag to move
                                                    </div>
                                                    {/* Mobile tap-to-move button */}
                                                    {moveTargets.length > 0 && (
                                                        <button
                                                            onClick={() => setMoveMenuLotId(menuOpen ? null : item.id)}
                                                            className="md:hidden mt-3 w-full btn btn-secondary text-xs py-2"
                                                            aria-haspopup="true"
                                                            aria-expanded={menuOpen}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                                                            Move to…
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-14 text-slate-300">
                                            <span className="material-symbols-outlined text-3xl mb-2">{col.icon}</span>
                                            <p className="text-xs text-slate-400">{hasPermission ? "Drop lots here" : "No items"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>
            )}

            {/* Mobile tap-to-move bottom sheet */}
            {moveMenuLotId && (() => {
                const lot = lots.find(l => l.id === moveMenuLotId);
                if (!lot) return null;
                const fromStatus = getDisplayStatus(lot.status);
                const targets = getMoveTargets(fromStatus);
                return (
                    <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMoveMenuLotId(null)}>
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-rise" onClick={e => e.stopPropagation()}>
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-semibold text-emerald-700">{lot.lot_number || lot.id.substring(0, 8)}</span>
                                <StatusBadge status={fromStatus} />
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Move {getMaterialName(lot.material_id)} to:</p>
                            <div className="space-y-2">
                                {targets.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={async () => { setMoveMenuLotId(null); await applyTransition(lot.id, fromStatus, t.id); }}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left"
                                    >
                                        <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                                            <span className={`w-2.5 h-2.5 rounded-full ${COLUMNS.find(c => c.id === t.id)?.color || "bg-slate-400"}`} />
                                            {t.label}
                                        </span>
                                        <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_forward</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setMoveMenuLotId(null)} className="w-full mt-3 py-2.5 text-sm font-medium text-slate-500">Cancel</button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
