"use client";

import { useRef, useState } from "react";
import { analyseImageFile, referenceFor, type VisionQCResult } from "@/lib/visionQC";

interface Props {
    materialCategory?: string | null;
    materialName?: string;
    onResult?: (result: VisionQCResult) => void;
}

/**
 * Image-based visual QC capture + analysis panel.
 * Runs computer-vision colour/defect screening fully in the browser.
 */
export function VisualQCAnalyzer({ materialCategory, materialName, onResult }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [result, setResult] = useState<VisionQCResult | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reference = referenceFor(materialCategory);

    const handleFile = async (file: File) => {
        setAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            // Small artificial delay so the analysis reads as a deliberate AI step.
            const [{ result: res, dataUrl }] = await Promise.all([
                analyseImageFile(file, reference),
                new Promise((r) => setTimeout(r, 650)),
            ]) as [{ result: VisionQCResult; dataUrl: string }, unknown];
            setImageUrl(dataUrl);
            setResult(res);
            onResult?.(res);
        } catch (e) {
            console.error("Visual QC failed", e);
            setError("Could not analyse this image. Please try a different photo.");
        } finally {
            setAnalyzing(false);
        }
    };

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
    };

    const riskColor = (risk: string) =>
        risk === "Low" ? "text-emerald-600" : risk === "Medium" ? "text-amber-500" : "text-rose-600";

    const recColor = (rec: string) =>
        rec === "Pass" ? "bg-emerald-600 text-white"
            : rec === "Pass with human review" ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-700";

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                    <span className="material-symbols-outlined icon-fill text-[18px]">photo_camera</span>
                </span>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900">Visual QC — Computer Vision</h4>
                    <p className="text-[11px] text-slate-500">Capture or upload a sample photo for AI colour & defect screening.</p>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Preview / dropzone */}
                <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 min-h-[160px] flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="QC sample" className="max-h-56 w-full object-contain" />
                    ) : (
                        <div className="text-center text-slate-400 p-6">
                            <span className="material-symbols-outlined text-4xl opacity-60">add_photo_alternate</span>
                            <p className="text-xs mt-2">No sample image yet</p>
                        </div>
                    )}
                    {analyzing && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-emerald-600 text-3xl">progress_activity</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Analysing pixels…</span>
                        </div>
                    )}
                </div>

                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />

                <div className="flex gap-2">
                    <button
                        onClick={() => cameraRef.current?.click()}
                        disabled={analyzing}
                        className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">photo_camera</span> Capture
                    </button>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={analyzing}
                        className="flex-1 border border-slate-200 bg-white text-slate-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">upload</span> Upload
                    </button>
                </div>

                {error && <p className="text-xs text-rose-600">{error}</p>}

                {result && (
                    <div className="space-y-3 animate-rise">
                        {/* Recommendation + confidence */}
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full ${recColor(result.recommendation)}`}>
                                {result.recommendation}
                            </span>
                            <div className="text-right">
                                <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 block">AI Confidence</span>
                                <span className="font-mono font-bold text-emerald-700">{result.confidence}%</span>
                            </div>
                        </div>

                        {/* Colour swatches */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: result.average.hex }} />
                                <span className="text-[10px] font-mono text-slate-500">{result.average.hex}</span>
                            </div>
                            {reference && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">vs ref</span>
                                    <span className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: reference.hex }} />
                                    {result.colourDelta !== null && (
                                        <span className={`text-[10px] font-mono font-bold ${result.colourDelta < 30 ? "text-emerald-600" : "text-amber-600"}`}>Δ{result.colourDelta}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200">
                                <p className="text-[9px] uppercase tracking-wide font-semibold text-slate-400">Colour</p>
                                <p className="font-mono font-bold text-emerald-700 text-sm">{result.colourScore}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200">
                                <p className="text-[9px] uppercase tracking-wide font-semibold text-slate-400">Uniform</p>
                                <p className="font-mono font-bold text-slate-800 text-sm">{result.consistency}%</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200">
                                <p className="text-[9px] uppercase tracking-wide font-semibold text-slate-400">Defect</p>
                                <p className={`font-bold text-sm ${riskColor(result.defectRisk)}`}>{result.defectRisk}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200">
                                <p className="text-[9px] uppercase tracking-wide font-semibold text-slate-400">Foreign</p>
                                <p className={`font-bold text-sm ${riskColor(result.foreignMatterRisk)}`}>{result.foreignMatterRisk}</p>
                            </div>
                        </div>

                        {/* Reason codes */}
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="micro-label mb-2">Vision Reason Codes</p>
                            <ul className="space-y-1">
                                {result.reasonCodes.map((rc, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                                        <span className={`material-symbols-outlined text-[14px] mt-px ${rc.startsWith("⚠") ? "text-amber-500" : "text-emerald-600"}`}>
                                            {rc.startsWith("⚠") ? "warning" : "check_circle"}
                                        </span>
                                        <span>{rc.replace(/^⚠\s*/, "")}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            On-device computer-vision screening{materialName ? ` for ${materialName}` : ""}. AI assists the first inspection layer; final release stays human-approved.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
