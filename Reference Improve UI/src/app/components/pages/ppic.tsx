import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, MoreHorizontal, Calendar, GripVertical } from "lucide-react";
import { ppicJobs } from "../mock-data";

const cols = [
  { key: "queued", title: "Queued", tone: "slate" },
  { key: "prep", title: "Material Prep", tone: "sky" },
  { key: "active", title: "In Production", tone: "emerald" },
  { key: "qcHold", title: "QC Hold", tone: "amber" },
  { key: "done", title: "Completed", tone: "violet" },
] as const;

const dot: Record<string, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

const priorityTone: Record<string, string> = {
  Critical: "bg-rose-50 text-rose-700 border-rose-200",
  High: "bg-amber-50 text-amber-700 border-amber-200",
  Normal: "bg-slate-50 text-slate-600 border-slate-200",
};

export function PpicPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>PPIC Board</h1>
          <p className="text-slate-500 text-sm mt-1">Drag and drop production jobs across readiness stages.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="w-4 h-4 mr-1.5" /> Week view</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1.5" /> New job</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {cols.map(c => {
          const items = (ppicJobs as any)[c.key] as Array<{ id: string; product: string; qty: string; due: string; priority: string }>;
          return (
            <div key={c.key} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot[c.tone]}`} />
                  <span className="text-sm text-slate-900" style={{ fontWeight: 600 }}>{c.title}</span>
                  <span className="text-xs text-slate-500">{items.length}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-100/50 rounded-xl p-2 min-h-[300px]">
                {items.map(j => (
                  <Card key={j.id} className="p-3 gap-2 cursor-grab hover:shadow-md transition active:cursor-grabbing">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900" style={{ fontWeight: 500 }}>{j.product}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{j.id}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5"><MoreHorizontal className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-600">{j.qty}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${priorityTone[j.priority]}`}>{j.priority}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Due {j.due}</span>
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{c.title}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
