"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchItems, createItem } from "@/lib/api/client";
import { useRole, canSubmitToQC, getActorName } from "@/lib/rbac";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
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

            const created = await createItem<any>("inbound_receipts", {
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
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h2 className="font-display font-bold text-3xl text-primary">New Inbound Receipt</h2>
                <p className="text-on-surface-variant mt-1">Register incoming raw materials. Use AI to auto-fill or enter manually.</p>
            </div>

            {/* AI Assist Panel */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">AI Auto-Fill</h3>
                        <p className="text-xs text-on-surface-variant">Paste supplier text/WhatsApp and let AI fill the form for you</p>
                    </div>
                    <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${showAiPanel ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {showAiPanel && (
                    <div className="p-4 border-t border-outline-variant bg-surface-container-lowest space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest self-center">Try:</span>
                            <button type="button" onClick={() => setAiText("Supplier: Java Citrus Farm\nMaterial: Citrus Peel Extract\nQuantity: 12 drums\nBatch: JCF-CIT-0526\nStorage: -20°C to -4°C, Flammable")} className="px-3 py-1 rounded-full border border-outline-variant text-xs hover:border-primary hover:text-primary transition-colors">
                                Citrus Extract (EN)
                            </button>
                            <button type="button" onClick={() => setAiText("tolong catat 400kg cengkeh dari Madura, tiba hari ini buat produksi minggu depan")} className="px-3 py-1 rounded-full border border-outline-variant text-xs hover:border-primary hover:text-primary transition-colors">
                                Cengkeh WhatsApp (ID)
                            </button>
                        </div>
                        <textarea
                            className="w-full min-h-[100px] bg-white border border-outline-variant rounded-lg resize-none focus:ring-1 focus:ring-primary p-3 text-sm font-mono"
                            placeholder="Paste supplier message, email, or delivery note here..."
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleAiExtract}
                                disabled={!aiText.trim() || extracting}
                                className="bg-secondary text-on-secondary font-bold py-2.5 px-5 rounded-sm text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {extracting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
                                {extracting ? "Extracting..." : "Extract with AI"}
                            </button>
                            {aiResult && (
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1 bg-secondary-container/30 p-3 rounded-lg border border-secondary/20">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-secondary">Extraction Complete</span>
                                            <span className="text-[10px] font-mono font-bold text-secondary">{aiConfidence}% confidence</span>
                                        </div>
                                        <p className="text-xs text-on-surface-variant">{aiResult.material_name} from {aiResult.supplier_name} — {aiResult.quantity} {aiResult.unit}</p>
                                    </div>
                                    <button
                                        onClick={handleApplyAi}
                                        className="bg-primary text-on-primary font-bold py-2.5 px-5 rounded-sm text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">check</span>
                                        Apply to Form
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">edit_note</span>
                    <h3 className="font-bold text-lg">Receipt Details</h3>
                    {aiConfidence && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest bg-secondary/10 text-secondary px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
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
                                <span><span className="font-bold">Material verified:</span> matched to <span className="font-bold">{validation.materialMatch}</span></span>
                            </div>
                        )}
                        {validation.materialFound === false && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span><span className="font-bold">Material not found</span> in master data — will be created as new entry</span>
                            </div>
                        )}
                        {validation.supplierFound === true && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                <span><span className="font-bold">Supplier verified:</span> matched to <span className="font-bold">{validation.supplierMatch}</span></span>
                            </div>
                        )}
                        {validation.supplierFound === false && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span><span className="font-bold">Supplier not found</span> in master data — verify before proceeding</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Supplier *</label>
                        <input
                            className={`w-full text-sm border rounded-lg p-3 focus:border-primary focus:ring-1 ${errors.supplier_name ? "border-error" : "border-outline-variant"}`}
                            value={form.supplier_name}
                            onChange={e => updateField("supplier_name", e.target.value)}
                            onBlur={() => validateMasterData()}
                            placeholder="e.g. Java Citrus Farm"
                        />
                        {errors.supplier_name && <p className="text-xs text-error mt-1">{errors.supplier_name}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Material *</label>
                        <input
                            className={`w-full text-sm border rounded-lg p-3 focus:border-primary focus:ring-1 ${errors.material_name ? "border-error" : "border-outline-variant"}`}
                            value={form.material_name}
                            onChange={e => updateField("material_name", e.target.value)}
                            onBlur={() => validateMasterData()}
                            placeholder="e.g. Citrus Peel Extract"
                        />
                        {errors.material_name && <p className="text-xs text-error mt-1">{errors.material_name}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Quantity *</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                className={`flex-1 text-sm border rounded-lg p-3 focus:border-primary focus:ring-1 ${errors.quantity ? "border-error" : "border-outline-variant"}`}
                                value={form.quantity}
                                onChange={e => updateField("quantity", e.target.value)}
                                placeholder="e.g. 400"
                            />
                            <select
                                className="w-24 text-sm border border-outline-variant rounded-lg p-3 focus:border-primary focus:ring-1"
                                value={form.unit}
                                onChange={e => updateField("unit", e.target.value)}
                            >
                                <option value="kg">kg</option>
                                <option value="L">L</option>
                                <option value="drums">drums</option>
                                <option value="pcs">pcs</option>
                            </select>
                        </div>
                        {errors.quantity && <p className="text-xs text-error mt-1">{errors.quantity}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Batch Reference *</label>
                        <input
                            className={`w-full text-sm font-mono border rounded-lg p-3 focus:border-primary focus:ring-1 ${errors.batch_reference ? "border-error" : "border-outline-variant"}`}
                            value={form.batch_reference}
                            onChange={e => updateField("batch_reference", e.target.value)}
                            placeholder="e.g. JCF-CIT-0531"
                        />
                        {errors.batch_reference && <p className="text-xs text-error mt-1">{errors.batch_reference}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Arrival Date</label>
                        <input
                            type="date"
                            className="w-full text-sm border border-outline-variant rounded-lg p-3 focus:border-primary focus:ring-1"
                            value={form.arrival_date}
                            onChange={e => updateField("arrival_date", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Temperature Requirement</label>
                        <select
                            className="w-full text-sm border border-outline-variant rounded-lg p-3 focus:border-primary focus:ring-1"
                            value={form.temperature_requirement}
                            onChange={e => updateField("temperature_requirement", e.target.value)}
                        >
                            <option value="Ambient">Ambient (15–30°C)</option>
                            <option value="Chilled (2-8°C)">Chilled (2–8°C)</option>
                            <option value="-20°C to -4°C">Freezer (-20°C to -4°C)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1.5">Hazard Class</label>
                        <select
                            className="w-full text-sm border border-outline-variant rounded-lg p-3 focus:border-primary focus:ring-1"
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
                <div className="mt-8 pt-6 border-t border-outline-variant flex items-center justify-between">
                    <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Receipt will be sent to QC queue for inspection.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push("/inbound")}
                            className="border border-outline-variant bg-white font-bold py-3 px-6 rounded-sm text-xs uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { if (validate()) setShowConfirm(true); }}
                            disabled={submitting || !hasPermission}
                            className={`font-bold py-3 px-6 rounded-sm text-xs uppercase tracking-widest transition-all flex items-center gap-2
                                ${hasPermission ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">send</span>
                            Submit to QC
                        </button>
                    </div>
                </div>
                {!hasPermission && (
                    <p className="text-xs text-error text-right mt-2">Your role ({role}) does not have permission to create receipts.</p>
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
