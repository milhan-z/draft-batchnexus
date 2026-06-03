import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatusPill } from "../status-pill";
import {
  Camera, Sparkles, CheckCircle2, RotateCcw, Ban,
  FlaskConical, Eye, ImagePlus, AlertCircle, ShieldCheck,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

type QueueItem = {
  id: string;
  altId: string;
  material: string;
  supplier: string;
  status: "Needs Review" | "Pending QC";
};

const queue: QueueItem[] = [
  { id: "REC-3422", altId: "BG-1102", material: "Clove Bud Oil", supplier: "PT Rempah Nusantara", status: "Needs Review" },
  { id: "REC-3423", altId: "PE-0817", material: "Citrus Peel Extract", supplier: "Sukento Citrus", status: "Pending QC" },
  { id: "REC-3421", altId: "LG-2406", material: "Lemongrass Oil", supplier: "Sukento Spice Trade", status: "Pending QC" },
  { id: "REC-3420", altId: "LA-3301", material: "Lavender Absolute", supplier: "Provence Fields Co.", status: "Needs Review" },
];

const metrics = [
  { label: "Colour score", value: "81", caption: "/ 100" },
  { label: "Uniformity", value: "89", caption: "/ 100" },
  { label: "Defect risk", value: "Low", caption: "0.09" },
  { label: "Foreign matter", value: "Low", caption: "0.04" },
  { label: "ΔColour", value: "Low", caption: "1.6 vs golden" },
];

export function QcPage() {
  const [active, setActive] = useState<QueueItem>(queue[2]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>QC Release Station</h1>
          <p className="text-slate-500 text-sm mt-1">Review &amp; approve and provide human sign-off for material release.</p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border-0 gap-1.5 px-2.5 py-1 rounded-full">
          <FlaskConical className="w-3 h-3" /> 3 pending
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Queue rail */}
        <Card className="p-0 overflow-hidden h-fit xl:sticky xl:top-4 bg-white">
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-sm text-slate-900" style={{ fontWeight: 600 }}>Inspection Queue</h3>
          </div>
          <div className="px-2 pb-2 space-y-1">
            {queue.map(q => {
              const selected = active.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => setActive(q)}
                  className={`w-full text-left p-3 rounded-lg transition border ${
                    selected
                      ? "bg-emerald-50 border-emerald-200 border-l-2 border-l-emerald-500"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{q.id}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{q.altId}</span>
                  </div>
                  <div className="text-sm text-slate-900" style={{ fontWeight: 600 }}>{q.material}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{q.supplier}</div>
                  <div className="mt-2">
                    <StatusPill status={q.status} className="text-[10px] px-2 py-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Inspection panel */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Material header */}
          <Card className="p-5 gap-0 flex-row items-stretch bg-slate-50/60">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1595871522483-00a17611a5e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
                alt={`${active.material} sample`}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/70 text-white backdrop-blur">
                Sample · {active.id}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col pl-5">
              <div className="flex items-start gap-1.5 flex-wrap mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">{active.id}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">{active.altId}</span>
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] h-5 px-1.5 gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Escalate
                </Badge>
                <StatusPill status="Pending QC" className="ml-auto text-[10px] px-2 py-0" />
              </div>

              <h2 className="text-xl text-slate-900" style={{ fontWeight: 600 }}>{active.material}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{active.supplier} · 200 L</p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button size="sm" variant="outline" className="h-8 bg-white">
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Capture
                </Button>
                <Button size="sm" variant="outline" className="h-8 bg-white">
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
                <Button size="sm" variant="outline" className="h-8 bg-white">
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View golden sample
                </Button>
              </div>

              <div className="flex-1" />

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 mt-3">
                <Button size="sm" variant="ghost" className="h-8 text-slate-600">
                  Inspection notes
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-slate-600">
                  View history
                </Button>
              </div>
            </div>
          </Card>

          {/* AI Recommendation */}
          <Card className="p-5 gap-4 border-emerald-200 ring-1 ring-emerald-200/60 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start justify-between gap-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-900" style={{ fontWeight: 600 }}>Vision QC recommendation</div>
                  <div className="text-xs text-slate-500">Matching sample image · viewing inspection</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl text-emerald-600 leading-none" style={{ fontWeight: 700 }}>Review</div>
                <div className="text-[11px] text-slate-500 mt-1">86% confidence</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 relative">
              {metrics.map(m => (
                <div key={m.label} className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</div>
                  <div className="text-2xl text-slate-900 tabular-nums mt-1" style={{ fontWeight: 600 }}>{m.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.caption}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 relative">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <span style={{ fontWeight: 600 }}>Reason codes: </span>
                  Colour within golden range · Low defect signal · No foreign-matter outliers detected. Recommend release with optional human spot-check.
                </div>
              </div>
            </div>

          </Card>

          {/* Human decision footer */}
          <Card className="p-4 gap-3 flex-row items-center justify-between flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>AI screens the inspection layer. Final release must be signed off by QC staff.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 h-8">
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Block
              </Button>
              <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 h-8">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Recheck
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve &amp; release
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
