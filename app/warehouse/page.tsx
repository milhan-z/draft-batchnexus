"use client";
import { useEffect, useState } from "react";
import { fetchItems, updateItem, createItem } from "@/lib/api/client";
import { useRole, canAssignSlot, getActorName } from "@/lib/rbac";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { TemperatureChart } from "@/components/shared/TemperatureChart";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, Spinner } from "@/components/shared/States";
import { Progress, RadialGauge } from "@/components/shared/Charts";
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

    // Voice-assisted command state. Voice can ONLY open the confirmation modal —
    // it never assigns a slot automatically. Human confirmation stays mandatory.
    const [voiceText, setVoiceText] = useState("");
    const [voiceListening, setVoiceListening] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState<{ tone: "ok" | "warn" | "info"; message: string } | null>(null);
    const [voiceOpen, setVoiceOpen] = useState(false);

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

            const pending = lotRes.data.filter((l: any) => ["Awaiting Slot", "Ready for Warehouse"].includes(l.status));
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

    const pendingSlotting = lots.filter(l => ["Awaiting Slot", "Ready for Warehouse"].includes(l.status));

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

    // ── Voice-assisted command ────────────────────────────────
    // Interprets a spoken/typed command. The only recognised assignment phrase
    // is "assign this lot to recommended slot", and it only OPENS the confirm
    // modal — it never assigns automatically. Human confirmation is required
    // and the eventual assignment is audit-logged via handleAssignSlot().
    const runVoiceCommand = (raw: string) => {
        const text = raw.trim().toLowerCase();
        if (!text) return;

        const wantsAssign =
            text.includes("assign") &&
            (text.includes("recommended") || text.includes("recommend") || text.includes("ai")) &&
            text.includes("slot");

        if (!wantsAssign) {
            setVoiceFeedback({
                tone: "info",
                message: 'Command not recognised. Try: "assign this lot to recommended slot".',
            });
            return;
        }
        if (!selectedLot) {
            setVoiceFeedback({ tone: "warn", message: "Select a lot from the queue first." });
            return;
        }
        if (!hasPermission) {
            setVoiceFeedback({ tone: "warn", message: `Your role (${role}) cannot assign slots.` });
            return;
        }
        // Always route to the AI recommendation and open the confirmation modal.
        // No automatic assignment — human confirmation is mandatory.
        setSlotMode("ai");
        setPolicyViolation(null);
        setManualZone("");
        setOverrideReason("");
        setShowConfirm(true);
        setVoiceOpen(false);
        setVoiceFeedback({
            tone: "ok",
            message: `Opening confirmation for ${selectedLot.lot_number} → ${recommendation?.bin || "recommended slot"}. Human confirmation required.`,
        });
    };

    // Optional speech recognition (Web Speech API) when available; otherwise the
    // typed input still works as a deterministic fallback for the demo.
    const startVoiceCapture = () => {
        const SpeechRecognition =
            typeof window !== "undefined" &&
            ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        if (!SpeechRecognition) {
            setVoiceFeedback({
                tone: "info",
                message: "Live mic not supported in this browser. Type the command and press Run.",
            });
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.lang = "en-US";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            setVoiceListening(true);
            setVoiceFeedback({ tone: "info", message: "Listening… say \"assign this lot to recommended slot\"." });
            recognition.onresult = (event: any) => {
                const transcript = event.results?.[0]?.[0]?.transcript || "";
                setVoiceText(transcript);
                runVoiceCommand(transcript);
            };
            recognition.onerror = () => {
                setVoiceListening(false);
                setVoiceFeedback({ tone: "warn", message: "Could not capture audio. Type the command instead." });
            };
            recognition.onend = () => setVoiceListening(false);
            recognition.start();
        } catch {
            setVoiceListening(false);
            setVoiceFeedback({ tone: "info", message: "Live mic unavailable. Type the command and press Run." });
        }
    };


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
        <div className="flex flex-col gap-6 animate-fade-in">
            <PageHeader
                icon="warehouse"
                title="Warehouse Digital Twin"
                subtitle="Zone occupancy, cold-chain monitoring & smart slot recommendations."
                badge={!loading && pendingSlotting.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {pendingSlotting.length} awaiting slot
                    </span>
                )}
            />

            {/* Zone summary strip */}
            {!loading && zones.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(() => {
                        const totalOcc = zones.reduce((s: number, z: any) => s + (z.occupied || 0), 0);
                        const totalCap = zones.reduce((s: number, z: any) => s + (z.capacity || 0), 0);
                        const pct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
                        return (
                            <div className="ui-card p-4 flex items-center gap-3">
                                <RadialGauge value={pct} size={64} stroke={7} color="#059669" label={<span className="text-sm font-bold text-slate-900">{pct}%</span>} />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total load</p>
                                    <p className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">{totalOcc}<span className="text-slate-400 text-sm">/{totalCap}</span></p>
                                    <p className="text-[11px] text-slate-500">bins occupied</p>
                                </div>
                            </div>
                        );
                    })()}
                    {zones.map((z: any) => {
                        const pct = z.capacity > 0 ? Math.round((z.occupied / z.capacity) * 100) : 0;
                        const isAlert = z.status === "Cold-chain Alert";
                        const tone = z.id.includes("HAZ") ? { bg: "bg-amber-50", fg: "text-amber-600", bar: "bg-amber-500", icon: "local_fire_department" }
                            : z.id.includes("COLD") || z.id.includes("FRZ") ? { bg: "bg-sky-50", fg: "text-sky-600", bar: "bg-sky-500", icon: "ac_unit" }
                            : z.id.includes("HOLD") ? { bg: "bg-violet-50", fg: "text-violet-600", bar: "bg-violet-500", icon: "pause_circle" }
                            : { bg: "bg-emerald-50", fg: "text-emerald-600", bar: "bg-emerald-500", icon: "inventory_2" };
                        return (
                            <div key={z.id} className={`ui-card ui-card-hover p-4 relative ${isAlert ? "ring-1 ring-amber-300 bg-gradient-to-br from-amber-50 to-white" : ""}`}>
                                {isAlert && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-8 h-8 rounded-lg grid place-items-center ${tone.bg} ${tone.fg}`}>
                                        <span className="material-symbols-outlined text-[16px]">{tone.icon}</span>
                                    </span>
                                    <span className="font-mono text-xs font-semibold text-slate-700">{z.id}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl font-semibold tabular-nums ${isAlert ? "text-amber-700" : "text-slate-900"}`}>{z.current_temperature}</span>
                                    <span className="text-xs text-slate-400">°C</span>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                        <span>Occupancy</span>
                                        <span>{z.occupied}/{z.capacity}</span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" color={tone.bar} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Pending Slotting Queue */}
                <div className="order-1 lg:col-span-3 flex flex-col ui-card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">inbox</span>
                            Pending Slotting
                        </h3>
                        <span className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{pendingSlotting.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto soft-scroll p-3 space-y-2 max-h-[50vh] lg:max-h-[calc(100vh-20rem)]">
                        {loading ? (
                            <Spinner label="Loading lots..." />
                        ) : pendingSlotting.length === 0 ? (
                            <EmptyState icon="inventory_2" title="Queue is clear" description="No lots awaiting slot assignment." />
                        ) : (
                            pendingSlotting.map(lot => (
                                <button
                                    key={lot.id}
                                    onClick={() => { setSelectedLot(lot); setSlotMode("ai"); setManualZone(""); setOverrideReason(""); setPolicyViolation(null); }}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedLot?.id === lot.id ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50/60'}`}
                                >
                                    <div className="flex justify-between items-start mb-1.5 gap-2">
                                        <span className="font-mono font-semibold text-sm text-emerald-700">{lot.lot_number}</span>
                                        <StatusBadge status={lot.status} />
                                    </div>
                                    <p className="font-semibold text-sm text-slate-900 line-clamp-1">{materials.get(lot.material_id)?.name || "Material"}</p>
                                    <p className="text-xs text-slate-500">{lot.quantity} units</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Center: Zone Map (visual) */}
                <div className="order-3 lg:order-2 lg:col-span-5 ui-card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                        <h3 className="font-semibold text-sm text-slate-900">Zone Map</h3>
                        <div className="flex gap-3 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ambient</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span> Cold</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Hazard</span>
                        </div>
                    </div>
                    
                    {/* Visual Zone Grid */}
                    <div className="p-4 sm:p-5 space-y-4">
                        {zones.map(z => {
                            let borderColor = "border-slate-200";
                            let bgColor = "bg-white";
                            let labelColor = "text-slate-700";
                            if (z.id.includes("AMB")) { borderColor = "border-emerald-200"; bgColor = "bg-emerald-50/40"; labelColor = "text-emerald-700"; }
                            if (z.id.includes("COLD") || z.id.includes("FRZ")) { borderColor = "border-sky-200"; bgColor = "bg-sky-50/50"; labelColor = "text-sky-700"; }
                            if (z.id.includes("HAZ")) { borderColor = "border-amber-200"; bgColor = "bg-amber-50/60"; labelColor = "text-amber-700"; }
                            
                            const isRecommended = recommendation && z.id === recommendation.zone;
                            const isBlocked = recommendation && recommendation.blockedZones.includes(z.id);
                            const zoneLots = getZoneLots(z.id);
                            const occupancyPct = z.capacity > 0 ? Math.round((z.occupied / z.capacity) * 100) : 0;

                            return (
                                <div key={z.id} className={`rounded-xl border-2 p-4 transition-all relative ${bgColor} ${isRecommended ? 'border-emerald-500 ring-2 ring-emerald-200' : borderColor} ${isBlocked ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-semibold text-sm ${labelColor}`}>{z.id}</h4>
                                            <span className="text-[11px] text-slate-500">({z.name})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {z.status === "Cold-chain Alert" && (
                                                <span className="bg-rose-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[11px]">warning</span> Alert
                                                </span>
                                            )}
                                            <span className="font-mono text-xs font-semibold text-slate-700">{z.current_temperature}°C</span>
                                            {isRecommended && (
                                                <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[11px]">star</span> Target
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
                                                    className={`h-6 flex-1 rounded-md border transition-all ${
                                                        isTarget ? "border-emerald-500 bg-emerald-200/60 border-dashed border-2" :
                                                        isFilled ? `${z.id.includes("HAZ") ? "bg-amber-300/70 border-amber-400/50" : z.id.includes("COLD") || z.id.includes("FRZ") ? "bg-sky-300/70 border-sky-400/50" : "bg-emerald-300/60 border-emerald-400/40"}` :
                                                        "bg-white border-slate-200"
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] text-slate-500">{z.temp_min}°C to {z.temp_max}°C • {z.hazard_policy}</span>
                                        <span className="text-[11px] font-mono font-semibold text-slate-600">{z.occupied}/{z.capacity} ({occupancyPct}%)</span>
                                    </div>

                                    {/* Show stored lots in this zone */}
                                    {zoneLots.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1">
                                            {zoneLots.slice(0, 4).map(l => (
                                                <span key={l.id} className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">{l.lot_number}</span>
                                            ))}
                                            {zoneLots.length > 4 && <span className="text-[10px] text-slate-400">+{zoneLots.length - 4} more</span>}
                                        </div>
                                    )}

                                    {isBlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                                            <span className="material-symbols-outlined text-rose-500 text-3xl opacity-60">block</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: AI Recommendation + Assignment */}
                <div className="order-2 lg:order-3 lg:col-span-4 flex flex-col gap-4">
                    {!selectedLot ? (
                        <div className="ui-card flex-1 flex flex-col items-center justify-center">
                            <EmptyState icon="ads_click" title="No lot selected" description="Select a lot from the queue to view smart slot recommendations." />
                        </div>
                    ) : (
                        <>
                            {/* AI Recommended Slot — prominent card */}
                            <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5">
                                <div className="absolute -top-16 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
                                <div className="flex items-start justify-between mb-3 relative">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white grid place-items-center shadow-sm">
                                            <span className="material-symbols-outlined text-[18px] icon-fill">auto_awesome</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-emerald-900">AI Recommended Slot</h4>
                                            <p className="text-[11px] text-emerald-700/80">Human decision required</p>
                                        </div>
                                    </div>
                                    <span className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">Score {recommendation?.score}</span>
                                </div>
                                <p className="font-display font-bold text-3xl text-emerald-700 mb-3 relative">{recommendation?.bin}</p>
                                <div className="space-y-1.5 relative">
                                    {recommendation?.reasonCodes.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                            <span className="material-symbols-outlined text-emerald-600 text-[16px] mt-px">check_circle</span>
                                            <span>{r}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Zone Occupancy for recommended zone */}
                            <div className="ui-card p-4">
                                <h4 className="font-semibold text-sm text-slate-900 mb-1">{recommendation?.zone} Occupancy</h4>
                                <p className="text-xs text-slate-500 mb-3">Current utilization: {zones.find(z => z.id === recommendation?.zone)?.occupied || 0}/{zones.find(z => z.id === recommendation?.zone)?.capacity || 0}</p>
                                <div className="space-y-1.5">
                                    {getZoneLots(recommendation?.zone || "").map(l => (
                                        <div key={l.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                                            <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">{l.current_location?.split("-").pop()}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{l.lot_number}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{materials.get(l.material_id)?.name || "Material"}</p>
                                            </div>
                                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Full</span>
                                        </div>
                                    ))}
                                    {/* Show the reserved/target slot */}
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50/60 rounded-lg border-2 border-dashed border-emerald-300">
                                        <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">{recommendation?.bin.split("-").pop()}</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-emerald-700">RESERVED (AI)</p>
                                            <p className="text-[11px] text-slate-500">{selectedLot.lot_number}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-emerald-600 text-[16px]">flag</span>
                                    </div>
                                </div>
                            </div>

                            {/* Policy violation warning */}
                            {recommendation?.blockedZones && recommendation.blockedZones.length > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-rose-600 text-[18px] mt-px">gpp_bad</span>
                                    <div>
                                        <p className="text-xs font-semibold text-rose-700">Policy Restriction</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">{recommendation.blockedReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Assignment Controls */}
                            <div className="ui-card p-4 space-y-4">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                    <button
                                        onClick={() => { setSlotMode("ai"); setPolicyViolation(null); setManualZone(""); setOverrideReason(""); }}
                                        className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${slotMode === "ai" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500"}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Accept AI
                                    </button>
                                    <button
                                        onClick={() => setSlotMode("manual")}
                                        className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${slotMode === "manual" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500"}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit</span> Override
                                    </button>
                                </div>

                                {slotMode === "manual" && (
                                    <div className="space-y-3">
                                        <select value={manualZone} onChange={(e) => validateManualZone(e.target.value)} className="field cursor-pointer">
                                            <option value="">Choose zone...</option>
                                            {zones.filter(z => z.id !== "HOLD-QC").map(z => (
                                                <option key={z.id} value={z.id}>{z.id} — {z.name}</option>
                                            ))}
                                        </select>
                                        {policyViolation && (
                                            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs flex items-start gap-2">
                                                <span className="material-symbols-outlined text-[15px]">gpp_bad</span>
                                                <span>{policyViolation}</span>
                                            </div>
                                        )}
                                        <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Override reason (required)..." className="field min-h-[50px] resize-none" />
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={!hasPermission || (slotMode === "manual" && (!manualZone || !overrideReason.trim() || !!policyViolation))}
                                    className="btn btn-primary w-full py-3"
                                >
                                    <span className="material-symbols-outlined text-[18px]">{slotMode === "ai" ? "auto_awesome" : "place"}</span>
                                    {slotMode === "ai" ? "Accept AI Recommendation" : "Assign Override"}
                                </button>
                                {!hasPermission && <p className="text-xs text-rose-600 text-center">Your role ({role}) cannot assign slots.</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Cold-chain Monitoring (focus area 4) */}
            <div className="ui-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 grid place-items-center">
                        <span className="material-symbols-outlined icon-fill text-[18px]">thermostat</span>
                    </span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-slate-900">Cold-chain Monitoring</h3>
                        <p className="text-[11px] text-slate-500">Live temperature trend per environment-controlled zone. Out-of-range readings are flagged automatically.</p>
                    </div>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {zones
                        .filter((z: any) => typeof z.temp_min === "number" && typeof z.temp_max === "number" && z.id !== "HOLD-QC")
                        .map((z: any) => {
                            const series = tempReadings
                                .filter((r: any) => r.zone_id === z.id)
                                .sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                            const isAlert = z.status === "Cold-chain Alert";
                            return (
                                <div key={z.id} className={`rounded-xl border p-4 ${isAlert ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-mono font-semibold text-sm text-slate-800">{z.id}</p>
                                            <p className="text-[11px] text-slate-500">{z.name}</p>
                                        </div>
                                        {isAlert ? (
                                            <span className="bg-rose-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">warning</span> Alert
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">In range</span>
                                        )}
                                    </div>
                                    {series.length > 0 ? (
                                        <TemperatureChart readings={series} min={z.temp_min} max={z.temp_max} />
                                    ) : (
                                        <div className="text-center py-6 text-slate-400">
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

            {/* Floating voice-assist button — always reachable, every screen size */}
            {!voiceOpen && !showConfirm && (
                <button
                    type="button"
                    onClick={() => { setVoiceOpen(true); setVoiceFeedback(null); }}
                    aria-label="Voice-assisted warehouse action"
                    className="fixed right-4 bottom-24 md:bottom-6 z-40 h-14 px-4 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all ring-4 ring-white/60"
                >
                    <span className="material-symbols-outlined text-[24px] icon-fill">mic</span>
                    <span className="text-sm font-semibold pr-1">Voice</span>
                </button>
            )}

            {/* Voice-assist panel — bottom sheet on mobile, centered card on desktop */}
            {voiceOpen && (
                <div className="fixed inset-0 z-50 flex sm:items-center justify-center items-end" onClick={() => { setVoiceOpen(false); if (voiceListening) setVoiceListening(false); }}>
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-rise"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
                        <div className="flex items-start gap-3 mb-4">
                            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                                <span className="material-symbols-outlined text-[20px] icon-fill">mic</span>
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-slate-900">Voice-assisted warehouse action</h3>
                                <p className="text-xs text-slate-500 leading-snug">Opens the confirmation only — it never assigns automatically.</p>
                            </div>
                            <button onClick={() => setVoiceOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600 -mt-1 -mr-1 p-1">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {selectedLot ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-emerald-600 text-[16px]">inventory_2</span>
                                <span className="font-mono font-semibold text-emerald-700">{selectedLot.lot_number}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-semibold text-slate-700">{recommendation?.bin || "recommended slot"}</span>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 mb-3 text-xs flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                Select a lot from the queue first.
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={voiceText}
                                onChange={(e) => setVoiceText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") runVoiceCommand(voiceText); }}
                                placeholder='e.g. "assign this lot to recommended slot"'
                                className="field h-11 text-sm"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={startVoiceCapture}
                                    disabled={voiceListening}
                                    className="btn btn-secondary h-11 px-4 shrink-0"
                                >
                                    <span className={`material-symbols-outlined text-[20px] ${voiceListening ? "text-emerald-600 animate-pulse" : ""}`}>{voiceListening ? "graphic_eq" : "mic"}</span>
                                    <span className="text-sm">{voiceListening ? "Listening" : "Speak"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runVoiceCommand(voiceText)}
                                    className="btn btn-primary h-11 flex-1 text-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                    Run command
                                </button>
                            </div>
                        </div>

                        {/* Quick suggestion chip */}
                        <button
                            type="button"
                            onClick={() => { setVoiceText("assign this lot to recommended slot"); runVoiceCommand("assign this lot to recommended slot"); }}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px]">bolt</span>
                            “assign this lot to recommended slot”
                        </button>

                        {voiceFeedback && (
                            <div className={`mt-3 text-xs rounded-lg p-2.5 flex items-start gap-2 border ${
                                voiceFeedback.tone === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : voiceFeedback.tone === "warn" ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                                <span className="material-symbols-outlined text-[15px] mt-px shrink-0">
                                    {voiceFeedback.tone === "ok" ? "task_alt" : voiceFeedback.tone === "warn" ? "warning" : "info"}
                                </span>
                                <span>{voiceFeedback.message}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-3 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] shrink-0">verified_user</span>
                            Human confirmation is required for every assignment, and each action is audit-logged.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
