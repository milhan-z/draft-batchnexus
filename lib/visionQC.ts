// ─────────────────────────────────────────────────────────────────────────────
// BatchNexus — In-Browser Visual QC Engine
//
// Computer-vision screening for incoming raw materials (focus area 2) and
// extract/powder QC (focus area 3) that runs entirely in the browser via the
// Canvas API — no model server or API key required, so it works reliably during
// a live demo and offline.
//
// It analyses a captured/uploaded image for:
//   • dominant colour + average RGB/HSL
//   • brightness and colour-uniformity (consistency)
//   • dark-spot ratio (defect proxy)
//   • foreign-matter proxy (high-contrast outlier pixels)
// then compares against an optional reference/"golden sample" colour profile to
// produce a colour-delta (ΔE-style) score.
//
// Output is positioned as an AI *screening suggestion* with confidence and
// reason codes — the final release decision always stays with QC staff.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColourProfile {
    r: number;
    g: number;
    b: number;
    hex: string;
}

export interface VisionQCResult {
    colourScore: number;        // 0-100 overall colour quality
    defectRisk: "Low" | "Medium" | "High";
    foreignMatterRisk: "Low" | "Medium" | "High";
    consistency: number;        // 0-100 colour uniformity
    brightness: number;         // 0-255 average luminance
    darkSpotRatio: number;      // 0-1 fraction of unusually dark pixels
    dominant: ColourProfile;
    average: ColourProfile;
    colourDelta: number | null; // distance from reference (null if no reference)
    recommendation: "Pass" | "Pass with human review" | "Block Material";
    confidence: number;         // 0-100
    reasonCodes: string[];
    sampledPixels: number;
}

function toHex(r: number, g: number, b: number): string {
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Analyse an already-loaded HTMLImageElement (or canvas-drawable source).
 * Optionally compare against a reference colour profile (golden sample).
 */
export function analyseImage(
    img: HTMLImageElement,
    reference?: ColourProfile | null,
): VisionQCResult {
    // Downscale for speed; quality is unaffected for colour statistics.
    const maxDim = 160;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const total = w * h;

    let sumR = 0, sumG = 0, sumB = 0, sumLum = 0;
    let sumLum2 = 0; // for variance
    const lums: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumR += r; sumG += g; sumB += b; sumLum += lum; sumLum2 += lum * lum;
        lums.push(lum);
    }

    const avgR = sumR / total, avgG = sumG / total, avgB = sumB / total;
    const avgLum = sumLum / total;
    const variance = sumLum2 / total - avgLum * avgLum;
    const stdDev = Math.sqrt(Math.max(0, variance));

    // Consistency: lower luminance std-dev → more uniform colour/texture.
    // Map std-dev (0..~80) to a 0-100 consistency score.
    const consistency = clamp(100 - (stdDev / 80) * 100, 0, 100);

    // Dark-spot ratio: pixels markedly darker than the mean = potential defects.
    const darkThreshold = avgLum - Math.max(35, stdDev * 1.4);
    let darkCount = 0;
    let outlierCount = 0;
    for (let k = 0; k < lums.length; k++) {
        if (lums[k] < darkThreshold) darkCount++;
        // Foreign-matter proxy: pixels far from the mean in either direction.
        if (Math.abs(lums[k] - avgLum) > Math.max(70, stdDev * 2.5)) outlierCount++;
    }
    const darkSpotRatio = darkCount / total;
    const outlierRatio = outlierCount / total;

    // Dominant colour via coarse RGB bucketing (4 levels per channel).
    const buckets = new Map<number, { c: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = (r >> 6) * 16 + (g >> 6) * 4 + (b >> 6);
        const cur = buckets.get(key) || { c: 0, r: 0, g: 0, b: 0 };
        cur.c++; cur.r += r; cur.g += g; cur.b += b;
        buckets.set(key, cur);
    }
    let best = { c: 0, r: avgR, g: avgG, b: avgB };
    buckets.forEach((v) => { if (v.c > best.c) best = v; });
    const domR = best.r / best.c, domG = best.g / best.c, domB = best.b / best.c;

    const average: ColourProfile = { r: avgR, g: avgG, b: avgB, hex: toHex(avgR, avgG, avgB) };
    const dominant: ColourProfile = { r: domR, g: domG, b: domB, hex: toHex(domR, domG, domB) };

    // Colour delta vs reference (Euclidean RGB distance, max ~441).
    let colourDelta: number | null = null;
    if (reference) {
        colourDelta = Math.sqrt(
            (avgR - reference.r) ** 2 + (avgG - reference.g) ** 2 + (avgB - reference.b) ** 2,
        );
    }

    // ── Scoring ──────────────────────────────────────────────
    const reasonCodes: string[] = [];

    // Base colour score from consistency, then penalise defects & deviation.
    let colourScore = consistency * 0.6 + 40; // 40..100 baseline from uniformity
    colourScore -= darkSpotRatio * 220;        // dark spots hurt
    colourScore -= outlierRatio * 260;         // foreign matter hurts more

    if (colourDelta !== null) {
        // Penalise up to ~30 points as colour drifts from the golden sample.
        colourScore -= clamp((colourDelta / 90) * 30, 0, 35);
    }

    // Very dark or very bright images are suspicious for liquids/powders.
    if (avgLum < 40) { colourScore -= 8; reasonCodes.push("⚠ Sample appears very dark — verify lighting and material"); }
    if (avgLum > 225) { colourScore -= 6; reasonCodes.push("⚠ Sample appears overexposed — recapture recommended"); }

    colourScore = clamp(Math.round(colourScore), 0, 100);

    // Risk levels.
    const defectRisk: VisionQCResult["defectRisk"] =
        darkSpotRatio > 0.06 ? "High" : darkSpotRatio > 0.02 ? "Medium" : "Low";
    const foreignMatterRisk: VisionQCResult["foreignMatterRisk"] =
        outlierRatio > 0.03 ? "High" : outlierRatio > 0.012 ? "Medium" : "Low";

    // Reason codes (positive + flags).
    if (consistency >= 75) reasonCodes.unshift("Colour and texture appear uniform");
    else if (consistency >= 55) reasonCodes.unshift("Minor colour variation detected");
    else reasonCodes.unshift("⚠ Significant colour/texture variation");

    if (defectRisk === "Low") reasonCodes.push("No significant dark spots detected");
    else reasonCodes.push(`⚠ Dark-spot ratio ${(darkSpotRatio * 100).toFixed(1)}% suggests possible defects`);

    if (foreignMatterRisk === "Low") reasonCodes.push("No foreign-matter outliers detected");
    else reasonCodes.push(`⚠ ${(outlierRatio * 100).toFixed(1)}% high-contrast pixels — check for foreign matter`);

    if (colourDelta !== null) {
        reasonCodes.push(
            colourDelta < 30
                ? `Colour matches reference (Δ${colourDelta.toFixed(0)})`
                : `⚠ Colour deviates from reference (Δ${colourDelta.toFixed(0)})`,
        );
    }

    // Recommendation.
    let recommendation: VisionQCResult["recommendation"];
    if (colourScore >= 85 && defectRisk === "Low" && foreignMatterRisk === "Low") {
        recommendation = "Pass";
    } else if (colourScore >= 62 && defectRisk !== "High" && foreignMatterRisk !== "High") {
        recommendation = "Pass with human review";
    } else {
        recommendation = "Block Material";
    }

    // Confidence: higher when the image is well-exposed and the signal is clean.
    let confidence = 70 + consistency * 0.18; // 70..88
    if (avgLum < 40 || avgLum > 225) confidence -= 12;
    if (total < 2000) confidence -= 10; // very small image
    confidence = clamp(Math.round(confidence), 55, 96);

    return {
        colourScore,
        defectRisk,
        foreignMatterRisk,
        consistency: Math.round(consistency),
        brightness: Math.round(avgLum),
        darkSpotRatio,
        dominant,
        average,
        colourDelta: colourDelta === null ? null : Math.round(colourDelta),
        recommendation,
        confidence,
        reasonCodes,
        sampledPixels: total,
    };
}

/** Load an image from a File/Blob and analyse it. */
export function analyseImageFile(
    file: File | Blob,
    reference?: ColourProfile | null,
): Promise<{ result: VisionQCResult; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
                try {
                    resolve({ result: analyseImage(img, reference), dataUrl });
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = reject;
            img.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Reference "golden sample" colour profiles per material category. */
export const REFERENCE_PROFILES: Record<string, ColourProfile> = {
    "Extract Liquid": { r: 196, g: 150, b: 70, hex: "#c49646" },   // amber
    "Essential Oil": { r: 222, g: 208, b: 150, hex: "#ded096" },   // pale gold
    "Oleoresin": { r: 120, g: 78, b: 38, hex: "#784e26" },         // dark brown
    "Powder": { r: 170, g: 120, b: 80, hex: "#aa7850" },           // tan
};

export function referenceFor(category?: string | null): ColourProfile | null {
    if (!category) return null;
    return REFERENCE_PROFILES[category] || null;
}
