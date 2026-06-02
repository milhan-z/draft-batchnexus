import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { StatusPill } from "../status-pill";
import {
  Camera, Sparkles, CheckCircle2, RotateCcw, Ban,
  FlaskConical, Eye, ImagePlus, AlertCircle,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const queue = [
  { id: "REC-3421", material: "Vanilla Bean Extract", supplier: "Java Spice Co.", qty: "240 kg", arrived: "2h ago", priority: "High", img: "https://images.unsplash.com/photo-1611329857570-f02f340e7378?w=400" },
  { id: "REC-3420", material: "Citrus Bergamot Oil", supplier: "Madagascar Aromatics", qty: "320 kg", arrived: "8h ago", priority: "Normal", img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400" },
  { id: "REC-3419", material: "Spearmint Powder", supplier: "Bali Botanicals", qty: "150 kg", arrived: "1d ago", priority: "Normal", img: "https://images.unsplash.com/photo-1628557010295-e6c8c1cba53b?w=400" },
];

const metrics = [
  { label: "Colour score", value: 96, max: 100, tone: "emerald" },
  { label: "Uniformity", value: 92, max: 100, tone: "emerald" },
  { label: "Defect risk", value: 8, max: 100, tone: "emerald", inverse: true },
  { label: "Foreign matter", value: 4, max: 100, tone: "emerald", inverse: true },
  { label: "ΔColour (vs golden)", value: 1.2, max: 5, tone: "emerald", unit: "" },
];

export function QcPage() {
  const [active, setActive] = useState(queue[0]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>QC Release Station</h1>
          <p className="text-slate-500 text-sm mt-1">Computer-vision photo screening · Human approval gates every release.</p>
        </div>
        <Badge className="bg-violet-100 text-violet-700 border-0 gap-1.5"><FlaskConical className="w-3 h-3" /> 3 awaiting</Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Queue */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-slate-900" style={{ fontWeight: 600 }}>Inspection queue</h3>
            <p className="text-xs text-slate-500">Sorted by priority</p>
          </div>
          <div className="divide-y divide-slate-100">
            {queue.map(q => (
              <button
                key={q.id}
                onClick={() => setActive(q)}
                className={`w-full text-left p-4 flex gap-3 transition ${active.id === q.id ? "bg-emerald-50/60 border-l-2 border-emerald-500" : "hover:bg-slate-50/60"}`}
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                  <ImageWithFallback src={q.img} alt={q.material} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-900 truncate" style={{ fontWeight: 500 }}>{q.material}</div>
                    {q.priority === "High" && <Badge className="h-4 px-1.5 bg-amber-100 text-amber-700 border-0 text-[10px]">High</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{q.supplier}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">{q.id} · {q.qty} · {q.arrived}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Inspection panel */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Card className="p-5 gap-5">
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <ImageWithFallback src={active.img} alt={active.material} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg text-slate-900" style={{ fontWeight: 600 }}>{active.material}</h3>
                    <p className="text-sm text-slate-500">{active.supplier} · {active.qty}</p>
                  </div>
                  <StatusPill status="Pending QC" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline"><Camera className="w-3.5 h-3.5 mr-1.5" /> Capture</Button>
                  <Button size="sm" variant="outline"><ImagePlus className="w-3.5 h-3.5 mr-1.5" /> Upload</Button>
                  <Button size="sm" variant="outline"><Eye className="w-3.5 h-3.5 mr-1.5" /> View golden sample</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Recommendation */}
          <Card className="p-5 gap-4 bg-gradient-to-br from-emerald-50 to-teal-50/30 border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white grid place-items-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-emerald-900" style={{ fontWeight: 600 }}>Vision QC recommendation</div>
                  <div className="text-xs text-emerald-700">Computer vision · on-device</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl text-emerald-700" style={{ fontWeight: 600 }}>Pass</div>
                <div className="text-xs text-emerald-600">94% confidence</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map(m => {
                const pct = m.inverse ? 100 - (m.value / m.max) * 100 : (m.value / m.max) * 100;
                return (
                  <div key={m.label} className="bg-white rounded-lg p-3 border border-emerald-100">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</div>
                    <div className="text-xl text-slate-900 tabular-nums mt-1" style={{ fontWeight: 600 }}>{m.value}{m.unit ?? ""}</div>
                    <Progress value={pct} className="h-1 mt-1.5" />
                  </div>
                );
              })}
            </div>

            <div className="bg-white/70 rounded-lg p-3 border border-emerald-100 text-xs text-emerald-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <span style={{ fontWeight: 600 }}>Reason codes: </span>
                  Colour within golden range · Low defect signal · No foreign-matter outliers detected. Recommend release with optional human spot-check.
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 gap-3">
            <div className="text-sm text-slate-900" style={{ fontWeight: 500 }}>Human decision</div>
            <p className="text-xs text-slate-500 -mt-1">Final release is always human-approved and audit-logged.</p>
            <div className="grid grid-cols-3 gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
              </Button>
              <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                <RotateCcw className="w-4 h-4 mr-1.5" /> Recheck
              </Button>
              <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                <Ban className="w-4 h-4 mr-1.5" /> Block
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
