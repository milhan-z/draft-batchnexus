import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Sparkles, Send, FileText, Boxes, Thermometer, Truck, ArrowRight } from "lucide-react";

const suggestions = [
  { icon: Boxes, q: "Which lots are stored but unshipped older than 5 days?" },
  { icon: Thermometer, q: "Show me all cold-chain excursions this week" },
  { icon: Truck, q: "What's blocking DSP-0521 from leaving today?" },
  { icon: FileText, q: "Summarize QC outcomes for Vanilla Bean since Monday" },
];

const messages = [
  { role: "user", text: "Which stored lots should I prioritize for dispatch today?" },
  {
    role: "ai",
    text: "Based on customer commitments and storage age, I recommend prioritizing 2 lots:",
    cards: [
      { title: "LOT-2026-0142", sub: "Vanilla Bean Extract · Stored 6h · Aurora Beauty export Friday", tone: "emerald" },
      { title: "LOT-2026-0141", sub: "Cinnamon Bark Oleoresin · Stored 12h · Maison Lumière Paris", tone: "sky" },
    ],
    sources: [
      "lots · stored: 4 records",
      "sample_dispatches · pending: 2 matches",
      "policies · cold-chain courier required: 1 match",
    ],
  },
];

export function CopilotPage() {
  const [input, setInput] = useState("");
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full gap-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Ops Copilot</h1>
            <p className="text-slate-500 text-sm">Natural-language answers, sourced from your operational records.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {suggestions.map((s, i) => (
          <button key={i} className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition group">
            <s.icon className="w-4 h-4 text-emerald-500 mb-2" />
            <div className="text-sm text-slate-700 group-hover:text-slate-900">{s.q}</div>
          </button>
        ))}
      </div>

      <Card className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className={m.role === "user" ? "bg-slate-200 text-slate-700 text-xs" : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs"}>
                  {m.role === "user" ? "PN" : <Sparkles className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] space-y-2 ${m.role === "user" ? "items-end" : ""}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-sm"
                    : "bg-slate-100 text-slate-900 rounded-tl-sm"
                }`}>
                  {m.text}
                </div>
                {m.cards && (
                  <div className="space-y-2">
                    {m.cards.map(c => (
                      <div key={c.title} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 cursor-pointer">
                        <div className={`w-1 h-10 rounded-full ${c.tone === "emerald" ? "bg-emerald-500" : "bg-sky-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono text-slate-900" style={{ fontWeight: 600 }}>{c.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
                {m.sources && (
                  <div className="text-[11px] text-slate-500 pl-1">
                    <div className="uppercase tracking-wider mb-1">Sources</div>
                    {m.sources.map(s => <div key={s} className="font-mono">· {s}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-3 bg-slate-50/60">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about lots, dispatch, cold-chain, or audit history..."
              className="bg-white border-slate-200 h-10"
            />
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-10"><Send className="w-4 h-4" /></Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 px-1">
            Copilot uses your live records · sources cited · no data leaves your tenant
          </p>
        </div>
      </Card>
    </div>
  );
}
