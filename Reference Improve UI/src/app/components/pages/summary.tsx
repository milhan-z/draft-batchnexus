import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Sparkles, Download, RefreshCw, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { kpiTrend } from "../mock-data";

const highlights = [
  { label: "Lots released", value: 24, change: "+12%", up: true },
  { label: "QC pass rate", value: "94%", change: "+3pp", up: true },
  { label: "Cold-chain events", value: 1, change: "-2", up: true },
  { label: "Avg intake → release", value: "2.1h", change: "-18%", up: true },
];

export function SummaryPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>AI Operations Summary</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Tuesday, June 2, 2026 · Generated 2 min ago from live records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700"><Download className="w-4 h-4 mr-1.5" /> Export PDF</Button>
        </div>
      </div>

      <Card className="p-6 gap-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 grid place-items-center ring-1 ring-emerald-400/30">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <div style={{ fontWeight: 600 }}>Manager brief</div>
        </div>
        <p className="text-slate-200 leading-relaxed relative">
          Operations ran steady today with <span className="text-emerald-300" style={{ fontWeight: 600 }}>24 lots released</span> against
          12 inbound intakes — a healthy net inventory build. QC pass rate climbed to{" "}
          <span className="text-emerald-300" style={{ fontWeight: 600 }}>94%</span>, driven by Java Spice Co. and Provence Fields
          consistently scoring above golden samples. One cold-chain excursion in Zone <span className="font-mono text-amber-300">Z-A2</span>{" "}
          was caught early and resolved within 4 minutes; no lots impacted.
        </p>
        <p className="text-slate-300 leading-relaxed relative">
          <span style={{ fontWeight: 600 }}>Watch tomorrow:</span> Aurora Beauty export window closes Friday — recommend prioritizing{" "}
          <span className="font-mono text-emerald-300">LOT-2026-0142</span> for slot-to-dock handoff. Verdant Wellness courier
          confirmation still pending; escalate by 14:00.
        </p>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {highlights.map(h => (
          <Card key={h.label} className="p-4 gap-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider">{h.label}</div>
            <div className="flex items-end justify-between mt-1">
              <div className="text-2xl text-slate-900 tabular-nums" style={{ fontWeight: 600 }}>{h.value}</div>
              <div className={`text-xs flex items-center ${h.up ? "text-emerald-600" : "text-rose-600"}`}>
                {h.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {h.change}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-slate-900" style={{ fontWeight: 600 }}>14-day operations rhythm</h3>
            <p className="text-xs text-slate-500">Inbound vs released — bar comparison</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" />Released</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-sky-400" />Inbound</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={kpiTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="inbound" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="released" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
