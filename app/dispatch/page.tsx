"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem, updateItem } from "@/lib/api/client";
import { notifications } from "@mantine/notifications";
import { useRole, getActorName, canCreateDispatch } from "@/lib/rbac";

interface Lot {
    id: string;
    lot_number: string;
    quantity: number;
    status: string;
    material_id: { id: string; name: string; type: string } | string | null;
    date_created: string;
}

interface DispatchRecord {
    id: string;
    lot_number: string;
    material_name: string;
    destination: string;
    dispatch_type: string;
    quantity_sample: number;
    date_created: string;
}

const DESTINATIONS = [
    "Local — Jakarta",
    "Local — Surabaya",
    "Local — Bandung",
    "Export — Singapore",
    "Export — Malaysia",
    "Export — Japan",
    "Export — USA",
];

export default function DispatchPage() {
    const { role } = useRole();
    const [lots, setLots] = useState<Lot[]>([]);
    const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState<Map<string, any>>(new Map());

    // Form state
    const [selectedLotId, setSelectedLotId] = useState("");
    const [destination, setDestination] = useState("");
    const [dispatchType, setDispatchType] = useState("Sample");
    const [sampleQty, setSampleQty] = useState("1");
    const [dispatching, setDispatching] = useState(false);

    useEffect(() => {
        Promise.all([
            fetchItems<any>("lots", { sort: "-date_created", limit: 50 }),
            fetchItems<any>("materials", {}),
            fetchItems<any>("sample_dispatches", { sort: "-date_created", limit: 20 }),
        ]).then(([lotsRes, matRes, dispRes]) => {
            const matMap = new Map(matRes.data.map((m: any) => [m.id, m]));
            setMaterials(matMap);

            const merged = lotsRes.data.map((l: any) => ({
                ...l,
                material_id: matMap.get(l.material_id) || l.material_id,
            }));
            // Only show lots that are Ready or Stored (available for dispatch)
            setLots(merged.filter((l: Lot) => ["Ready", "Stored", "QC Released"].includes(l.status)));

            // Build dispatch history
            const history: DispatchRecord[] = dispRes.data.map((d: any) => ({
                id: d.id,
                lot_number: d.lot_number || "—",
                material_name: d.material_name || "—",
                destination: d.destination || "—",
                dispatch_type: d.dispatch_type || "Sample",
                quantity_sample: d.quantity_sample || 0,
                date_created: d.date_created,
            }));
            setDispatches(history);
        }).catch(err => {
            console.error("Failed to load dispatch data", err);
        }).finally(() => setLoading(false));
    }, []);

    const getMaterialName = (mat: any): string => {
        if (!mat) return "Unknown";
        if (typeof mat === 'object' && mat.name) return mat.name;
        return "Material";
    };

    const handleDispatch = async () => {
        if (!selectedLotId || !destination) return;
        const lot = lots.find(l => l.id === selectedLotId);
        if (!lot) return;

        // Quantity validation
        const qty = Number(sampleQty);
        if (qty > lot.quantity) {
            notifications.show({
                title: "Validation Error",
                message: `Dispatch quantity (${qty}kg) exceeds available stock (${lot.quantity}kg).`,
                color: "red",
                autoClose: 5000,
            });
            return;
        }
        if (qty <= 0) {
            notifications.show({
                title: "Validation Error",
                message: "Dispatch quantity must be greater than 0.",
                color: "red",
                autoClose: 5000,
            });
            return;
        }

        setDispatching(true);

        try {
            // 1. Create sample_dispatches record
            const dispatchData = {
                lot_id: lot.id,
                lot_number: lot.lot_number,
                material_name: getMaterialName(lot.material_id),
                destination: destination,
                dispatch_type: dispatchType,
                quantity_sample: Number(sampleQty),
            };
            await createItem("sample_dispatches", dispatchData);

            // 2. Update lot status to "Dispatched"
            await updateItem("lots", lot.id, { status: "Dispatched" });

            // 3. Audit log entry
            const actor = getActorName(role);
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role,
                action: "Dispatched sample",
                entity: lot.lot_number,
                change_detail: `${Number(sampleQty)}kg of ${getMaterialName(lot.material_id)} dispatched to ${destination} by ${actor}. Status: → Dispatched.`,
            });

            // 4. Update UI
            setLots(prev => prev.filter(l => l.id !== lot.id));
            setDispatches(prev => [{
                id: crypto.randomUUID(),
                lot_number: lot.lot_number,
                material_name: getMaterialName(lot.material_id),
                destination,
                dispatch_type: dispatchType,
                quantity_sample: Number(sampleQty),
                date_created: new Date().toISOString(),
            }, ...prev]);

            // Reset form
            setSelectedLotId("");
            setDestination("");
            setSampleQty("1");
            notifications.show({
                title: "Dispatched ✓",
                message: `${lot.lot_number} successfully dispatched to ${destination}.`,
                color: "green",
                autoClose: 5000,
            });
        } catch (err) {
            console.error("Dispatch failed", err);
            notifications.show({
                title: "Dispatch Failed",
                message: "Could not complete dispatch. Please check the console for details.",
                color: "red",
                autoClose: 5000,
            });
        } finally {
            setDispatching(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin mr-3 text-3xl">sync</span>
                Loading Dispatch Data...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-outline-variant pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest">Outbound</span>
                        <span className="text-xs text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">cloud_done</span> Live from DaaS
                        </span>
                    </div>
                    <h2 className="font-display font-bold text-3xl text-primary">Sample Dispatch</h2>
                    <p className="text-on-surface-variant mt-1">Ship samples to local and export customers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Dispatch Form or Read-Only Notice */}
                {!canCreateDispatch(role) ? (
                    <div className="lg:col-span-5 bg-white rounded-xl border border-outline-variant p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
                        <span className="material-symbols-outlined text-5xl text-amber-500 mb-4">visibility</span>
                        <h3 className="font-bold text-lg mb-2">View-Only Mode</h3>
                        <p className="text-sm text-on-surface-variant mb-4">Your role ({role}) does not have permission to create dispatches.</p>
                        <p className="text-xs text-on-surface-variant bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">Contact <strong>Operations Manager</strong> to create a new dispatch.</p>
                    </div>
                ) : (
                <div className="lg:col-span-5 bg-white rounded-xl border border-outline-variant p-8 shadow-sm">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">send</span>
                        New Dispatch
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Select Lot</label>
                            <select
                                value={selectedLotId}
                                onChange={e => setSelectedLotId(e.target.value)}
                                className="w-full border border-outline-variant rounded-sm p-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Choose a lot to dispatch...</option>
                                {lots.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.lot_number} — {getMaterialName(l.material_id)} ({l.quantity}kg) [{l.status}]
                                    </option>
                                ))}
                            </select>
                            {lots.length === 0 && (
                                <p className="text-xs text-on-surface-variant mt-2">No lots available for dispatch. Complete QC and Warehouse first.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Destination</label>
                            <select
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                className="w-full border border-outline-variant rounded-sm p-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Choose destination...</option>
                                {DESTINATIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Dispatch Type</label>
                                <select
                                    value={dispatchType}
                                    onChange={e => setDispatchType(e.target.value)}
                                    className="w-full border border-outline-variant rounded-sm p-3 text-sm focus:ring-primary focus:border-primary"
                                >
                                    <option value="Sample">Sample</option>
                                    <option value="Bulk">Bulk Shipment</option>
                                    <option value="Trial">Trial Order</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Sample Qty (kg)</label>
                                <input
                                    type="number"
                                    value={sampleQty}
                                    onChange={e => setSampleQty(e.target.value)}
                                    min="1"
                                    className="w-full border border-outline-variant rounded-sm p-3 text-sm focus:ring-primary focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Selected Lot Preview */}
                        {selectedLotId && (() => {
                            const lot = lots.find(l => l.id === selectedLotId);
                            if (!lot) return null;
                            return (
                                <div className="bg-primary-container/30 p-4 rounded-lg border border-primary/20">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Dispatch Preview</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div><span className="text-outline">Lot:</span> <span className="font-bold">{lot.lot_number}</span></div>
                                        <div><span className="text-outline">Material:</span> <span className="font-bold">{getMaterialName(lot.material_id)}</span></div>
                                        <div><span className="text-outline">Full Qty:</span> <span className="font-bold">{lot.quantity}kg</span></div>
                                        <div><span className="text-outline">Sample:</span> <span className="font-bold">{sampleQty}kg → {destination || "—"}</span></div>
                                    </div>
                                </div>
                            );
                        })()}

                        <button
                            onClick={handleDispatch}
                            disabled={dispatching || !selectedLotId || !destination}
                            className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-sm text-xs uppercase tracking-widest shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                        >
                            {dispatching ? (
                                <><span className="material-symbols-outlined animate-spin text-sm">sync</span> Processing...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">send</span> Dispatch Sample</>
                            )}
                        </button>
                    </div>
                    </div>
                )}

                {/* RIGHT: Dispatch History */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-outline-variant">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline">history</span>
                            Dispatch History
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">{dispatches.length} records from DaaS</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-surface-container text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                                <tr>
                                    <th className="px-6 py-3">Lot</th>
                                    <th className="px-6 py-3">Material</th>
                                    <th className="px-6 py-3">Destination</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Qty</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-outline-variant/30">
                                {dispatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-4xl block mb-2">local_shipping</span>
                                            No dispatches yet. Send your first sample above!
                                        </td>
                                    </tr>
                                ) : dispatches.map((d) => (
                                    <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                                        <td className="px-6 py-3 font-bold text-primary">{d.lot_number}</td>
                                        <td className="px-6 py-3">{d.material_name}</td>
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${d.destination.startsWith('Export') ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                                                {d.destination}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-bold">{d.dispatch_type}</td>
                                        <td className="px-6 py-3 font-mono">{d.quantity_sample}kg</td>
                                        <td className="px-6 py-3 text-xs text-outline">{new Date(d.date_created).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
