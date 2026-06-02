"use client";

interface Reading {
    recorded_at: string;
    temperature_c: number;
}

interface Props {
    readings: Reading[];
    min: number;          // safe range lower bound
    max: number;          // safe range upper bound
    height?: number;
    label?: string;
}

/**
 * Lightweight inline SVG line chart for a cold-chain temperature series.
 * Shades the safe range band and flags out-of-range points in red.
 */
export function TemperatureChart({ readings, min, max, height = 120, label }: Props) {
    if (!readings || readings.length === 0) {
        return <p className="text-xs text-slate-500">No temperature readings.</p>;
    }

    const w = 320;
    const h = height;
    const padX = 8;
    const padY = 12;

    const temps = readings.map(r => r.temperature_c);
    const dataMin = Math.min(...temps, min);
    const dataMax = Math.max(...temps, max);
    const span = dataMax - dataMin || 1;

    const x = (i: number) => padX + (i / (readings.length - 1 || 1)) * (w - padX * 2);
    const y = (v: number) => padY + (1 - (v - dataMin) / span) * (h - padY * 2);

    const linePath = readings
        .map((r, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(r.temperature_c).toFixed(1)}`)
        .join(" ");

    // Safe-range band rectangle.
    const bandTop = y(max);
    const bandBottom = y(min);

    const last = readings[readings.length - 1];
    const lastOut = last.temperature_c < min || last.temperature_c > max;

    return (
        <div>
            {label && <p className="micro-label mb-2">{label}</p>}
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
                {/* Safe range band */}
                <rect
                    x={padX}
                    y={Math.min(bandTop, bandBottom)}
                    width={w - padX * 2}
                    height={Math.abs(bandBottom - bandTop)}
                    fill="rgba(34,197,94,0.10)"
                    stroke="rgba(34,197,94,0.35)"
                    strokeDasharray="3 3"
                />
                {/* Range labels */}
                <text x={padX} y={bandTop - 2} fontSize="8" fill="#16a34a">max {max}°C</text>
                <text x={padX} y={bandBottom + 9} fontSize="8" fill="#16a34a">min {min}°C</text>

                {/* Line */}
                <path d={linePath} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                {/* Points */}
                {readings.map((r, i) => {
                    const out = r.temperature_c < min || r.temperature_c > max;
                    return (
                        <circle
                            key={i}
                            cx={x(i)}
                            cy={y(r.temperature_c)}
                            r={out ? 3.5 : 2.5}
                            fill={out ? "#dc2626" : "#0f766e"}
                        />
                    );
                })}
            </svg>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-500">{readings.length} readings</span>
                <span className={`text-[11px] font-mono font-bold ${lastOut ? "text-rose-600" : "text-emerald-600"}`}>
                    Current {last.temperature_c}°C {lastOut ? "⚠ out of range" : "✓ in range"}
                </span>
            </div>
        </div>
    );
}
