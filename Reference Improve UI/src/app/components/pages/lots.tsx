import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { StatusPill } from "../status-pill";
import { Search, Download, Filter, ArrowRight, PackageOpen, FlaskConical, Warehouse, Send, FileCheck2 } from "lucide-react";
import { lots } from "../mock-data";

const timeline = [
  { id: 1, icon: PackageOpen, title: "Inbound received", actor: "Tomás Reyes · Receiving Operator", time: "Today 09:24", detail: "240 kg · 4 drums · Java Spice Co. · CoA verified" },
  { id: 2, icon: FlaskConical, title: "QC vision screening passed", actor: "Sarah Chen · QC Staff", time: "Today 10:42", detail: "Colour 96 · Δ1.2 · Defect 8% · Foreign matter 4%" },
  { id: 3, icon: FileCheck2, title: "QC released — Lot created", actor: "Sarah Chen · QC Staff", time: "Today 10:51", detail: "LOT-2026-0142 issued · Released for storage" },
  { id: 4, icon: Warehouse, title: "Smart slot assigned", actor: "Marcus Vega · Warehouse Admin", time: "Today 11:18", detail: "Zone Z-A1 · Cold-chain · Slot score 94" },
  { id: 5, icon: Send, title: "Sample dispatched", actor: "Lina Park · Customer Service", time: "Pending", detail: "DSP-0521 · Aurora Beauty · 12 kg · DHL Express", pending: true },
];

export function LotsPage() {
  const [active] = useState(lots[0]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Lot Traceability</h1>
          <p className="text-slate-500 text-sm mt-1">Event-based history from inbound to dispatch · CSV export ready.</p>
        </div>
        <Button variant="outline"><Download className="w-4 h-4 mr-1.5" /> Export trace CSV</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Lot list */}
        <Card className="xl:col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search lots..." className="pl-9 h-9 bg-slate-50" />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="w-4 h-4" /></Button>
            </div>
            <div className="text-xs text-slate-500">{lots.length} lots</div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {lots.map(l => (
              <div key={l.id} className={`p-4 cursor-pointer ${active.id === l.id ? "bg-emerald-50/40 border-l-2 border-emerald-500" : "hover:bg-slate-50/60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-slate-900" style={{ fontWeight: 500 }}>{l.lot_number}</div>
                    <div className="text-sm text-slate-700 mt-0.5">{l.material}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{l.supplier} · {l.qty}</div>
                  </div>
                  <StatusPill status={l.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="xl:col-span-3 p-6 gap-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg text-slate-900 font-mono" style={{ fontWeight: 600 }}>{active.lot_number}</h3>
                <StatusPill status={active.status} />
              </div>
              <p className="text-sm text-slate-600 mt-1">{active.material} · {active.supplier}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-slate-500">Quantity</div>
                <div className="text-slate-900 mt-0.5" style={{ fontWeight: 600 }}>{active.qty}</div>
              </div>
              <div>
                <div className="text-slate-500">Storage temp</div>
                <div className="text-slate-900 mt-0.5" style={{ fontWeight: 600 }}>{active.temp}°C</div>
              </div>
              <div>
                <div className="text-slate-500">Created</div>
                <div className="text-slate-900 mt-0.5" style={{ fontWeight: 600 }}>{active.created}</div>
              </div>
            </div>
          </div>

          <div className="relative pl-2">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
            {timeline.map((t) => (
              <div key={t.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 relative z-10 ring-4 ring-white ${
                  t.pending ? "bg-slate-100 text-slate-400" : "bg-emerald-500 text-white"
                }`}>
                  <t.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-slate-900" style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.pending ? <Badge variant="outline" className="text-[10px]">Pending</Badge> : <span className="text-xs text-slate-500">{t.time}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.actor}</div>
                  <div className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded-md px-3 py-2 border border-slate-100">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <Button className="self-start bg-emerald-600 hover:bg-emerald-700">
            View dispatch <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
