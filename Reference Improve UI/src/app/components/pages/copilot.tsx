import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Sparkles, ArrowUp, Boxes, Thermometer, Truck, FileText, ShieldCheck, ArrowRight } from "lucide-react";

type Source = { collection: string };
type RecordCard = { title: string; sub: string; tone?: "emerald" | "sky" | "amber" };
type Msg = {
  role: "user" | "ai";
  text: string;
  cards?: RecordCard[];
  sources?: Source[];
};

const suggestions = [
  { icon: Boxes, q: "Lots to prioritize for dispatch today" },
  { icon: Thermometer, q: "Cold-chain excursions this week" },
  { icon: Truck, q: "What's blocking DSP-0521?" },
  { icon: FileText, q: "QC outcomes for Vanilla Bean" },
  { icon: ShieldCheck, q: "Audit log integrity check" },
  { icon: Boxes, q: "Recommend a smart slot for LOT-2026-0142" },
  { icon: Thermometer, q: "Which zones are out of range?" },
  { icon: Truck, q: "Today's dispatch readiness" },
];

const reply: Msg = {
  role: "ai",
  text: "Based on customer commitments and storage age, I recommend prioritizing 2 lots for dispatch today:",
  cards: [
    { title: "LOT-2026-0142", sub: "Vanilla Bean Extract · Stored 6h · Aurora Beauty export Friday", tone: "emerald" },
    { title: "LOT-2026-0141", sub: "Cinnamon Bark Oleoresin · Stored 12h · Maison Lumière Paris", tone: "sky" },
  ],
  sources: [
    { collection: "lots" }, { collection: "sample_dispatches" }, { collection: "policies" },
  ],
};

export function CopilotPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function ask(q: string) {
    setMessages(prev => [...prev, { role: "user", text: q }, reply]);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6 xl:-m-8">
      {/* Stream area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 w-full">
          {empty ? (
            <div className="flex flex-col items-center text-center pt-16 pb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shadow-sm mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-3xl text-slate-900" style={{ fontWeight: 600 }}>How can I help, Priya?</h1>
              <p className="text-slate-500 mt-2 max-w-md">
                Ask anything about lots, QC, warehouse, dispatch, or audit history. Answers come from your live operational records.
              </p>
            </div>
          ) : (
            <div className="space-y-8 pt-2">
              {messages.map((m, i) => (
                <MessageRow key={i} msg={m} />
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-gradient-to-t from-[#f7f8fa] via-[#f7f8fa] to-transparent pt-6 pb-6 px-4">
        <div className="max-w-3xl mx-auto w-full">
          {empty && (
            <div
              className="relative mb-3 overflow-x-auto overflow-y-hidden -mx-1 px-1 pb-1"
              style={{
                maskImage: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)",
                scrollbarWidth: "thin",
              }}
            >
              <div className="flex w-max gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => ask(s.q)}
                    className="shrink-0 text-left px-3 py-2 rounded-full bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition group flex items-center gap-2 whitespace-nowrap"
                  >
                    <s.icon className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{s.q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={e => { e.preventDefault(); if (input.trim()) ask(input.trim()); }}
            className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-emerald-300 focus-within:shadow-md transition"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) ask(input.trim());
                }
              }}
              rows={1}
              placeholder="Ask Ops Copilot..."
              className="w-full bg-transparent border-0 outline-none resize-none text-[15px] text-slate-900 placeholder:text-slate-400 px-4 py-3.5 pr-14 max-h-40"
              style={{ minHeight: "52px" }}
            />
            <Button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 h-9 w-9 p-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Answers are generated from operational records. Actions require confirmation.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-slate-100 text-slate-900 rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px]">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-4">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Sparkles className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-3 pt-0.5">
        <p className="text-[15px] text-slate-800 leading-relaxed">{msg.text}</p>
        {msg.cards && (
          <div className="space-y-2">
            {msg.cards.map(c => (
              <div key={c.title} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition cursor-pointer">
                <div className={`w-1 h-10 rounded-full ${
                  c.tone === "emerald" ? "bg-emerald-500" :
                  c.tone === "sky" ? "bg-sky-500" : "bg-amber-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-slate-900" style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
        {msg.sources && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Sources</span>
            {msg.sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                <span className="text-emerald-500">●</span>
                {s.collection}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
