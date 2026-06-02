import { MemoryRouter, Routes, Route } from "react-router";
import { AppShell } from "./components/app-shell";
import { DashboardPage } from "./components/pages/dashboard";
import { LoginPage } from "./components/pages/login";
import { InboundPage } from "./components/pages/inbound";
import { QcPage } from "./components/pages/qc";
import { LotsPage } from "./components/pages/lots";
import { PpicPage } from "./components/pages/ppic";
import { WarehousePage } from "./components/pages/warehouse";
import { DispatchPage } from "./components/pages/dispatch";
import { CopilotPage } from "./components/pages/copilot";
import { SummaryPage } from "./components/pages/summary";
import { PolicyPage } from "./components/pages/policy";
import { AuditPage } from "./components/pages/audit";

export default function App() {
  return (
    <div className="size-full">
      <MemoryRouter initialEntries={["/"]}>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/inbound" element={<InboundPage />} />
            <Route path="/qc" element={<QcPage />} />
            <Route path="/lots" element={<LotsPage />} />
            <Route path="/ppic" element={<PpicPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/dispatch" element={<DispatchPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Routes>
        </AppShell>
      </MemoryRouter>
    </div>
  );
}
