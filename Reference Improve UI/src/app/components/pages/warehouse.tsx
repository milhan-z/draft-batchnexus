import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { StatusPill } from "../status-pill";
import { Thermometer, Sparkles, AlertTriangle, ArrowRight, Snowflake, Wind, Box, Flame } from "lucide-react";
import { zones, tempSeries } from "../mock-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid } from "recharts";

const zoneIcon: Record<string, any> = {
  "Cold-chain": Snowflake,
  "Chilled": Wind,
  "Ambient": Box,
  "Hazmat": Flame,
};

export function WarehousePage() {
  const [active, setActive] = useState(zones[1]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Warehouse Digital Twin</h1>
          <p className="text-slate-500 text-sm mt-1">Zone occupancy, cold-chain monitoring & smart slot recommendations.</p>
        </div>
      </div>

      {/* Zone map */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {zones.map(z => {
          const Icon = zoneIcon[z.type] || Box;
          const isAlert = z.status === "Cold-chain Alert";
          return (
            <Card
              key={z.id}
              onClick={() => setActive(z)}
              className={`p-4 gap-2 cursor-pointer transition relative overflow-hidden ${
                active.id === z.id ? "ring-2 ring-emerald-500" : ""
              } ${isAlert ? "bg-gradient-to-br from-amber-50 to-white border-amber-200" : ""}`}
            >
              {isAlert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg grid place-items-center ${
                  z.type === "Cold-chain" ? "bg-sky-100 text-sky-600" :
                  z.type === "Chilled" ? "bg-cyan-100 text-cyan-600" :
                  z.type === "Hazmat" ? "bg-rose-100 text-rose-600" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono text-slate-700" style={{ fontWeight: 600 }}>{z.id}</div>
              </div>
              <div className="text-xs text-slate-500">{z.type}</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl tabular-nums ${isAlert ? "text-amber-700" : "text-slate-900"}`} style={{ fontWeight: 600 }}>{z.temp.toFixed(1)}</span>
                <span className="text-xs text-slate-500">°C</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>Occupancy</span>
                  <span>{z.occupancy}/{z.capacity}</span>
                </div>
                <Progress value={(z.occupancy / z.capacity) * 100} className="h-1" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Zone detail / chart */}
        <Card className="xl:col-span-2 p-5 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-900 font-mono" style={{ fontWeight: 600 }}>{active.id}</h3>
                <span className="text-slate-700">· {active.name}</span>
                <StatusPill status={active.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Required range {active.min}°C to {active.max}°C · Last 24 hours</p>
            </div>
            <Button variant="outline" size="sm"><Thermometer className="w-3.5 h-3.5 mr-1.5" /> Adjust setpoint</Button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempSeries} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[-22, 8]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <ReferenceArea y1={active.min} y2={active.max} fill="#10b981" fillOpacity={0.08} />
                <Line type="monotone" dataKey="Z-A1" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Z-A2" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Z-B1" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {active.status === "Cold-chain Alert" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span style={{ fontWeight: 600 }}>Excursion at 15:00 — </span>
                Door open detected for 4m12s. Recovery underway. 2 lots flagged for review.
              </div>
            </div>
          )}
        </Card>

        {/* Smart slot */}
        <Card className="p-5 gap-4 bg-gradient-to-br from-emerald-50 to-teal-50/30 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white grid place-items-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-emerald-900" style={{ fontWeight: 600 }}>Smart slot recommendation</div>
              <div className="text-xs text-emerald-700">LOT-2026-0140 · Lavender Essence</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Recommended zone</div>
                <div className="text-lg font-mono text-slate-900" style={{ fontWeight: 600 }}>Z-B1 · Chilled</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Slot score</div>
                <div className="text-2xl text-emerald-700 tabular-nums" style={{ fontWeight: 600 }}>94</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <Reason text="Temperature match (4°C vs required 2–8°C)" ok />
              <Reason text="No hazard segregation conflict" ok />
              <Reason text="Capacity available (45/80)" ok />
              <Reason text="Pick-path proximity to dispatch dock" ok />
            </div>
          </div>

          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Assign slot <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button variant="outline">View alternatives</Button>

          <div className="text-[10px] text-emerald-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Zone Z-A2 blocked by cold-chain policy
          </div>
        </Card>
      </div>
    </div>
  );
}

function Reason({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <span className={`w-4 h-4 rounded-full grid place-items-center text-white text-[10px] ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>
        {ok ? "✓" : "✕"}
      </span>
      {text}
    </div>
  );
}
