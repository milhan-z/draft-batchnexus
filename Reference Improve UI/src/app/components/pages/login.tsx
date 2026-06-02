import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Sparkles, ArrowRight, ShieldCheck, Globe, Lock } from "lucide-react";
import { roles } from "../mock-data";

export function LoginPage() {
  const [selected, setSelected] = useState(roles[4].id);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-slate-950">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur grid place-items-center ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>BatchNexus</div>
            <div className="text-xs text-emerald-200/80">Control Tower for Sima Arôme</div>
          </div>
        </div>

        <div className="relative mt-auto">
          <h1 className="text-4xl leading-tight" style={{ fontWeight: 600 }}>
            One operational brain for intake, QC, lot tracking, warehouse & dispatch.
          </h1>
          <p className="mt-4 text-emerald-100/80 max-w-md">
            Input once. Trace everything. Slot safely. Answer instantly. AI assists at every step — humans approve every critical decision.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <div>
              <div className="text-3xl text-emerald-300" style={{ fontWeight: 600 }}>98<span className="text-lg">%</span></div>
              <div className="text-xs text-emerald-100/70 mt-1">QC accuracy</div>
            </div>
            <div>
              <div className="text-3xl text-emerald-300" style={{ fontWeight: 600 }}>3.2<span className="text-lg">x</span></div>
              <div className="text-xs text-emerald-100/70 mt-1">Faster intake</div>
            </div>
            <div>
              <div className="text-3xl text-emerald-300" style={{ fontWeight: 600 }}>0</div>
              <div className="text-xs text-emerald-100/70 mt-1">Lost lots</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right login */}
      <div className="flex items-center justify-center p-6 bg-[#f7f8fa] min-h-screen">
        <Card className="w-full max-w-md p-8 gap-5 shadow-xl border-slate-200">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-600 mb-1" style={{ fontWeight: 600 }}>Demo mode</div>
            <h2 className="text-2xl text-slate-900" style={{ fontWeight: 600 }}>Choose your role</h2>
            <p className="text-sm text-slate-500 mt-1">No password required. Each role unlocks different permissions across the control tower.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`text-left p-3 rounded-lg border transition ${
                  selected === r.id
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="text-lg leading-none">{r.icon}</div>
                <div className="text-sm text-slate-900 mt-1.5" style={{ fontWeight: 500 }}>{r.label}</div>
              </button>
            ))}
          </div>

          <Button onClick={() => navigate("/")} className="bg-emerald-600 hover:bg-emerald-700 h-11">
            Enter control tower <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> RBAC</div>
            <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-500" /> Audit logged</div>
            <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-500" /> SOC-2 ready</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
