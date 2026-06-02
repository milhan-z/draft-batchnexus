import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { ShieldCheck, Snowflake, Flame, FlaskConical, Send, Plus, Edit } from "lucide-react";
import { policies } from "../mock-data";

const categoryIcon: Record<string, any> = {
  "Cold-chain": Snowflake,
  "Hazard": Flame,
  "QC Release": FlaskConical,
  "Dispatch": Send,
};

const categoryTone: Record<string, string> = {
  "Cold-chain": "bg-sky-100 text-sky-700",
  "Hazard": "bg-rose-100 text-rose-700",
  "QC Release": "bg-violet-100 text-violet-700",
  "Dispatch": "bg-emerald-100 text-emerald-700",
};

const severityTone: Record<string, string> = {
  Critical: "bg-rose-50 text-rose-700 border-rose-200",
  High: "bg-amber-50 text-amber-700 border-amber-200",
  Medium: "bg-sky-50 text-sky-700 border-sky-200",
};

export function PolicyPage() {
  const grouped = policies.reduce((acc: Record<string, typeof policies>, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Policy Rules</h1>
          <p className="text-slate-500 text-sm mt-1">Enforced across QC, warehouse slotting, and dispatch — every decision audit-logged.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1.5" /> Add rule</Button>
      </div>

      <Card className="p-5 gap-3 flex-row items-center bg-gradient-to-r from-emerald-50 to-teal-50/30 border-emerald-200">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white grid place-items-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="text-slate-900" style={{ fontWeight: 600 }}>All policies active</div>
          <div className="text-sm text-slate-600">
            {policies.filter(p => p.enabled).length} of {policies.length} rules enforced · Last updated 5 hours ago
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
          <Badge className="bg-rose-100 text-rose-700 border-0">{policies.filter(p => p.severity === "Critical").length} Critical</Badge>
          <Badge className="bg-amber-100 text-amber-700 border-0">{policies.filter(p => p.severity === "High").length} High</Badge>
        </div>
      </Card>

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, rules]) => {
          const Icon = categoryIcon[cat] || ShieldCheck;
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg grid place-items-center ${categoryTone[cat]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-slate-900" style={{ fontWeight: 600 }}>{cat}</h2>
                <span className="text-xs text-slate-500">{rules.length} rules</span>
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {rules.map(p => (
                    <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-slate-900" style={{ fontWeight: 500 }}>{p.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${severityTone[p.severity]}`}>{p.severity}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">{p.id}</div>
                      </div>
                      <div className="hidden md:block text-sm text-slate-700 tabular-nums">{p.value}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-3.5 h-3.5" /></Button>
                      <Switch defaultChecked={p.enabled} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
