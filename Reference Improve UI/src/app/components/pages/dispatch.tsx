import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { StatusPill } from "../status-pill";
import { Send, Plus, Search, Truck, MapPin, Clock, Package, ArrowRight } from "lucide-react";
import { dispatches } from "../mock-data";

export function DispatchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Sample Dispatch</h1>
          <p className="text-slate-500 text-sm mt-1">Outbound queue, courier coordination & customer ETAs.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1.5" /> Create dispatch</Button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "In transit", value: 4, tone: "sky", icon: Truck },
          { label: "Pending courier", value: 2, tone: "amber", icon: Clock },
          { label: "Preparing", value: 3, tone: "violet", icon: Package },
          { label: "Delivered today", value: 7, tone: "emerald", icon: Send },
        ].map(s => (
          <Card key={s.label} className="p-4 gap-2 flex-row items-center">
            <div className={`w-10 h-10 rounded-lg grid place-items-center ${
              s.tone === "sky" ? "bg-sky-100 text-sky-600" :
              s.tone === "amber" ? "bg-amber-100 text-amber-600" :
              s.tone === "violet" ? "bg-violet-100 text-violet-600" :
              "bg-emerald-100 text-emerald-600"
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl text-slate-900 tabular-nums" style={{ fontWeight: 600 }}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search by customer, lot, or destination..." className="pl-9 h-9 bg-slate-50" />
          </div>
          <Badge variant="outline" className="ml-auto">{dispatches.length} dispatches</Badge>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50/60">
              <th className="text-left px-4 py-2.5">Dispatch</th>
              <th className="text-left px-4 py-2.5">Customer</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Lot</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Qty</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Courier</th>
              <th className="text-left px-4 py-2.5">ETA</th>
              <th className="text-right px-4 py-2.5">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {dispatches.map(d => (
              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{d.id}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-900" style={{ fontWeight: 500 }}>{d.customer}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {d.destination}
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-slate-600">{d.lot}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-600 tabular-nums">{d.qty}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{d.courier}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{d.eta}</td>
                <td className="px-4 py-3 text-right"><StatusPill status={d.status} /></td>
                <td className="px-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowRight className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
