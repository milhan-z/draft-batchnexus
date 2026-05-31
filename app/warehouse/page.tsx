"use client";
import { useEffect, useState } from "react";
import { fetchItems, updateItem, createItem } from "@/lib/api/client";
import { useRole, canAssignSlot, getActorName } from "@/lib/rbac";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AIRecommendationCard } from "@/components/shared/AIRecommendationCard";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { TemperatureChart } from "@/components/shared/TemperatureChart";
import { notifications } from "@mantine/notifications";

export default function WarehousePage() {
    const { role } = useRole();
    const [lots, setLots] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [selectedLot, setSelectedLot] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [materials, setMaterials] = useState<Map<string, any>>(new Map());
    const [tempReadings, setTempReadings] = useState<any[]>([]);

    // Manual override state
    const [slotMode, setSlotMode] = useState<"ai" | "manual">("ai");
    const [manualZone, setManualZone] = useState("");
    const [overrideReason, setOverrideReason] = useState("");
    const [policyViolation, setPolicyViolation] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [lotRes, zoneRes, matRes, tempRes] = await Promise.all([
                fetchItems<any>("lots", { sort: "-date_created" }),
                fetchItems<any>("warehouse_zones", {}),
                fetchItems<any>("materials", {}),
                fetchItems<any>("temperature_readings", { limit: 200 }),
            ]);

            setMaterials(new Map(matRes.data.map((m: any) => [m.id, m])));
            setLots(lotRes.data);
            setZones(zoneRes.data);
            setTempReadings(tempRes.data);

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

    const handleAssignSlot = async () => {
        if (!selectedLot) return;
        setProcessing(true);
        const actor = getActorName(role);
        const rec = getSlotRecommendation(selectedLot);
        const isManual = slotMode === "manual";
        const binId = isManual ? `${manualZone}-01` : rec.bin;
        const assignmentType = isManual ? "manual-override" : "accepted-AI";
        const reason = isManual ? overrideReason : "AI recommended slot accepted";

        try {
            await updateItem("lots", selectedLot.id, {
                status: "Stored",
                current_location: binId
            });

            await createItem("inventory_moves", {
                lot_id: selectedLot.id,
                to_bin_id: `BIN-${binId}`,
                quantity: selectedLot.quantity,
                moved_by: actor,
                reason,
                assignment_type: assignmentType,
                moved_at: new Date().toISOString()
            });

            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role: role,
                action: "Assigned warehouse slot",
                entity: selectedLot.lot_number,
                change_detail: `${selectedLot.lot_number} assigned to ${binId} by ${actor}. Method: ${assignmentType}.${isManual ? ` Override reason: ${overrideReason}` : ""}`
            });

            notifications.show({
                title: "Slot Assigned ✓",
                message: `${selectedLot.lot_number} moved to ${binId} (${assignmentType}).`,
                color: "green",
                autoClose: 5000,
            });
            setShowConfirm(false);
            setSelectedLot(null);
            setSlotMode("ai");
            setManualZone("");
            setOverrideReason("");
            setPolicyViolation(null);
            await loadData();
        } catch (error) {
            console.error(error);
            notifications.show({
                title: "Assignment Failed",
                message: "Could not assign warehouse slot. Please try again.",
                color: "red",
                autoClose: 5000,
            });
        } finally {
            setProcessing(false);
        }
    };

    // Validate manual zone selection against policy
    const validateManualZone = (zoneId: string) => {
        setManualZone(zoneId);
        setPolicyViolation(null);
        if (!selectedLot || !zoneId) return;
        const mat = materials.get(selectedLot.material_id);
        const hazard = mat?.hazard_class || "Normal";
        const isHazard = ["Flammable", "Oxidizer", "Toxic"].includes(hazard);
        const zone = zones.find((z: any) => z.id === zoneId);
        if (!zone) return;

        // Check hazard policy
        if (isHazard && zone.hazard_policy === "No flammable") {
            setPolicyViolation(`⚠ Policy violation: ${hazard} materials are NOT allowed in ${zone.name} (policy: ${zone.hazard_policy}).`);
            return;
        }
        // Check temperature compatibility
        const tempMin = mat?.temp_min;
        if (tempMin !== undefined && tempMin !== null) {
            if (tempMin < zone.temp_min || tempMin > zone.temp_max) {
                setPolicyViolation(`⚠ Temperature mismatch: Material requires ${mat.temperature_requirement} but ${zone.name} operates at ${zone.temp_min}°C to ${zone.temp_max}°C.`);
            }
        }
    };

    const hasPermission = canAssignSlot(role);

    // ── Dynamic smart-slot engine ─────────────────────────────
    // Recommends a zone based on the selected lot's hazard class and required
    // temperature, and computes which zones are blocked by policy.
    const getSlotRecommendation = (lot: any) => {
        const mat = lot ? materials.get(lot.material_id) : null;
        const hazard = (mat?.hazard_class || lot?.hazard_class || "Normal").toString();
        const isHazard = ["Flammable", "Oxidizer", "Toxic"].includes(hazard);
        const tempMin = typeof mat?.temp_min === "number" ? mat.temp_min : null;

        if (isHazard) {
            return {
                zone: "HAZ-D",
                bin: "HAZ-D-04",
                score: 92,
                hazard,
                reasonCodes: [
                    "Temperature range is compatible",
                    `${hazard} material is allowed in this zone`,
                    `Capacity is available for ${lot?.quantity || 12} units`,
                    "Closest valid slot to dispatch lane",
                ],
                blockedZones: ["AMB-A", "COLD-B", "FRZ-C"],
                blockedReason: `${hazard} materials are not allowed in standard ambient or cold storage zones.`,
            };
        }

        // Non-hazard material — route by temperature requirement.
        if (tempMin !== null && tempMin <= -4) {
            return {
                zone: "FRZ-C", bin: "FRZ-C-02", score: 88, hazard,
                reasonCodes: ["Freezer range (-20°C to -4°C) matches requirement", "Non-hazardous, cold storage permitted", `Capacity available for ${lot?.quantity || 12} units`],
                blockedZones: ["HAZ-D"],
                blockedReason: "Hazard bay (HAZ-D) is reserved for hazardous materials.",
            };
        }
        if (tempMin !== null && tempMin <= 4) {
            return {
                zone: "COLD-B", bin: "COLD-B-03", score: 87, hazard,
                reasonCodes: ["Cold range (-4°C to 4°C) matches requirement", "Non-hazardous, cold storage permitted", `Capacity available for ${lot?.quantity || 12} units`],
                blockedZones: ["HAZ-D"],
                blockedReason: "Hazard bay (HAZ-D) is reserved for hazardous materials.",
            };
        }
        return {
            zone: "AMB-A", bin: "AMB-A-07", score: 90, hazard,
            reasonCodes: ["Ambient range (15°C to 30°C) matches requirement", "Non-hazardous, standard storage permitted", `Capacity available for ${lot?.quantity || 12} units`],
            blockedZones: ["HAZ-D"],
            blockedReason: "Hazard bay (HAZ-D) is reserved for hazardous materials.",
        };
    };

    const recommendation = selectedLot ? getSlotRecommendation(selectedLot) : null;

    // Get stored lots per zone for occupancy display
    const getZoneLots = (zoneId: string) => {
        return lots.filter(l => l.status === "Stored" && l.current_location?.startsWith(zoneId));
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-display font-bold text-3xl text-primary">Warehouse Digital Twin</h2>
                <p className="text-on-surface-variant mt-1">Smart slotting, inventory tracking, and cold-chain monitoring.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Pending Slotting Queue */}
                <div className="lg:col-span-3 flex flex-col bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden">
                    <div className="p-4 border-b border-outline-variant bg-surface-container flex justify-between items-center">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">inbox</span>
                            Pending Slotting
                        </h3>
                        <span className="bg-primary text-on-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{pendingSlotting.length} Lots</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh] lg:max-h-[calc(100vh-20rem)]">
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
                                    onClick={() => { setSelectedLot(lot); setSlotMode("ai"); setManualZone(""); setOverrideReason(""); setPolicyViolation(null); }}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedLot?.id === lot.id ? 'bg-primary-container border-primary shadow-sm' : 'bg-white border-outline-variant hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono font-bold text-sm text-primary">{lot.lot_number}</span>
                                        <StatusBadge status={lot.status} />
                                    </div>
                                    <p className="font-bold text-sm line-clamp-1">{materials.get(lot.material_id)?.name || "Material"}</p>
                                    <p className="text-xs text-on-surface-variant">{lot.quantity} units</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Center: Zone Map (visual) */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                        <h3 className="font-bold text-sm">Zone Map</h3>
                        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest opacity-70">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> Ambient</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Cold</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Hazard</span>
                        </div>
                    </div>
                    
                    {/* Visual Zone Grid */}
                    <div className="p-5 space-y-4">
                        {zones.map(z => {
                            let borderColor = "border-outline-variant";
                            let bgColor = "bg-surface-container-lowest";
                            let labelColor = "text-on-surface-variant";
                            if (z.id.includes("AMB")) { borderColor = "border-secondary/40"; bgColor = "bg-secondary/5"; labelColor = "text-secondary"; }
                            if (z.id.includes("COLD") || z.id.includes("FRZ")) { borderColor = "border-blue-300"; bgColor = "bg-blue-50"; labelColor = "text-blue-700"; }
                            if (z.id.includes("HAZ")) { borderColor = "border-amber-300"; bgColor = "bg-amber-50"; labelColor = "text-amber-700"; }
                            
                            const isRecommended = recommendation && z.id === recommendation.zone;
                            const isBlocked = recommendation && recommendation.blockedZones.includes(z.id);
                            const zoneLots = getZoneLots(z.id);
                            const occupancyPct = z.capacity > 0 ? Math.round((z.occupied / z.capacity) * 100) : 0;

                            return (
                                <div key={z.id} className={`rounded-xl border-2 p-4 transition-all relative ${bgColor} ${isRecommended ? 'border-primary ring-2 ring-primary/20' : borderColor} ${isBlocked ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-bold text-sm ${labelColor}`}>{z.id}</h4>
                                            <span className="text-[10px] text-on-surface-variant">({z.name})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {z.status === "Cold-chain Alert" && (
                                                <span className="bg-error text-on-error text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[10px]">warning</span> Alert
                                                </span>
                                            )}
                                            <span className="font-mono text-xs font-bold">{z.current_temperature}°C</span>
                                            {isRecommended && (
                                                <span className="bg-primary text-on-primary text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[10px]">star</span> Target
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bin slots visualization */}
                                    <div className="flex gap-1.5 mb-2">
                                        {Array.from({ length: Math.min(z.capacity || 6, 12) }).map((_, i) => {
                                            const isFilled = i < (z.occupied || 0);
                                            const isTarget = isRecommended && i === (z.occupied || 0);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`h-6 flex-1 rounded-sm border transition-all ${
                                                        isTarget ? "border-primary bg-primary/30 border-dashed border-2" :
                                                        isFilled ? `${z.id.includes("HAZ") ? "bg-amber-300/60 border-amber-400/40" : z.id.includes("COLD") || z.id.includes("FRZ") ? "bg-blue-300/60 border-blue-400/40" : "bg-secondary/40 border-secondary/30"}` :
                                                        "bg-white/60 border-outline-variant/40"
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-on-surface-variant">{z.temp_min}°C to {z.temp_max}°C • {z.hazard_policy}</span>
                                        <span className="text-[10px] font-mono font-bold">{z.occupied}/{z.capacity} ({occupancyPct}%)</span>
                                    </div>

                                    {/* Show stored lots in this zone */}
                                    {zoneLots.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-outline-variant/30 flex flex-wrap gap-1">
                                            {zoneLots.slice(0, 4).map(l => (
                                                <span key={l.id} className="text-[9px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-outline-variant">{l.lot_number}</span>
                                            ))}
                                            {zoneLots.length > 4 && <span className="text-[9px] text-on-surface-variant">+{zoneLots.length - 4} more</span>}
                                        </div>
                                    )}

                                    {isBlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                                            <span className="material-symbols-outlined text-error text-3xl opacity-50">block</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: AI Recommendation + Assignment */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {!selectedLot ? (
                        <div className="bg-white rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant opacity-70 flex-1 flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">ads_click</span>
                            <p className="text-sm">Select a lot from the queue to view smart slot recommendations.</p>
                        </div>
                    ) : (
                        <>
                            {/* AI Recommended Slot — prominent card */}
                            <div className="bg-primary-container/30 rounded-xl border-2 border-primary/30 p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                        <div>
                                            <h4 className="font-bold text-sm">AI Recommended Slot</h4>
                                            <p className="text-[10px] text-on-surface-variant">Human decision required</p>
                                        </div>
                                    </div>
                                    <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-1 rounded-lg">Score {recommendation?.score}</span>
                                </div>
                                <p className="font-display font-bold text-3xl text-primary mb-3">{recommendation?.bin}</p>
                                <div className="space-y-1.5">
                                    {recommendation?.reasonCodes.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                            <span className="material-symbols-outlined text-secondary text-[14px] mt-0.5">check_circle</span>
                                            <span>{r}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Zone Occupancy for recommended zone */}
                            <div className="bg-white rounded-xl border border-outline-variant p-4">
                                <h4 className="font-bold text-sm mb-2">{recommendation?.zone} Occupancy</h4>
                                <p className="text-xs text-on-surface-variant mb-3">Current utilization: {zones.find(z => z.id === recommendation?.zone)?.occupied || 0}/{zones.find(z => z.id === recommendation?.zone)?.capacity || 0}</p>
                                <div className="space-y-1.5">
                                    {getZoneLots(recommendation?.zone || "").map(l => (
                                        <div key={l.id} className="flex items-center gap-2 p-2 bg-surface-container-low rounded-lg border border-outline-variant/50">
                                            <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{l.current_location?.split("-").pop()}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{l.lot_number}</p>
                                                <p className="text-[10px] text-on-surface-variant truncate">{materials.get(l.material_id)?.name || "Material"}</p>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded">Full</span>
                                        </div>
                                    ))}
                                    {/* Show the reserved/target slot */}
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border-2 border-dashed border-primary/40">
                                        <span className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">{recommendation?.bin.split("-").pop()}</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-primary">RESERVED (AI)</p>
                                            <p className="text-[10px] text-on-surface-variant">{selectedLot.lot_number}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-primary text-[16px]">flag</span>
                                    </div>
                                </div>
                            </div>

                            {/* Policy violation warning */}
                            {recommendation?.blockedZones && recommendation.blockedZones.length > 0 && (
                                <div className="bg-error-container/10 border border-error/20 rounded-xl p-4 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5">gpp_bad</span>
                                    <div>
                                        <p className="text-xs font-bold text-error">Policy Restriction</p>
                                        <p className="text-[11px] text-on-surface-variant mt-0.5">{recommendation.blockedReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Assignment Controls */}
                            <div className="bg-white rounded-xl border border-outline-variant p-4 space-y-4">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
                                    <button
                                        onClick={() => { setSlotMode("ai"); setPolicyViolation(null); setManualZone(""); setOverrideReason(""); }}
                                        className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${slotMode === "ai" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant"}`}
                                    >
                                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span> Accept AI
                                    </button>
                                    <button
                                        onClick={() => setSlotMode("manual")}
                                        className={`flex-1 py-2 px-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${slotMode === "manual" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant"}`}
                                    >
                                        <span className="material-symbols-outlined text-[12px]">edit</span> Override
                                    </button>
                                </div>

                                {slotMode === "manual" && (
                                    <div className="space-y-3">
                                        <select value={manualZone} onChange={(e) => validateManualZone(e.target.value)} className="w-full text-sm border border-outline-variant rounded-lg p-2.5 focus:border-primary focus:ring-1">
                                            <option value="">Choose zone...</option>
                                            {zones.filter(z => z.id !== "HOLD-QC").map(z => (
                                                <option key={z.id} value={z.id}>{z.id} — {z.name}</option>
                                            ))}
                                        </select>
                                        {policyViolation && (
                                            <div className="bg-error-container/20 border border-error/30 text-error p-2.5 rounded-lg text-xs flex items-start gap-2">
                                                <span className="material-symbols-outlined text-[14px]">gpp_bad</span>
                                                <span>{policyViolation}</span>
                                            </div>
                                        )}
                                        <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override reason (required)..." className="w-full text-sm border border-outline-variant rounded-lg p-2.5 focus:border-primary focus:ring-1 min-h-[50px] resize-none" />
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={!hasPermission || (slotMode === "manual" && (!manualZone || !overrideReason.trim() || !!policyViolation))}
                                    className={`w-full font-bold py-3.5 rounded-sm text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2
                                        ${hasPermission && !(slotMode === "manual" && (!manualZone || !overrideReason.trim() || !!policyViolation)) ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">{slotMode === "ai" ? "auto_awesome" : "place"}</span>
                                    {slotMode === "ai" ? "Accept AI Recommendation" : "Assign Override"}
                                </button>
                                {!hasPermission && <p className="text-xs text-error text-center">Your role ({role}) cannot assign slots.</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Cold-chain Monitoring (focus area 4) */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary icon-fill">thermostat</span>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">Cold-chain Monitoring</h3>
                        <p className="text-[11px] text-on-surface-variant">Live temperature trend per environment-controlled zone. Out-of-range readings are flagged automatically.</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {zones
                        .filter((z: any) => typeof z.temp_min === "number" && typeof z.temp_max === "number" && z.id !== "HOLD-QC")
                        .map((z: any) => {
                            const series = tempReadings
                                .filter((r: any) => r.zone_id === z.id)
                                .sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                            const isAlert = z.status === "Cold-chain Alert";
                            return (
                                <div key={z.id} className={`rounded-xl border p-4 ${isAlert ? "border-error/40 bg-error-container/10" : "border-outline-variant bg-surface-container-lowest"}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-mono font-bold text-sm">{z.id}</p>
                                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{z.name}</p>
                                        </div>
                                        {isAlert ? (
                                            <span className="bg-error text-on-error text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">warning</span> Alert
                                            </span>
                                        ) : (
                                            <span className="bg-secondary-container text-on-secondary-container text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">In range</span>
                                        )}
                                    </div>
                                    {series.length > 0 ? (
                                        <TemperatureChart readings={series} min={z.temp_min} max={z.temp_max} />
                                    ) : (
                                        <div className="text-center py-6 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-2xl opacity-50">show_chart</span>
                                            <p className="text-[11px] mt-1">No readings · target {z.temp_min}°C to {z.temp_max}°C</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            <ConfirmModal 
                isOpen={showConfirm}
                title="Assign Warehouse Slot?"
                message={`This will move ${selectedLot?.lot_number} to ${recommendation?.bin || "the recommended bin"}, update its status to 'Stored', and create an immutable audit log entry.`}
                confirmLabel="Confirm Assignment"
                onConfirm={handleAssignSlot}
                onCancel={() => setShowConfirm(false)}
                isLoading={processing}
            />
        </div>
    );
}
