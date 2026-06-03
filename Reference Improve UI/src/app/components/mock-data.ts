export const suppliers = [
  { id: "SUP-001", name: "Java Spice Co.", country: "Indonesia", rating: 4.8 },
  { id: "SUP-002", name: "Ceylon Naturals", country: "Sri Lanka", rating: 4.6 },
  { id: "SUP-003", name: "Bali Botanicals", country: "Indonesia", rating: 4.9 },
  { id: "SUP-004", name: "Madagascar Aromatics", country: "Madagascar", rating: 4.7 },
  { id: "SUP-005", name: "Provence Fields", country: "France", rating: 4.5 },
];

export const materials = [
  { id: "MAT-101", name: "Vanilla Bean Extract", category: "Extract" },
  { id: "MAT-102", name: "Cinnamon Bark Oleoresin", category: "Extract" },
  { id: "MAT-103", name: "Lavender Essence", category: "Extract" },
  { id: "MAT-104", name: "Citrus Bergamot Oil", category: "Oil" },
  { id: "MAT-105", name: "Spearmint Powder", category: "Powder" },
  { id: "MAT-106", name: "Cardamom Concentrate", category: "Extract" },
  { id: "MAT-107", name: "Rose Hydrosol", category: "Hydrosol" },
];

export const lots = [
  { id: "LOT-2026-0142", lot_number: "LOT-2026-0142", material: "Vanilla Bean Extract", supplier: "Java Spice Co.", status: "QC Released", qty: "240 kg", created: "2 hours ago", temp: -18 },
  { id: "LOT-2026-0141", lot_number: "LOT-2026-0141", material: "Cinnamon Bark Oleoresin", supplier: "Ceylon Naturals", status: "Stored", qty: "180 kg", created: "4 hours ago", temp: -20 },
  { id: "LOT-2026-0140", lot_number: "LOT-2026-0140", material: "Lavender Essence", supplier: "Provence Fields", status: "Awaiting Slot", qty: "95 kg", created: "6 hours ago", temp: 4 },
  { id: "LOT-2026-0139", lot_number: "LOT-2026-0139", material: "Citrus Bergamot Oil", supplier: "Madagascar Aromatics", status: "Pending QC", qty: "320 kg", created: "8 hours ago", temp: 6 },
  { id: "LOT-2026-0138", lot_number: "LOT-2026-0138", material: "Spearmint Powder", supplier: "Bali Botanicals", status: "Dispatched", qty: "150 kg", created: "1 day ago", temp: 20 },
  { id: "LOT-2026-0137", lot_number: "LOT-2026-0137", material: "Cardamom Concentrate", supplier: "Java Spice Co.", status: "Blocked", qty: "210 kg", created: "1 day ago", temp: -18 },
  { id: "LOT-2026-0136", lot_number: "LOT-2026-0136", material: "Rose Hydrosol", supplier: "Provence Fields", status: "QC Released", qty: "75 kg", created: "2 days ago", temp: 4 },
];

export const zones = [
  { id: "Z-A1", name: "Cold Storage A1", type: "Cold-chain", temp: -19.2, min: -20, max: -18, occupancy: 78, capacity: 120, status: "OK" },
  { id: "Z-A2", name: "Cold Storage A2", type: "Cold-chain", temp: -16.8, min: -20, max: -18, occupancy: 92, capacity: 120, status: "Cold-chain Alert", current_temperature: -16.8, temp_min: -20, temp_max: -18 },
  { id: "Z-B1", name: "Chilled B1", type: "Chilled", temp: 3.8, min: 2, max: 8, occupancy: 45, capacity: 80, status: "OK" },
  { id: "Z-B2", name: "Chilled B2", type: "Chilled", temp: 5.2, min: 2, max: 8, occupancy: 60, capacity: 80, status: "OK" },
  { id: "Z-C1", name: "Ambient C1", type: "Ambient", temp: 21, min: 15, max: 25, occupancy: 30, capacity: 200, status: "OK" },
  { id: "Z-D1", name: "Hazmat D1", type: "Hazmat", temp: 19, min: 15, max: 25, occupancy: 15, capacity: 40, status: "OK" },
];

export const auditEvents = [
  { id: "AU-9821", action: "QC Released LOT-2026-0142", actor: "Sarah Chen", role: "QC Staff", time: "10 min ago", entity: "LOT-2026-0142", detail: "Vision score 96 · Δcolour 1.2 · Approved" },
  { id: "AU-9820", action: "Slot Assigned LOT-2026-0141", actor: "Marcus Vega", role: "Warehouse Admin", time: "32 min ago", entity: "LOT-2026-0141", detail: "Assigned to Zone A2 · Smart slot score 94" },
  { id: "AU-9819", action: "Cold-chain Alert Acknowledged", actor: "Priya Naidu", role: "Operations Manager", time: "1 hr ago", entity: "Z-A2", detail: "Variance -16.8°C noted · Maintenance dispatched" },
  { id: "AU-9818", action: "Inbound Receipt Created", actor: "Tomás Reyes", role: "Receiving Operator", time: "2 hr ago", entity: "REC-3421", detail: "AI-extracted from supplier WhatsApp · 7 fields confirmed" },
  { id: "AU-9817", action: "Lot Blocked LOT-2026-0137", actor: "Sarah Chen", role: "QC Staff", time: "3 hr ago", entity: "LOT-2026-0137", detail: "Defect risk 0.32 · Foreign-matter flagged · Recheck scheduled" },
  { id: "AU-9816", action: "Dispatch Confirmed", actor: "Lina Park", role: "Customer Service", time: "4 hr ago", entity: "DSP-0521", detail: "Sample to Aurora Beauty · 12kg · Courier picked up" },
  { id: "AU-9815", action: "Policy Updated: Cold-chain", actor: "Priya Naidu", role: "Operations Manager", time: "5 hr ago", entity: "POL-COLD-01", detail: "Excursion grace window changed 5min → 3min" },
];

export const dispatches = [
  { id: "DSP-0521", customer: "Aurora Beauty", destination: "Singapore", lot: "LOT-2026-0142", qty: "12 kg", status: "In Transit", eta: "Tomorrow 14:00", courier: "DHL Express" },
  { id: "DSP-0520", customer: "Verdant Wellness", destination: "Tokyo", lot: "LOT-2026-0136", qty: "8 kg", status: "Pending Courier", eta: "Today 18:00", courier: "FedEx" },
  { id: "DSP-0519", customer: "Maison Lumière", destination: "Paris", lot: "LOT-2026-0141", qty: "20 kg", status: "Preparing", eta: "Friday 10:00", courier: "DHL Express" },
  { id: "DSP-0518", customer: "Pure Forms Co.", destination: "Sydney", lot: "LOT-2026-0138", qty: "5 kg", status: "Delivered", eta: "Delivered 09:12", courier: "DHL Express" },
];

export const inboundReceipts = [
  { id: "REC-3421", supplier: "Java Spice Co.", material: "Vanilla Bean Extract", qty: "240 kg", lot_ref: "JSC-V-2412", status: "Pending QC", arrived: "2 hr ago", aiConfidence: 96 },
  { id: "REC-3420", supplier: "Madagascar Aromatics", material: "Citrus Bergamot Oil", qty: "320 kg", lot_ref: "MA-CB-1108", status: "Pending QC", arrived: "8 hr ago", aiConfidence: 89 },
  { id: "REC-3419", supplier: "Bali Botanicals", material: "Spearmint Powder", qty: "150 kg", lot_ref: "BB-SP-077", status: "Received", arrived: "1 day ago", aiConfidence: 94 },
  { id: "REC-3418", supplier: "Provence Fields", material: "Lavender Essence", qty: "95 kg", lot_ref: "PF-LE-203", status: "Received", arrived: "1 day ago", aiConfidence: 92 },
];

export const ppicJobs = {
  queued: [
    { id: "JOB-2201", product: "Vanilla Cream Base v3", qty: "500 kg", due: "Jun 5", priority: "Normal" },
    { id: "JOB-2202", product: "Bergamot Bath Oil", qty: "200 kg", due: "Jun 6", priority: "High" },
  ],
  prep: [
    { id: "JOB-2198", product: "Lavender Calming Serum", qty: "320 kg", due: "Jun 3", priority: "High" },
  ],
  active: [
    { id: "JOB-2195", product: "Cinnamon Aromatic Blend", qty: "180 kg", due: "Today", priority: "Critical" },
    { id: "JOB-2196", product: "Cardamom Body Oil", qty: "110 kg", due: "Today", priority: "Normal" },
  ],
  qcHold: [
    { id: "JOB-2190", product: "Rose Hydrosol Toner", qty: "60 kg", due: "Yesterday", priority: "High" },
  ],
  done: [
    { id: "JOB-2188", product: "Mint Cooling Mist", qty: "240 kg", due: "Jun 1", priority: "Normal" },
    { id: "JOB-2187", product: "Vanilla Body Butter", qty: "150 kg", due: "Jun 1", priority: "Normal" },
  ],
};

export const tempSeries = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  "Z-A1": Number((-19 + Math.sin(i / 3) * 0.6 + Math.cos(i / 2) * 0.15).toFixed(2)),
  "Z-A2": Number((-18 + Math.sin(i / 4) * 1.5 + (i > 15 ? 1.2 : 0) + Math.cos(i / 3) * 0.2).toFixed(2)),
  "Z-B1": Number((4 + Math.sin(i / 5) * 0.8 + Math.cos(i / 2) * 0.15).toFixed(2)),
}));

export const kpiTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  released: 18 + Math.round(Math.sin(i / 2) * 6 + Math.abs(Math.cos(i)) * 3),
  inbound: 22 + Math.round(Math.cos(i / 2) * 5 + Math.abs(Math.sin(i)) * 2),
}));

export const policies = [
  { id: "POL-COLD-01", category: "Cold-chain", name: "Cold-chain excursion grace window", value: "3 minutes", severity: "High", enabled: true },
  { id: "POL-COLD-02", category: "Cold-chain", name: "Min/Max temperature drift trigger", value: "±1.0°C", severity: "High", enabled: true },
  { id: "POL-HAZ-01", category: "Hazard", name: "Flammable / oxidizer segregation", value: "Required", severity: "Critical", enabled: true },
  { id: "POL-HAZ-02", category: "Hazard", name: "Food-grade isolation from solvents", value: "Required", severity: "Critical", enabled: true },
  { id: "POL-QC-01", category: "QC Release", name: "Min vision colour score", value: "≥ 85", severity: "Medium", enabled: true },
  { id: "POL-QC-02", category: "QC Release", name: "Max defect risk", value: "≤ 0.15", severity: "Medium", enabled: true },
  { id: "POL-DSP-01", category: "Dispatch", name: "Customer credit check", value: "Required", severity: "Medium", enabled: true },
  { id: "POL-DSP-02", category: "Dispatch", name: "Cold-chain courier verification", value: "Required for cold lots", severity: "High", enabled: true },
];

export const roles = [
  { id: "receiving", label: "Receiving Operator", icon: "📦" },
  { id: "qc", label: "QC Staff", icon: "🔬" },
  { id: "ppic", label: "PPIC Planner", icon: "📅" },
  { id: "warehouse", label: "Warehouse Admin", icon: "🏭" },
  { id: "ops", label: "Operations Manager", icon: "🎛️" },
  { id: "cs", label: "Customer Service", icon: "💬" },
];
