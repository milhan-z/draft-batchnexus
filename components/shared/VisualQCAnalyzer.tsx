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
        risk === "Low" ? "text-secondary" : risk === "Medium" ? "text-amber-500" : "text-error";

    const recColor = (rec: string) =>
        rec === "Pass" ? "bg-primary text-on-primary"
            : rec === "Pass with human review" ? "bg-amber-100 text-amber-800"
                : "bg-error-container text-on-error-container";

    return (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
                <span className="material-symbols-outlined text-primary icon-fill">photo_camera</span>
                <div className="flex-1">
                    <h4 className="font-bold text-sm">Visual QC — Computer Vision</h4>
                    <p className="text-[11px] text-on-surface-variant">Capture or upload a sample photo for AI colour & defect screening.</p>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Preview / dropzone */}
                <div className="relative rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest min-h-[160px] flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="QC sample" className="max-h-56 w-full object-contain" />
                    ) : (
                        <div className="text-center text-on-surface-variant p-6">
                            <span className="material-symbols-outlined text-4xl opacity-50">image</span>
                            <p className="text-xs mt-2">No sample image yet</p>
                        </div>
                    )}
                    {analyzing && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Analysing pixels…</span>
                        </div>
                    )}
                </div>

                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />

                <div className="flex gap-2">
                    <button
                        onClick={() => cameraRef.current?.click()}
                        disabled={analyzing}
                        className="flex-1 bg-secondary text-on-secondary font-bold py-2.5 rounded-sm text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span> Capture
                    </button>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={analyzing}
                        className="flex-1 border border-outline-variant bg-white font-bold py-2.5 rounded-sm text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">upload</span> Upload
                    </button>
                </div>

                {error && <p className="text-xs text-error">{error}</p>}

                {result && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Recommendation + confidence */}
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${recColor(result.recommendation)}`}>
                                {result.recommendation}
                            </span>
                            <div className="text-right">
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 block">AI Confidence</span>
                                <span className="font-mono font-bold text-primary">{result.confidence}%</span>
                            </div>
                        </div>

                        {/* Colour swatches */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded border border-outline-variant" style={{ backgroundColor: result.average.hex }} />
                                <span className="text-[10px] font-mono">{result.average.hex}</span>
                            </div>
                            {reference && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">vs ref</span>
                                    <span className="w-6 h-6 rounded border border-outline-variant" style={{ backgroundColor: reference.hex }} />
                                    {result.colourDelta !== null && (
                                        <span className={`text-[10px] font-mono font-bold ${result.colourDelta < 30 ? "text-secondary" : "text-amber-600"}`}>Δ{result.colourDelta}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-surface-container-low p-2 rounded text-center border border-outline-variant">
                                <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Colour</p>
                                <p className="font-mono font-bold text-primary text-sm">{result.colourScore}</p>
                            </div>
                            <div className="bg-surface-container-low p-2 rounded text-center border border-outline-variant">
                                <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Uniform</p>
                                <p className="font-mono font-bold text-sm">{result.consistency}%</p>
                            </div>
                            <div className="bg-surface-container-low p-2 rounded text-center border border-outline-variant">
                                <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Defect</p>
                                <p className={`font-bold text-sm ${riskColor(result.defectRisk)}`}>{result.defectRisk}</p>
                            </div>
                            <div className="bg-surface-container-low p-2 rounded text-center border border-outline-variant">
                                <p className="text-[9px] uppercase tracking-widest font-bold opacity-70">Foreign</p>
                                <p className={`font-bold text-sm ${riskColor(result.foreignMatterRisk)}`}>{result.foreignMatterRisk}</p>
                            </div>
                        </div>

                        {/* Reason codes */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">Vision Reason Codes</p>
                            <ul className="space-y-1">
                                {result.reasonCodes.map((rc, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                                        <span className={`material-symbols-outlined text-[13px] mt-0.5 ${rc.startsWith("⚠") ? "text-amber-500" : "text-secondary"}`}>
                                            {rc.startsWith("⚠") ? "warning" : "check_circle"}
                                        </span>
                                        <span>{rc.replace(/^⚠\s*/, "")}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-[10px] text-on-surface-variant flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[13px]">info</span>
                            On-device computer-vision screening{materialName ? ` for ${materialName}` : ""}. AI assists the first inspection layer; final release stays human-approved.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
