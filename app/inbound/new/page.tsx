"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canSubmitToQC, getActorName } from "@/lib/rbac";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { notifications } from "@mantine/notifications";

export default function InboundNewPage() {
    const router = useRouter();
    const { role } = useRole();
    const hasPermission = canSubmitToQC(role);

    // Form fields
    const [form, setForm] = useState({
        supplier_name: "",
        material_name: "",
        quantity: "",
        unit: "kg",
        batch_reference: "",
        arrival_date: new Date().toISOString().split("T")[0],
        temperature_requirement: "Ambient",
        hazard_class: "Normal",
    });

    // AI assist
    const [aiText, setAiText] = useState("");
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [aiConfidence, setAiConfidence] = useState<number | null>(null);

    // Validation
    const [validation, setValidation] = useState<{
        materialFound: boolean | null;
        supplierFound: boolean | null;
        materialMatch: string | null;
        supplierMatch: string | null;
    }>({ materialFound: null, supplierFound: null, materialMatch: null, supplierMatch: null });
    const [validating, setValidating] = useState(false);

    // Submit
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

    // ── AI Extraction ──────────────────────────────────────
    const handleAiExtract = async () => {
        if (!aiText.trim()) return;
        setExtracting(true);
        setAiResult(null);
        try {
            const res = await fetch("/api/ai/extract-manifest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: aiText }),
            });
            const data = await res.json();
            if (data.data) {
                setAiResult(data.data);
                setAiConfidence(data.data.confidence || 80);
            }
        } catch (err) {
            console.error("AI extraction failed", err);
            notifications.show({ title: "Extraction Failed", message: "Could not extract data. Please fill manually.", color: "red" });
        } finally {
            setExtracting(false);
        }
    };

    const handleApplyAi = () => {
        if (!aiResult) return;
        setForm({
            supplier_name: aiResult.supplier_name || "",
            material_name: aiResult.material_name || "",
            quantity: String(aiResult.quantity || ""),
            unit: aiResult.unit || "kg",
            batch_reference: aiResult.batch_reference || "",
            arrival_date: aiResult.arrival_date || new Date().toISOString().split("T")[0],
            temperature_requirement: aiResult.temperature_requirement || "Ambient",
            hazard_class: aiResult.hazard_class || "Normal",
        });
        setShowAiPanel(false);
        setAiResult(null);
        setAiText("");
        notifications.show({ title: "AI Applied ✓", message: "Fields filled from AI extraction. Please review before submitting.", color: "green", autoClose: 4000 });
        // Trigger validation
        validateMasterData(aiResult.material_name, aiResult.supplier_name);
    };

    // ── Validation against master data ─────────────────────
    const validateMasterData = async (matName?: string, supName?: string) => {
        const material = matName || form.material_name;
        const supplier = supName || form.supplier_name;
        if (!material && !supplier) return;
        setValidating(true);
        try {
            const [matRes, supRes] = await Promise.all([
                fetchItems<any>("materials"),
                fetchItems<any>("suppliers"),
            ]);
            let materialFound = false, supplierFound = false;
            let materialMatch: string | null = null, supplierMatch: string | null = null;

            if (material && matRes.data) {
                const m = material.toLowerCase();
                const match = matRes.data.find((x: any) => x.name?.toLowerCase().includes(m) || m.includes(x.name?.toLowerCase()));
                materialFound = !!match;
                materialMatch = match?.name || null;
            }
            if (supplier && supRes.data) {
                const s = supplier.toLowerCase();
                const match = supRes.data.find((x: any) => x.name?.toLowerCase().includes(s) || s.includes(x.name?.toLowerCase()));
                supplierFound = !!match;
                supplierMatch = match?.name || null;
            }
            setValidation({ materialFound, supplierFound, materialMatch, supplierMatch });
        } catch {
            setValidation({ materialFound: null, supplierFound: null, materialMatch: null, supplierMatch: null });
        } finally {
            setValidating(false);
        }
    };

    // ── Form validation ────────────────────────────────────
    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.supplier_name.trim()) e.supplier_name = "Supplier is required";
        if (!form.material_name.trim()) e.material_name = "Material is required";
        if (!form.quantity || Number(form.quantity) <= 0) e.quantity = "Valid quantity is required";
        if (!form.unit.trim()) e.unit = "Unit is required";
        if (!form.batch_reference.trim()) e.batch_reference = "Batch reference is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ─────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            let material_id: string | null = null;
            let supplier_id: string | null = null;
            try {
                const [matRes, supRes] = await Promise.all([fetchItems<any>("materials"), fetchItems<any>("suppliers")]);
                const matMatch = matRes.data.find((m: any) => m.name?.toLowerCase().includes(form.material_name.toLowerCase()) || form.material_name.toLowerCase().includes(m.name?.toLowerCase()));
                const supMatch = supRes.data.find((s: any) => s.name?.toLowerCase().includes(form.supplier_name.toLowerCase()) || form.supplier_name.toLowerCase().includes(s.name?.toLowerCase()));
                if (matMatch) material_id = matMatch.id;
                if (supMatch) supplier_id = supMatch.id;
            } catch {}

            const recId = `REC-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
            const created = await createItem<any>("inbound_receipts", {
                id: recId,
                receipt_no: recId,
                quantity: Number(form.quantity),
                unit: form.unit,
                batch_reference: form.batch_reference,
                temperature_requirement: form.temperature_requirement,
                hazard_class: form.hazard_class,
                status: "Pending QC",
                arrival_date: form.arrival_date,
                ...(material_id && { material_id }),
                ...(supplier_id && { supplier_id }),
            });

            const actor = getActorName(role);
            const entityRef = created?.data?.id || form.batch_reference;
            const source = aiConfidence ? "AI-Assisted" : "Manual Entry";
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor,
                role,
                action: "Created inbound receipt",
                entity: entityRef,
                change_detail: `${form.quantity} ${form.unit} of ${form.material_name} from ${form.supplier_name}. Source: ${source}. Status: → Pending QC.`,
            });

            notifications.show({ title: "Receipt Created ✓", message: `${form.batch_reference} submitted to QC queue.`, color: "green", autoClose: 5000 });
            setShowConfirm(false);
            router.push("/inbound");
        } catch (err) {
            console.error("Submit failed", err);
            notifications.show({ title: "Submit Failed", message: "Could not create receipt. Please try again.", color: "red" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl animate-fade-in">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push("/inbound")} className="w-9 h-9 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0" aria-label="Back to inbound">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <PageHeader
                    title="New Inbound Receipt"
                    subtitle="Register incoming raw materials. Use AI to auto-fill or enter manually."
                />
            </div>

            {/* AI Assist Panel */}
            <div className="ui-card overflow-hidden">
                <button
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-slate-50/70 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                        <span className="material-symbols-outlined icon-fill text-[20px]">auto_awesome</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-slate-900">AI Auto-Fill</h3>
                        <p className="text-xs text-slate-500">Paste supplier text/WhatsApp and let AI fill the form for you</p>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${showAiPanel ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {showAiPanel && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-rise">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="micro-label self-center">Try:</span>
                            <button type="button" onClick={() => setAiText("Supplier: Java Citrus Farm\nMaterial: Citrus Peel Extract\nQuantity: 12 drums\nBatch: JCF-CIT-0526\nStorage: -20°C to -4°C, Flammable")} className="px-3 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                                Citrus Extract (EN)
                            </button>
                            <button type="button" onClick={() => setAiText("tolong catat 400kg cengkeh dari Madura, tiba hari ini buat produksi minggu depan")} className="px-3 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                                Cengkeh WhatsApp (ID)
                            </button>
                        </div>
                        <textarea
                            className="field min-h-[100px] resize-none font-mono"
                            placeholder="Paste supplier message, email, or delivery note here..."
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleAiExtract}
                                disabled={!aiText.trim() || extracting}
                                className="btn btn-primary"
                            >
                                {extracting ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">auto_awesome</span>}
                                {extracting ? "Extracting..." : "Extract with AI"}
                            </button>
                            {aiResult && (
                                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                                    <div className="flex-1 bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold text-emerald-700">Extraction Complete</span>
                                            <span className="text-[11px] font-mono font-semibold text-emerald-700">{aiConfidence}% confidence</span>
                                        </div>
                                        <p className="text-xs text-slate-600">{aiResult.material_name} from {aiResult.supplier_name} — {aiResult.quantity} {aiResult.unit}</p>
                                    </div>
                                    <button
                                        onClick={handleApplyAi}
                                        className="btn btn-primary"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                        Apply
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Form */}
            <div className="ui-card p-6 sm:p-7">
                <div className="flex items-center gap-2 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    </span>
                    <h3 className="font-semibold text-base text-slate-900">Receipt Details</h3>
                    {aiConfidence && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[12px] icon-fill">auto_awesome</span>
                            AI-filled ({aiConfidence}%)
                        </span>
                    )}
                </div>

                {/* Validation badges */}
                {(validation.materialFound !== null || validation.supplierFound !== null) && (
                    <div className="space-y-2 mb-5">
                        {validation.materialFound === true && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                <span><span className="font-semibold">Material verified:</span> matched to <span className="font-semibold">{validation.materialMatch}</span></span>
                            </div>
                        )}
                        {validation.materialFound === false && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span><span className="font-semibold">Material not found</span> in master data — will be created as new entry</span>
                            </div>
                        )}
                        {validation.supplierFound === true && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                <span><span className="font-semibold">Supplier verified:</span> matched to <span className="font-semibold">{validation.supplierMatch}</span></span>
                            </div>
                        )}
                        {validation.supplierFound === false && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span><span className="font-semibold">Supplier not found</span> in master data — verify before proceeding</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier *</label>
                        <input
                            className={`field ${errors.supplier_name ? "!border-rose-400 focus:!ring-rose-100" : ""}`}
                            value={form.supplier_name}
                            onChange={e => updateField("supplier_name", e.target.value)}
                            onBlur={() => validateMasterData()}
                            placeholder="e.g. Java Citrus Farm"
                        />
                        {errors.supplier_name && <p className="text-xs text-rose-600 mt-1">{errors.supplier_name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Material *</label>
                        <input
                            className={`field ${errors.material_name ? "!border-rose-400 focus:!ring-rose-100" : ""}`}
                            value={form.material_name}
                            onChange={e => updateField("material_name", e.target.value)}
                            onBlur={() => validateMasterData()}
                            placeholder="e.g. Citrus Peel Extract"
                        />
                        {errors.material_name && <p className="text-xs text-rose-600 mt-1">{errors.material_name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity *</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className={`field flex-1 ${errors.quantity ? "!border-rose-400 focus:!ring-rose-100" : ""}`}
                                value={form.quantity}
                                onChange={e => updateField("quantity", e.target.value)}
                                placeholder="e.g. 400"
                            />
                            <select
                                className="field w-24 cursor-pointer"
                                value={form.unit}
                                onChange={e => updateField("unit", e.target.value)}
                            >
                                <option value="kg">kg</option>
                                <option value="L">L</option>
                                <option value="drums">drums</option>
                                <option value="pcs">pcs</option>
                            </select>
                        </div>
                        {errors.quantity && <p className="text-xs text-rose-600 mt-1">{errors.quantity}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch Reference *</label>
                        <input
                            className={`field font-mono ${errors.batch_reference ? "!border-rose-400 focus:!ring-rose-100" : ""}`}
                            value={form.batch_reference}
                            onChange={e => updateField("batch_reference", e.target.value)}
                            placeholder="e.g. JCF-CIT-0531"
                        />
                        {errors.batch_reference && <p className="text-xs text-rose-600 mt-1">{errors.batch_reference}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Arrival Date</label>
                        <input
                            type="date"
                            className="field"
                            value={form.arrival_date}
                            onChange={e => updateField("arrival_date", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temperature Requirement</label>
                        <select
                            className="field cursor-pointer"
                            value={form.temperature_requirement}
                            onChange={e => updateField("temperature_requirement", e.target.value)}
                        >
                            <option value="Ambient">Ambient (15–30°C)</option>
                            <option value="Chilled (2-8°C)">Chilled (2–8°C)</option>
                            <option value="-20°C to -4°C">Freezer (-20°C to -4°C)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hazard Class</label>
                        <select
                            className="field cursor-pointer"
                            value={form.hazard_class}
                            onChange={e => updateField("hazard_class", e.target.value)}
                        >
                            <option value="Normal">Normal</option>
                            <option value="Flammable">Flammable</option>
                            <option value="Oxidizer">Oxidizer</option>
                            <option value="Toxic">Toxic</option>
                        </select>
                    </div>
                </div>

                {/* Submit */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">info</span>
                        Receipt will be sent to QC queue for inspection.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => router.push("/inbound")}
                            className="btn btn-secondary flex-1 sm:flex-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { if (validate()) setShowConfirm(true); }}
                            disabled={submitting || !hasPermission}
                            className="btn btn-primary flex-1 sm:flex-none"
                        >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Submit to QC
                        </button>
                    </div>
                </div>
                {!hasPermission && (
                    <p className="text-xs text-rose-600 text-right mt-2">Your role ({role}) does not have permission to create receipts.</p>
                )}
            </div>

            <ConfirmModal
                isOpen={showConfirm}
                title="Submit to QC Station?"
                message={`This will register ${form.quantity} ${form.unit} of ${form.material_name} from ${form.supplier_name} and send it to the QC queue for inspection. This action will be audit-logged.`}
                confirmLabel="Submit to QC"
                onConfirm={handleSubmit}
                onCancel={() => setShowConfirm(false)}
                isLoading={submitting}
            />
        </div>
    );
}
