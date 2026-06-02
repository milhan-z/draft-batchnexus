"use client";
import React, { useId } from "react";

/* ════════════════════════════════════════════════════════════
   Lightweight, dependency-free SVG charts & visual primitives.
   Tuned to the BatchNexus slate/emerald design language.
   ════════════════════════════════════════════════════════════ */

/* ── Progress bar ──────────────────────────────────────────── */
export const Progress: React.FC<{
    value: number;          // 0-100
    className?: string;
    color?: string;         // tailwind bg-* class for the fill
    track?: string;         // tailwind bg-* class for the track
}> = ({ value, className = "h-1.5", color = "bg-emerald-500", track = "bg-slate-100" }) => (
    <div className={`w-full rounded-full overflow-hidden ${track} ${className}`}>
        <div
            className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
    </div>
);

/* ── Radial / donut gauge ──────────────────────────────────── */
export const RadialGauge: React.FC<{
    value: number;          // 0-100
    size?: number;
    stroke?: number;
    color?: string;         // stroke color
    trackColor?: string;
    label?: React.ReactNode;
    sublabel?: string;
}> = ({ value, size = 120, stroke = 10, color = "#059669", trackColor = "#e2e8f0", label, sublabel }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, value));
    const offset = c - (pct / 100) * c;
    return (
        <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                    {label ?? <span className="text-xl font-semibold text-slate-900 tabular-nums">{Math.round(pct)}%</span>}
                    {sublabel && <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{sublabel}</div>}
                </div>
            </div>
        </div>
    );
};

/* ── Area / line chart (multi-series) ──────────────────────── */
interface SeriesPoint { [key: string]: number | string; }
interface SeriesDef { key: string; color: string; }

export const AreaChart: React.FC<{
    data: SeriesPoint[];
    series: SeriesDef[];
    xKey: string;
    height?: number;
    showGrid?: boolean;
}> = ({ data, series, xKey, height = 220, showGrid = true }) => {
    const gid = useId().replace(/:/g, "");
    const w = 600;
    const h = height;
    const padX = 12;
    const padTop = 12;
    const padBottom = 26;

    const allVals = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
    const maxV = Math.max(...allVals, 1);
    const minV = 0;
    const span = maxV - minV || 1;

    const x = (i: number) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2);
    const y = (v: number) => padTop + (1 - (v - minV) / span) * (h - padTop - padBottom);

    const gridLines = 4;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }} preserveAspectRatio="none">
            <defs>
                {series.map(s => (
                    <linearGradient key={s.key} id={`area-${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                ))}
            </defs>

            {showGrid && Array.from({ length: gridLines + 1 }).map((_, i) => {
                const gy = padTop + (i / gridLines) * (h - padTop - padBottom);
                return <line key={i} x1={padX} y1={gy} x2={w - padX} y2={gy} stroke="#eef2f6" strokeWidth={1} />;
            })}

            {series.map(s => {
                const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(Number(d[s.key]) || 0).toFixed(1)}`).join(" ");
                const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
                return (
                    <g key={s.key}>
                        <path d={areaPath} fill={`url(#area-${gid}-${s.key})`} />
                        <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                        {data.map((d, i) => (
                            <circle key={i} cx={x(i)} cy={y(Number(d[s.key]) || 0)} r={2.5} fill="#fff" stroke={s.color} strokeWidth={1.5} />
                        ))}
                    </g>
                );
            })}

            {data.map((d, i) => (
                <text key={i} x={x(i)} y={h - 8} fontSize={10} fill="#94a3b8" textAnchor="middle">{String(d[xKey])}</text>
            ))}
        </svg>
    );
};

/* ── Mini bar chart ────────────────────────────────────────── */
export const MiniBars: React.FC<{
    data: { label: string; values: { value: number; color: string }[] }[];
    height?: number;
    animate?: boolean;
}> = ({ data, height = 160, animate = true }) => {
    const max = Math.max(...data.flatMap(d => d.values.map(v => v.value)), 1);
    return (
        <div className="flex items-end gap-3 sm:gap-5 w-full" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1 flex-1">
                        {d.values.map((v, j) => (
                            <div
                                key={j}
                                className={`w-1/2 max-w-[18px] rounded-t-md ${v.color} transition-all duration-700 ease-out group-hover:opacity-80`}
                                style={{ height: animate ? `${(v.value / max) * 100}%` : "0%" }}
                                title={`${v.value}`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

/* ── Sparkline ─────────────────────────────────────────────── */
export const Sparkline: React.FC<{
    values: number[];
    color?: string;
    width?: number;
    height?: number;
    fill?: boolean;
}> = ({ values, color = "#059669", width = 100, height = 32, fill = true }) => {
    const gid = useId().replace(/:/g, "");
    if (!values.length) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    const x = (i: number) => (i / (values.length - 1 || 1)) * width;
    const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
    const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return (
        <svg width={width} height={height} className="overflow-visible">
            {fill && (
                <>
                    <defs>
                        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <path d={area} fill={`url(#spark-${gid})`} />
                </>
            )}
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
};
