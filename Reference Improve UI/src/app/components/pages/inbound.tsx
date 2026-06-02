import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { StatusPill } from "../status-pill";
import { Sparkles, Wand2, FileCheck2, Truck, Filter, Upload, MessageSquare } from "lucide-react";
import { inboundReceipts } from "../mock-data";

const sample = `Hi team, dropping off order #JSC-V-2412 today around 3pm.
Vanilla bean extract, premium grade, 240kg in 4 drums.
Stay below -15°C. CoA + COO included.
Driver: Bambang. Truck JKT-7821.
- Java Spice Co.`;

export function InboundPage() {
  const [input, setInput] = useState(sample);
  const [extracted, setExtracted] = useState(false);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>AI Inbound Intake</h1>
          <p className="text-slate-500 text-sm mt-1">Paste supplier text, WhatsApp messages, or upload documents. AI extracts structured receipt fields for your review.</p>
        </div>

        <Card className="p-5 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-900" style={{ fontWeight: 500 }}>Source message</span>
            </div>
            <Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF</Button>
          </div>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={8}
            className="font-mono text-sm bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
          />
          <Button onClick={() => setExtracted(true)} className="bg-emerald-600 hover:bg-emerald-700 self-start">
            <Wand2 className="w-4 h-4 mr-1.5" /> Extract with AI
          </Button>
        </Card>

        <Card className={`p-5 gap-4 transition ${extracted ? "ring-2 ring-emerald-100" : "opacity-60"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-slate-900" style={{ fontWeight: 500 }}>AI-extracted fields</span>
            </div>
            {extracted && <Badge className="bg-emerald-100 text-emerald-700 border-0">96% confidence</Badge>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Supplier" value={extracted ? "Java Spice Co." : ""} />
            <Field label="Supplier ref" value={extracted ? "JSC-V-2412" : ""} />
            <Field label="Material" value={extracted ? "Vanilla Bean Extract" : ""} />
            <Field label="Grade" value={extracted ? "Premium" : ""} />
            <Field label="Quantity" value={extracted ? "240 kg" : ""} />
            <Field label="Container count" value={extracted ? "4 drums" : ""} />
            <Field label="Required temp" value={extracted ? "≤ -15°C" : ""} highlight />
            <Field label="Driver / vehicle" value={extracted ? "Bambang · JKT-7821" : ""} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!extracted}>
              <FileCheck2 className="w-4 h-4 mr-1.5" /> Approve & create receipt
            </Button>
            <Button variant="outline" disabled={!extracted}>Edit fields</Button>
            <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 ml-auto" disabled={!extracted}>Reject</Button>
          </div>
        </Card>
      </div>

      {/* Right: receipts queue */}
      <div className="xl:col-span-2">
        <Card className="p-0 overflow-hidden h-full">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-slate-900" style={{ fontWeight: 600 }}>Receipt queue</h3>
              <p className="text-xs text-slate-500">{inboundReceipts.length} receipts · today</p>
            </div>
            <Button variant="ghost" size="icon"><Filter className="w-4 h-4" /></Button>
          </div>
          <div className="divide-y divide-slate-100">
            {inboundReceipts.map(r => (
              <div key={r.id} className="p-4 hover:bg-slate-50/60 cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-900" style={{ fontWeight: 500 }}>{r.material}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{r.id} · {r.supplier}</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {r.qty}</span>
                  <span className="text-slate-400">·</span>
                  <span>{r.arrived}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">
                    <Sparkles className="w-3 h-3" /> {r.aiConfidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-slate-500">{label}</Label>
      <Input
        value={value}
        readOnly
        placeholder="—"
        className={`mt-1 ${highlight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200"}`}
      />
    </div>
  );
}
