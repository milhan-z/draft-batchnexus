"use client";
import { useEffect, useState } from "react";
import { fetchItems, createItem, updateItem } from "@/lib/api/client";
import { notifications } from "@mantine/notifications";
import { useRole, getActorName, canCreateDispatch } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, Spinner } from "@/components/shared/States";

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
            setLots(merged.filter((l: Lot) => ["Ready", "Stored", "QC Released"].includes(l.status)));

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
            const dispatchData = {
                lot_id: lot.id,
                lot_number: lot.lot_number,
                material_name: getMaterialName(lot.material_id),
                destination: destination,
                dispatch_type: dispatchType,
                quantity_sample: Number(sampleQty),
            };
            await createItem("sample_dispatches", dispatchData);
            await updateItem("lots", lot.id, { status: "Dispatched" });

            const actor = getActorName(role);
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role,
                action: "Dispatched sample",
                entity: lot.lot_number,
                change_detail: `${Number(sampleQty)}kg of ${getMaterialName(lot.material_id)} dispatched to ${destination} by ${actor}. Status: → Dispatched.`,
            });

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

    const selectedLot = lots.find(l => l.id === selectedLotId);
    const exportCount = dispatches.filter(d => d.destination.startsWith("Export")).length;
    const localCount = dispatches.filter(d => d.destination.startsWith("Local")).length;
    const totalQty = dispatches.reduce((s, d) => s + (d.quantity_sample || 0), 0);

    if (loading) {
        return (
            <div className="flex flex-col gap-6 animate-fade-in">
                <PageHeader icon="send" title="Sample Dispatch" subtitle="Outbound queue, courier coordination & customer ETAs." />
                <div className="ui-card"><Spinner label="Loading dispatch data..." /></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="send"
                title="Sample Dispatch"
                subtitle="Outbound queue, courier coordination & customer ETAs."
                badge={
                    <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {exportCount} exports
                    </span>
                }
            />

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
                {[
                    { label: "Total dispatches", value: dispatches.length, icon: "local_shipping", tone: { bg: "bg-slate-100", fg: "text-slate-700" } },
                    { label: "Export shipments", value: exportCount, icon: "flight_takeoff", tone: { bg: "bg-sky-100", fg: "text-sky-700" } },
                    { label: "Local deliveries", value: localCount, icon: "near_me", tone: { bg: "bg-emerald-100", fg: "text-emerald-700" } },
                    { label: "Total volume", value: `${totalQty}kg`, icon: "scale", tone: { bg: "bg-violet-100", fg: "text-violet-700" } },
                ].map(s => (
                    <div key={s.label} className="ui-card ui-card-hover p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg grid place-items-center ${s.tone.bg}`}>
                            <span className={`material-symbols-outlined text-[20px] ${s.tone.fg}`}>{s.icon}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">{s.value}</p>
                            <p className="text-[11px] text-slate-500 truncate">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: Dispatch Form or Read-Only Notice */}
                {!canCreateDispatch(role) ? (
                    <div className="lg:col-span-5 ui-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                        <div className="grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 mb-4">
                            <span className="material-symbols-outlined text-[28px]">visibility</span>
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900 mb-2">View-Only Mode</h3>
                        <p className="text-sm text-slate-500 mb-4">Your role ({role}) does not have permission to create dispatches.</p>
                        <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">Contact <strong>Operations Manager</strong> to create a new dispatch.</p>
                    </div>
                ) : (
                <div className="lg:col-span-5 ui-card p-6 sm:p-7 h-fit">
                    <h3 className="font-semibold text-base text-slate-900 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                            <span className="material-symbols-outlined text-[18px]">send</span>
                        </span>
                        New Dispatch
                    </h3>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Lot</label>
                            <select
                                value={selectedLotId}
                                onChange={e => setSelectedLotId(e.target.value)}
                                className="field cursor-pointer"
                            >
                                <option value="">Choose a lot to dispatch...</option>
                                {lots.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.lot_number} — {getMaterialName(l.material_id)} ({l.quantity}kg) [{l.status}]
                                    </option>
                                ))}
                            </select>
                            {lots.length === 0 && (
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    No lots available for dispatch. Complete QC and Warehouse first.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination</label>
                            <select
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                className="field cursor-pointer"
                            >
                                <option value="">Choose destination...</option>
                                {DESTINATIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dispatch Type</label>
                                <select
                                    value={dispatchType}
                                    onChange={e => setDispatchType(e.target.value)}
                                    className="field cursor-pointer"
                                >
                                    <option value="Sample">Sample</option>
                                    <option value="Bulk">Bulk Shipment</option>
                                    <option value="Trial">Trial Order</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sample Qty (kg)</label>
                                <input
                                    type="number"
                                    value={sampleQty}
                                    onChange={e => setSampleQty(e.target.value)}
                                    min="1"
                                    className="field"
                                />
                            </div>
                        </div>

                        {/* Selected Lot Preview */}
                        {selectedLot && (
                            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 animate-rise">
                                <h4 className="micro-label text-emerald-700 mb-2">Dispatch Preview</h4>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                                    <div><span className="text-slate-500">Lot:</span> <span className="font-semibold text-slate-900">{selectedLot.lot_number}</span></div>
                                    <div><span className="text-slate-500">Material:</span> <span className="font-semibold text-slate-900">{getMaterialName(selectedLot.material_id)}</span></div>
                                    <div><span className="text-slate-500">Full Qty:</span> <span className="font-semibold text-slate-900">{selectedLot.quantity}kg</span></div>
                                    <div><span className="text-slate-500">Sample:</span> <span className="font-semibold text-slate-900">{sampleQty}kg → {destination || "—"}</span></div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleDispatch}
                            disabled={dispatching || !selectedLotId || !destination}
                            className="btn btn-primary w-full py-3"
                        >
                            {dispatching ? (
                                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Processing...</>
                            ) : (
                                <><span className="material-symbols-outlined text-[18px]">send</span> Dispatch Sample</>
                            )}
                        </button>
                    </div>
                    </div>
                )}

                {/* RIGHT: Dispatch History */}
                <div className="lg:col-span-7 ui-card overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">history</span>
                                Dispatch History
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{dispatches.length} records from DaaS</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-100">
                                    <th className="px-5 py-3 font-semibold">Lot</th>
                                    <th className="px-5 py-3 font-semibold">Material</th>
                                    <th className="px-5 py-3 font-semibold">Destination</th>
                                    <th className="px-5 py-3 font-semibold">Type</th>
                                    <th className="px-5 py-3 font-semibold">Qty</th>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {dispatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <EmptyState icon="local_shipping" title="No dispatches yet" description="Send your first sample using the form on the left." />
                                        </td>
                                    </tr>
                                ) : dispatches.map((d) => (
                                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-emerald-700">{d.lot_number}</td>
                                        <td className="px-5 py-3.5 text-slate-900">{d.material_name}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${d.destination.startsWith('Export') ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {d.destination}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-700">{d.dispatch_type}</td>
                                        <td className="px-5 py-3.5 font-mono text-slate-600 tabular-nums">{d.quantity_sample}kg</td>
                                        <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(d.date_created).toLocaleDateString()}</td>
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
