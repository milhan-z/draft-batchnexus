"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem, updateItem } from "@/lib/api/client";
import { notifications } from "@mantine/notifications";
import { useRole, canMarkReadyForProduction, getActorName } from "@/lib/rbac";
import { StatusBadge } from "@/components/shared/StatusBadge";

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
    { id: "Pending QC", label: "Awaiting QC", color: "bg-outline", icon: "hourglass_top" },
    { id: "QC Released", label: "QC Released", color: "bg-secondary", icon: "verified" },
    { id: "Ready for Warehouse", label: "Ready for Warehouse", color: "bg-primary", icon: "warehouse" },
    { id: "On Hold", label: "On Hold", color: "bg-amber-500", icon: "pause_circle" },
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
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="font-display font-bold text-3xl text-primary">PPIC Board</h2>
                    <p className="text-on-surface-variant mt-1">Production planning — drag lots between stages. Transitions are validated and audit-logged.</p>
                </div>
                {!hasPermission && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Read-only view — your role cannot modify production status
                    </div>
                )}
            </div>

            {/* Copilot Suggestion */}
            {copilotLot && hasPermission && (
                <div className="bg-primary-container text-on-primary-container p-4 rounded-xl flex items-start gap-4 border border-primary/20">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">AI Suggestion</h4>
                        <p className="text-xs opacity-90">{copilotLot.lot_number} is recommended for warehouse readiness based on QC release time and dispatch priority.</p>
                    </div>
                    <button
                        onClick={handleApplyCopilot}
                        disabled={applying}
                        className="bg-primary text-on-primary font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                    >
                        {applying ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">check</span>}
                        {applying ? "Applying..." : "Apply"}
                    </button>
                </div>
            )}

            {/* Transition Rules Info */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">info</span>
                <div className="text-xs text-on-surface-variant space-y-1">
                    <p className="font-bold">Drag-and-drop rules:</p>
                    <p>• <span className="font-bold">Awaiting QC → QC Released:</span> Only via QC Staff approval (cannot be dragged)</p>
                    <p>• <span className="font-bold">QC Released → Ready for Warehouse:</span> PPIC can move when lot is ready</p>
                    <p>• <span className="font-bold">QC Released / Ready for Warehouse → On Hold:</span> PPIC can hold for scheduling/capacity reasons</p>
                    <p>• <span className="font-bold">On Hold → QC Released / Ready for Warehouse:</span> PPIC can resume when ready</p>
                    <p>• <span className="font-bold">Blocked:</span> Cannot be moved via drag-and-drop (requires Manager/Admin override)</p>
                    <p>• Every transition is validated and recorded in the audit log</p>
                </div>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {COLUMNS.map((col) => {
                        const columnLots = lots.filter(lot => getDisplayStatus(lot.status) === col.id);
                        const isDragOver = dragOverCol === col.id;
                        return (
                            <div
                                key={col.id}
                                className={`flex flex-col bg-surface-container-low rounded-xl border-2 transition-all min-h-[400px] ${isDragOver ? "border-primary bg-primary/5" : "border-outline-variant"}`}
                                onDragOver={(e) => handleDragOver(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                                    <h3 className="font-bold text-sm flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${col.color}`}></span>
                                        {col.label}
                                    </h3>
                                    <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-[10px] font-bold text-on-surface-variant">{columnLots.length}</span>
                                </div>
                                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                    {columnLots.length > 0 ? columnLots.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`bg-white rounded-lg border border-outline-variant p-4 shadow-sm hover:border-primary/50 transition-all ${hasPermission ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                                            draggable={hasPermission}
                                            onDragStart={(e) => handleDragStart(e, item.id, getDisplayStatus(item.status))}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xs font-bold text-primary">{item.lot_number || item.id.substring(0, 8)}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${item.quantity > 100 ? "bg-error-container text-on-error-container" : "bg-surface-variant text-on-surface-variant"}`}>
                                                    {item.quantity > 100 ? "High" : "Normal"}
                                                </span>
                                            </div>
                                            <p className="font-bold text-sm line-clamp-1">{getMaterialName(item.material_id)}</p>
                                            <div className="mt-3 pt-3 border-t border-outline-variant/50 flex justify-between text-[10px] text-on-surface-variant">
                                                <span className="font-mono">{item.quantity} kg</span>
                                                <span>{formatDate(item.date_created)}</span>
                                            </div>
                                            {item.current_location && (
                                                <div className="mt-2 flex items-center gap-1 text-[10px] text-secondary font-bold">
                                                    <span className="material-symbols-outlined text-[12px]">place</span>
                                                    {item.current_location}
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant opacity-40">
                                            <span className="material-symbols-outlined text-3xl mb-2">{col.icon}</span>
                                            <p className="text-xs">{hasPermission ? "Drop lots here" : "No items"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
