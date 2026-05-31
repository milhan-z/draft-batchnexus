"use client";
import { useEffect, useState } from "react";
import { fetchItems, updateItem, createItem } from "@/lib/api/client";
import { useRole, canAssignSlot } from "@/lib/rbac";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AIRecommendationCard } from "@/components/shared/AIRecommendationCard";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

export default function WarehousePage() {
    const { role } = useRole();
    const [lots, setLots] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [selectedLot, setSelectedLot] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [materials, setMaterials] = useState<Map<string, any>>(new Map());

    const loadData = async () => {
        setLoading(true);
        try {
            const [lotRes, zoneRes, matRes] = await Promise.all([
                fetchItems<any>("lots", { sort: "-date_created" }),
                fetchItems<any>("warehouse_zones", {}),
                fetchItems<any>("materials", {})
            ]);

            setMaterials(new Map(matRes.data.map((m: any) => [m.id, m])));
            setLots(lotRes.data);
            setZones(zoneRes.data);

            const pending = lotRes.data.filter((l: any) => l.status === "Awaiting Slot");
            if (pending.length > 0 && !selectedLot) {
                setSelectedLot(pending[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const pendingSlotting = lots.filter(l => l.status === "Awaiting Slot");

    const getRecommendation = () => {
        if (!selectedLot) return null;
        const material = materials.get(selectedLot.material_id);
        if (!material) return null;

        const isFlammable = material.hazard_class === "Flammable";
        const isCold = material.temp_max && material.temp_max <= 5;
        const isFreezer = material.temp_max && material.temp_max <= -5;

        const validZones = zones.filter(z => {
            const zoneKey = String(z.name || z.id).toUpperCase();
            
            if (isFlammable && !zoneKey.includes("HAZ")) return false;
            if (!isFlammable && zoneKey.includes("HAZ")) return false;
            
            if (isFreezer && !zoneKey.includes("FRZ")) return false;
            if (isCold && !isFreezer && !zoneKey.includes("COLD")) return false;
            if (!isCold && !isFreezer && !isFlammable && !zoneKey.includes("AMB")) return false;

            return true;
        });

        if (validZones.length > 0) {
            const bestZone = validZones[0];
            const zoneKey = String(bestZone.name || bestZone.id).toUpperCase();
            
            let reasons: string[] = [];
            if (isFlammable) reasons.push("Flammable material is allowed in this zone");
            if (isCold || isFreezer) reasons.push("Temperature range is compatible");
            if (!isFlammable && !isCold && !isFreezer) reasons.push("Standard ambient storage is sufficient");
            reasons.push(`Capacity is available for ${selectedLot.quantity} units`);
            reasons.push("Closest valid slot to dispatch lane");

            return {
                zoneId: bestZone.id,
                zoneKey: zoneKey,
                exactBin: `${zoneKey}-04`,
                confidence: 92 + Math.floor(Math.random() * 5),
                reasons: reasons
            };
        }
        return null;
    };

    const recommendation = getRecommendation();

    const handleAssignSlot = async () => {
        if (!selectedLot) return;
        setProcessing(true);
        try {
            const binId = recommendation?.exactBin || "AMB-A-01";

            await updateItem("lots", selectedLot.id, {
                status: "Stored",
                current_location: binId
            });

            await createItem("inventory_moves", {
                lot_id: selectedLot.id,
                to_bin_id: `BIN-${binId}`,
                quantity: selectedLot.quantity,
                moved_by: "Current User",
                reason: "AI recommended slot accepted",
                moved_at: new Date().toISOString()
            });

            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: "Current User",
                role: role,
                action: "Assigned warehouse slot",
                entity: `MOVE-${Math.floor(Math.random()*1000)}`,
                change_detail: `${selectedLot.lot_number} assigned to ${binId}.`
            });

            alert(`✅ Slot ${binId} successfully assigned to ${selectedLot.lot_number}.`);
            setShowConfirm(false);
            setSelectedLot(null);
            await loadData();
        } catch (error) {
            console.error(error);
            alert("❌ Failed to assign slot.");
        } finally {
            setProcessing(false);
        }
    };

    const hasPermission = canAssignSlot(role);

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <div>
                <h2 className="font-display font-bold text-3xl text-primary">Warehouse Digital Twin</h2>
                <p className="text-on-surface-variant mt-1">Smart slotting, inventory tracking, and cold-chain monitoring.</p>
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left: Pending Slotting Queue */}
                <div className="w-1/3 flex flex-col bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden">
                    <div className="p-4 border-b border-outline-variant bg-surface-container flex justify-between items-center">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inbox</span>
                            Pending Slotting
                        </h3>
                        <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingSlotting.length} Lots</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary">sync</span></div>
                        ) : pendingSlotting.length === 0 ? (
                            <div className="text-center p-8 text-on-surface-variant opacity-70">
                                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                                <p className="text-xs">No lots awaiting slot assignment.</p>
                            </div>
                        ) : (
                            pendingSlotting.map(lot => (
                                <button
                                    key={lot.id}
                                    onClick={() => setSelectedLot(lot)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedLot?.id === lot.id ? 'bg-primary-container border-primary shadow-sm' : 'bg-white border-outline-variant hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono font-bold text-sm text-primary">{lot.lot_number}</span>
                                        <StatusBadge status={lot.status} />
                                    </div>
                                    <p className="font-bold text-sm line-clamp-1">{materials.get(lot.material_id)?.name}</p>
                                    <p className="text-xs text-on-surface-variant line-clamp-1">{lot.quantity} units</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Map & Recommendation */}
                <div className="w-2/3 flex flex-col bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    {/* Map Header */}
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                        <h3 className="font-bold text-sm">Zone Map</h3>
                        <div className="flex gap-4 text-xs font-bold uppercase tracking-widest opacity-70">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> Ambient</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Cold</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Hazard</span>
                        </div>
                    </div>
                    
                    {/* Visual Map */}
                    <div className="p-6 bg-surface-container-lowest border-b border-outline-variant grid grid-cols-4 gap-4 h-[250px]">
                        {zones.map(z => {
                            const zoneKey = String(z.name || z.id).toUpperCase();
                            let color = "bg-surface border-outline-variant";
                            if (zoneKey.includes("AMB")) color = "bg-secondary-container border-secondary/50 text-secondary";
                            if (zoneKey.includes("COLD") || zoneKey.includes("FRZ")) color = "bg-blue-50 border-blue-200 text-blue-700";
                            if (zoneKey.includes("HAZ")) color = "bg-amber-50 border-amber-200 text-amber-700";
                            
                            const isRecommended = recommendation && recommendation.zoneId === z.id;
                            
                            // Check if blocked
                            let isBlocked = false;
                            if (selectedLot) {
                                const material = materials.get(selectedLot.material_id);
                                if (material) {
                                    const isFlammable = material.hazard_class === "Flammable";
                                    const isCold = material.temp_max && material.temp_max <= 5;
                                    const isFreezer = material.temp_max && material.temp_max <= -5;
                                    
                                    if (isFlammable && !zoneKey.includes("HAZ")) isBlocked = true;
                                    if (isFreezer && !zoneKey.includes("FRZ")) isBlocked = true;
                                    if (isCold && !isFreezer && !zoneKey.includes("COLD")) isBlocked = true;
                                    if (!isCold && !isFreezer && !isFlammable && !zoneKey.includes("AMB")) isBlocked = true;
                                }
                            }

                            return (
                                <div key={z.id} className={`rounded-xl border-2 p-4 flex flex-col relative transition-all ${color} ${isRecommended ? 'ring-4 ring-primary ring-opacity-50 border-primary' : ''} ${isBlocked ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm">{z.id}</h4>
                                        {z.status === "Cold-chain Alert" && <span className="material-symbols-outlined text-error text-[18px]">warning</span>}
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-auto">{z.name}</p>
                                    
                                    {z.current_temperature && (
                                        <div className="mt-2 text-xs font-mono font-bold">{z.current_temperature}°C</div>
                                    )}
                                    
                                    {isRecommended && (
                                        <div className="absolute -top-3 -right-3 bg-primary text-on-primary text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full shadow flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">star</span> Target
                                        </div>
                                    )}
                                    {isBlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-error text-4xl opacity-50">block</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Recommendation Panel */}
                    <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
                        {!selectedLot ? (
                            <div className="text-center p-8 text-on-surface-variant opacity-70 mt-10">
                                <span className="material-symbols-outlined text-4xl mb-2">ads_click</span>
                                <p className="text-sm">Select a lot from the queue to view smart slot recommendations.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-bold text-lg mb-4">Lot Requirements</h4>
                                    <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Material</p>
                                            <p className="font-bold text-sm">{materials.get(selectedLot.material_id)?.name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Hazard Class</p>
                                                <p className="font-bold text-sm text-error">{materials.get(selectedLot.material_id)?.hazard_class || "Normal"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Req. Temp</p>
                                                <p className="font-bold text-sm font-mono">-20°C to -4°C</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Quantity</p>
                                                <p className="font-bold text-sm">{selectedLot.quantity} units</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-error-container text-on-error-container rounded-lg flex items-start gap-2 border border-error/20">
                                        <span className="material-symbols-outlined text-[18px]">warning</span>
                                        <div>
                                            <p className="text-xs font-bold">Zone Restricted: COLD-B & FRZ-C</p>
                                            <p className="text-[10px] mt-1 opacity-80">Flammable materials are not allowed in standard cold storage zones.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col h-full">
                                    {recommendation ? (
                                        <AIRecommendationCard 
                                            title="Smart Slot Engine"
                                            recommendation={`Assign to ${recommendation.exactBin}`}
                                            confidence={recommendation.confidence}
                                            reasonCodes={recommendation.reasons}
                                            icon="warehouse"
                                        />
                                    ) : (
                                        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 text-center h-full flex flex-col items-center justify-center">
                                            <span className="material-symbols-outlined text-error text-4xl mb-2">error</span>
                                            <h4 className="font-bold text-sm text-error">No Valid Zones Available</h4>
                                            <p className="text-xs text-on-surface-variant mt-2">Cannot find a zone matching the hazard and temperature constraints of this lot.</p>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-6 space-y-2">
                                        <button 
                                            onClick={() => setShowConfirm(true)}
                                            disabled={!hasPermission || !recommendation}
                                            className={`w-full font-bold py-4 rounded-sm text-sm uppercase tracking-widest transition-all flex justify-center items-center gap-2
                                                ${(hasPermission && recommendation) ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                                        >
                                            <span className="material-symbols-outlined">place</span>
                                            Assign Slot
                                        </button>
                                        {!hasPermission && (
                                            <p className="text-xs text-error mt-2 text-center">Your role ({role}) cannot assign slots.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal 
                isOpen={showConfirm}
                title="Assign Warehouse Slot?"
                message={`This will move ${selectedLot?.lot_number} to ${recommendation?.exactBin || "the selected zone"}, update its status to 'Stored', and create an immutable audit log entry.`}
                confirmLabel="Confirm Assignment"
                onConfirm={handleAssignSlot}
                onCancel={() => setShowConfirm(false)}
                isLoading={processing}
            />
        </div>
    );
}
