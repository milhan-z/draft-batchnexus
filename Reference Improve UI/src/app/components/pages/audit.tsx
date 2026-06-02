import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Search, Download, Filter, Calendar, ScrollText } from "lucide-react";
import { auditEvents } from "../mock-data";

const actionIcon: Record<string, string> = {
  "QC": "🔬",
  "Slot": "🏭",
  "Cold-chain": "❄️",
  "Inbound": "📦",
  "Lot": "🚫",
  "Dispatch": "🚚",
  "Policy": "🛡️",
};

const getIcon = (action: string) => {
  for (const k of Object.keys(actionIcon)) {
    if (action.includes(k)) return actionIcon[k];
  }
  return "📝";
};

export function AuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Audit Log</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5" /> Immutable ledger · actor, role, action, entity, change, timestamp
          </p>
        </div>
        <Button variant="outline"><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
      </div>

      <Card className="p-3 gap-3 flex-row items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by actor, action, or entity..." className="pl-9 h-9 bg-slate-50" />
        </div>
        <Button variant="outline" size="sm"><Filter className="w-3.5 h-3.5 mr-1.5" /> Role</Button>
        <Button variant="outline" size="sm"><Filter className="w-3.5 h-3.5 mr-1.5" /> Action</Button>
        <Button variant="outline" size="sm"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Today</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50/60 border-b border-slate-100">
          <div className="col-span-3">Event</div>
          <div className="col-span-3">Actor</div>
          <div className="col-span-2">Entity</div>
          <div className="col-span-3">Detail</div>
          <div className="col-span-1 text-right">Time</div>
        </div>
        <div className="divide-y divide-slate-100">
          {auditEvents.map(a => (
            <div key={a.id} className="md:grid md:grid-cols-12 gap-3 px-4 py-3 hover:bg-slate-50/40 flex flex-col">
              <div className="col-span-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center shrink-0 text-base">{getIcon(a.action)}</div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-900" style={{ fontWeight: 500 }}>{a.action}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{a.id}</div>
                </div>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px]">
                    {a.actor.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xs text-slate-900 truncate" style={{ fontWeight: 500 }}>{a.actor}</div>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] mt-0.5">{a.role}</Badge>
                </div>
              </div>
              <div className="col-span-2 flex items-center">
                <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{a.entity}</span>
              </div>
              <div className="col-span-3 flex items-center text-xs text-slate-600">{a.detail}</div>
              <div className="col-span-1 flex items-center justify-end text-xs text-slate-500 whitespace-nowrap">{a.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
