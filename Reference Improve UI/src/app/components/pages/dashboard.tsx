import { Link } from "react-router";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { StatusPill } from "../status-pill";
import {
  Truck, FlaskConical, CheckCircle2, AlertTriangle, Send,
  ArrowUpRight, ArrowRight, Sparkles, Thermometer, TrendingUp,
} from "lucide-react";
import { lots, auditEvents, zones, kpiTrend } from "../mock-data";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const kpis = [
  { label: "Inbound today", value: 12, sub: "Shipments registered", icon: Truck, tone: "slate" },
  { label: "Pending QC", value: 3, sub: "Awaiting inspection", icon: FlaskConical, tone: "violet" },
  { label: "Released lots", value: 24, sub: "Last 24h", icon: CheckCircle2, tone: "emerald", trend: "+12%" },
  { label: "Alerts", value: 1, sub: "Cold-chain variance", icon: AlertTriangle, tone: "amber", urgent: true },
  { label: "Samples pending", value: 5, sub: "Dispatch queue", icon: Send, tone: "sky" },
];

const toneMap: Record<string, { bg: string; fg: string; ring: string }> = {
  slate: { bg: "bg-slate-100", fg: "text-slate-700", ring: "ring-slate-200" },
  violet: { bg: "bg-violet-100", fg: "text-violet-700", ring: "ring-violet-200" },
  emerald: { bg: "bg-emerald-100", fg: "text-emerald-700", ring: "ring-emerald-200" },
  amber: { bg: "bg-amber-100", fg: "text-amber-700", ring: "ring-amber-200" },
  sky: { bg: "bg-sky-100", fg: "text-sky-700", ring: "ring-sky-200" },
};

export function DashboardPage() {
  const coldAlert = zones.find(z => z.status === "Cold-chain Alert");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Operations Control Tower</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time visibility from supplier intake to sample dispatch.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/inbound"><Truck className="w-4 h-4 mr-1.5" /> New intake</Link>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/qc"><FlaskConical className="w-4 h-4 mr-1.5" /> QC Queue</Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(k => {
          const t = toneMap[k.tone];
          return (
            <Card key={k.label} className={`p-4 gap-3 border-slate-200 ${k.urgent ? "ring-2 ring-amber-200" : ""}`}>
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg grid place-items-center ${t.bg}`}>
                  <k.icon className={`w-4 h-4 ${t.fg}`} />
                </div>
                {k.trend && <span className="text-[11px] text-emerald-600 inline-flex items-center"><ArrowUpRight className="w-3 h-3" />{k.trend}</span>}
                {k.urgent && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <div>
                <div className="text-3xl text-slate-900 tabular-nums" style={{ fontWeight: 600 }}>{k.value}</div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-1">{k.label}</div>
                <div className="text-xs text-slate-600 mt-1">{k.sub}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {coldAlert && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500 text-white grid place-items-center shrink-0">
            <Thermometer className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-amber-900" style={{ fontWeight: 600 }}>Cold-chain deviation detected</span>
              <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
            </div>
            <p className="text-sm text-amber-800">
              Zone <span className="font-mono" style={{ fontWeight: 600 }}>{coldAlert.id}</span> recorded{" "}
              <span style={{ fontWeight: 600 }}>{coldAlert.temp}°C</span>, outside the {coldAlert.min}°C to {coldAlert.max}°C range.
            </p>
          </div>
          <Button asChild variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
            <Link to="/warehouse">Inspect <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <Card className="lg:col-span-2 min-w-0 p-5 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-slate-900" style={{ fontWeight: 600 }}>Throughput · last 14 days</h3>
              <p className="text-xs text-slate-500">Inbound vs released lots</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Released</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" />Inbound</span>
            </div>
          </div>
          <div className="w-full min-w-0" style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={200} debounce={50}>
              <AreaChart data={kpiTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs key="defs">
                  <linearGradient key="g1" id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop key="g1-0" offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop key="g1-1" offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient key="g2" id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop key="g2-0" offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop key="g2-1" offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis key="x" dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis key="y" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip key="tip" contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area key="released" name="Released" type="monotone" dataKey="released" stroke="#10b981" strokeWidth={2} fill="url(#g1)" />
                <Area key="inbound" name="Inbound" type="monotone" dataKey="inbound" stroke="#38bdf8" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Insight */}
        <Card className="p-5 gap-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 relative">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 backdrop-blur grid place-items-center ring-1 ring-emerald-400/30">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>AI Insight</div>
              <div className="text-[11px] text-slate-300">Human approval required</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-200 relative">
            <span className="text-emerald-300">"LOT-2026-0142"</span> should be prioritized for dispatch to meet
            the <span style={{ fontWeight: 500 }}>Aurora Beauty</span> export schedule on Friday.
          </p>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 relative">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Sources analyzed</div>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-emerald-300">LOT-2026-0142 · QC Released</div>
              <div className="text-sky-300">DSP-0521 · Export · ETA Friday</div>
              <div className="text-amber-300">Z-A1 cold-chain stable</div>
            </div>
          </div>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 mt-auto">
            <Link to="/copilot">Ask Copilot <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent lots */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-slate-900" style={{ fontWeight: 600 }}>Recent lot activity</h3>
              <p className="text-xs text-slate-500">Live from your operational stream</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lots">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50/60">
                <th className="text-left px-4 py-2.5">Lot</th>
                <th className="text-left px-4 py-2.5">Material</th>
                <th className="text-left px-4 py-2.5 hidden sm:table-cell">Qty</th>
                <th className="text-right px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {lots.slice(0, 5).map(l => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{l.lot_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900">{l.material}</div>
                    <div className="text-[11px] text-slate-500">{l.supplier}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell tabular-nums">{l.qty}</td>
                  <td className="px-4 py-3 text-right"><StatusPill status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Audit feed */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-slate-900" style={{ fontWeight: 600 }}>Audit activity</h3>
              <p className="text-xs text-slate-500">Immutable ledger</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/audit"><ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {auditEvents.slice(0, 4).map(a => (
              <div key={a.id} className="p-3 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center shrink-0 text-slate-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-900 truncate" style={{ fontWeight: 500 }}>{a.action}</div>
                  <div className="text-[11px] text-slate-500">{a.actor} · {a.time}</div>
                  <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
