import { useState, ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, PackageOpen, FlaskConical, Boxes, CalendarRange,
  Warehouse, Send, Bot, FileText, ScrollText, ShieldCheck,
  Search, Bell, ChevronDown, Sparkles, LogOut, Menu, X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { roles } from "./mock-data";
import { cn } from "./ui/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inbound", label: "Inbound Intake", icon: PackageOpen },
  { to: "/qc", label: "QC Release", icon: FlaskConical },
  { to: "/lots", label: "Lot Traceability", icon: Boxes },
  { to: "/ppic", label: "PPIC Board", icon: CalendarRange },
  { to: "/warehouse", label: "Warehouse", icon: Warehouse },
  { to: "/dispatch", label: "Dispatch", icon: Send },
  { to: "/copilot", label: "Ops Copilot", icon: Bot },
  { to: "/summary", label: "Daily Summary", icon: FileText },
  { to: "/policy", label: "Policy Rules", icon: ShieldCheck },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [role, setRole] = useState(roles[4]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const current = nav.find(n => n.to === location.pathname) || nav[0];

  if (location.pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full w-full bg-[#f7f8fa] text-slate-900">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-slate-900" style={{ fontWeight: 600 }}>BatchNexus</div>
            <div className="text-[11px] text-slate-500 -mt-0.5">Control Tower</div>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 px-3 py-2">Operations</div>
          <div className="space-y-0.5">
            {nav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.to === "/qc" && <Badge className="h-5 px-1.5 bg-violet-100 text-violet-700 border-0">3</Badge>}
                {item.to === "/warehouse" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-xs" style={{ fontWeight: 500 }}>AI Copilot Ready</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-3">Ask anything about lots, dispatch, or cold-chain.</p>
            <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 h-7">
              Open Copilot
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center gap-4 shrink-0">
          <button className="lg:hidden text-slate-600" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <current.icon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 hidden sm:inline">Operations /</span>
            <span className="text-sm text-slate-900 truncate" style={{ fontWeight: 500 }}>{current.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search lots, suppliers, customers..."
                className="pl-9 w-72 h-9 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs">PN</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs text-slate-900 leading-tight" style={{ fontWeight: 500 }}>Priya Naidu</div>
                    <div className="text-[10px] text-slate-500 leading-tight">{role.label}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Switch role (RBAC)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.map(r => (
                  <DropdownMenuItem key={r.id} onClick={() => setRole(r)} className="gap-2">
                    <span>{r.icon}</span>
                    <span className="flex-1">{r.label}</span>
                    {r.id === role.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
