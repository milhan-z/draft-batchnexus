import React from "react";

interface AIRecommendationCardProps {
    title: string;
    recommendation: string;
    confidence: number;
    reasonCodes: string[];
    humanReviewNote?: string;
    icon?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
    title,
    recommendation,
    confidence,
    reasonCodes,
    humanReviewNote,
    icon = "smart_toy"
}) => {
    // Confidence ring color
    const confColor = confidence >= 85 ? "text-emerald-600" : confidence >= 70 ? "text-amber-600" : "text-rose-600";

    return (
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5">
            <div className="absolute -top-16 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white grid place-items-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px] icon-fill">{icon}</span>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-emerald-900">{title}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-[12px] text-amber-600">person</span>
                            <p className="text-[11px] text-emerald-700/80">Human decision required</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wide">Score</span>
                    <span className={`font-mono font-bold text-2xl ${confColor}`}>{confidence}</span>
                </div>
            </div>

            <div className="mb-4 relative z-10">
                <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Recommendation</p>
                <p className="font-semibold text-lg text-slate-900">{recommendation}</p>
            </div>

            {reasonCodes.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-100 mb-4 relative z-10 space-y-2.5">
                    {reasonCodes.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check_circle</span>
                            {reason}
                        </div>
                    ))}
                </div>
            )}

            {humanReviewNote && (
                <div className="flex items-start gap-2 text-[11px] text-emerald-800 relative z-10 mt-3 pt-3 border-t border-emerald-200/60">
                    <span className="material-symbols-outlined text-[14px] mt-px">info</span>
                    <p className="leading-relaxed">{humanReviewNote}</p>
                </div>
            )}
        </div>
    );
};
