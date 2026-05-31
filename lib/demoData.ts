// ─────────────────────────────────────────────────────────────────────────────
// BatchNexus — Demo / Fallback Seed Data
// A realistic "day of operations" for Sima Arôme so every screen looks populated
// and dashboard KPIs are driven by real records (no faked numbers).
//
// Bump SEED_VERSION whenever this data shape/content changes so the local
// fallback store reseeds automatically on next load.
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_VERSION = 3;

// Anchor the demo "today" to the submission date for consistent timestamps.
const TODAY = "2026-05-31";
const t = (time: string, day: string = TODAY) => `${day}T${time}:00+07:00`;

export const DEMO_USERS = [
    { id: "USR-001", name: "Dimas Pratama", role: "Receiving Operator", department: "Warehouse" },
    { id: "USR-002", name: "Rani Wulandari", role: "QC Staff", department: "Quality" },
    { id: "USR-003", name: "Budi Hartono", role: "PPIC Planner", department: "Planning" },
    { id: "USR-004", name: "Andi Saputra", role: "Warehouse Admin", department: "Warehouse" },
    { id: "USR-005", name: "Maya Santoso", role: "Operations Manager", department: "Operations" },
    { id: "USR-006", name: "Sari Putri", role: "Customer Service", department: "Commercial" },
];

export const DEMO_SUPPLIERS = [
    { id: "SUP-001", name: "Java Citrus Farm", country: "Indonesia", code: "JCF", material_focus: "Citrus peel & fruit extracts" },
    { id: "SUP-002", name: "KTA Ponorogo", country: "Indonesia", code: "KTA", material_focus: "Clove & spice oils" },
    { id: "SUP-003", name: "Bali Essential Co.", country: "Indonesia", code: "BEC", material_focus: "Floral absolutes" },
    { id: "SUP-004", name: "Sulawesi Spice Trade", country: "Indonesia", code: "SST", material_focus: "Lemongrass & ginger" },
    { id: "SUP-005", name: "Madura Clove Coop", country: "Indonesia", code: "MCC", material_focus: "Clove buds" },
    { id: "SUP-006", name: "Borneo Naturals", country: "Indonesia", code: "BNL", material_focus: "Patchouli & resins" },
];

export const DEMO_MATERIALS = [
    { id: "MAT-001", material_code: "CIT-EXT-001", name: "Citrus Peel Extract", category: "Extract Liquid", hazard_class: "Flammable", temp_min: -20, temp_max: -4, temperature_requirement: "-20°C to -4°C", qc_profile: "extract-liquid-visual" },
    { id: "MAT-002", material_code: "CLV-OIL-002", name: "Clove Bud Oil", category: "Essential Oil", hazard_class: "Flammable", temp_min: 15, temp_max: 30, temperature_requirement: "Ambient", qc_profile: "essential-oil-visual" },
    { id: "MAT-003", material_code: "LAV-ABS-003", name: "Lavender Absolute", category: "Essential Oil", hazard_class: "Flammable", temp_min: 2, temp_max: 8, temperature_requirement: "Chilled (2-8°C)", qc_profile: "essential-oil-visual" },
    { id: "MAT-004", material_code: "LMG-OIL-004", name: "Lemongrass Oil", category: "Essential Oil", hazard_class: "Flammable", temp_min: 15, temp_max: 30, temperature_requirement: "Ambient", qc_profile: "essential-oil-visual" },
    { id: "MAT-005", material_code: "VAN-EXT-005", name: "Vanilla Extract", category: "Extract Liquid", hazard_class: "Normal", temp_min: -20, temp_max: -4, temperature_requirement: "-20°C to -4°C", qc_profile: "extract-liquid-visual" },
    { id: "MAT-006", material_code: "GNG-OLE-006", name: "Ginger Oleoresin", category: "Oleoresin", hazard_class: "Normal", temp_min: 2, temp_max: 8, temperature_requirement: "Chilled (2-8°C)", qc_profile: "oleoresin-visual" },
    { id: "MAT-007", material_code: "PAT-OIL-007", name: "Patchouli Oil", category: "Essential Oil", hazard_class: "Flammable", temp_min: 15, temp_max: 30, temperature_requirement: "Ambient", qc_profile: "essential-oil-visual" },
    { id: "MAT-008", material_code: "CIN-POW-008", name: "Cinnamon Bark Powder", category: "Powder", hazard_class: "Normal", temp_min: 15, temp_max: 30, temperature_requirement: "Ambient", qc_profile: "powder-visual" },
];

// 12 inbound receipts across the operational chain and various statuses.
export const DEMO_RECEIPTS = [
    { id: "REC-2026-001", supplier_id: "SUP-002", material_id: "MAT-002", receipt_no: "REC-2026-001", arrival_date: TODAY, arrival_time: t("07:40"), date_created: t("07:40"), quantity: 8, unit: "drums", batch_reference: "KTA-CLV-0531", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.93, status: "Pending QC", created_by: "USR-001" },
    { id: "REC-2026-002", supplier_id: "SUP-001", material_id: "MAT-001", receipt_no: "REC-2026-002", arrival_date: TODAY, arrival_time: t("09:10"), date_created: t("09:10"), quantity: 12, unit: "drums", batch_reference: "JCF-CIT-0531", temperature_requirement: "-20°C to -4°C", hazard_class: "Flammable", extraction_confidence: 0.91, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-003", supplier_id: "SUP-004", material_id: "MAT-004", receipt_no: "REC-2026-003", arrival_date: TODAY, arrival_time: t("08:25"), date_created: t("08:25"), quantity: 200, unit: "L", batch_reference: "SST-LMG-0531", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.88, status: "Pending QC", created_by: "USR-001" },
    { id: "REC-2026-004", supplier_id: "SUP-003", material_id: "MAT-003", receipt_no: "REC-2026-004", arrival_date: TODAY, arrival_time: t("08:55"), date_created: t("08:55"), quantity: 40, unit: "kg", batch_reference: "BEC-LAV-0531", temperature_requirement: "Chilled (2-8°C)", hazard_class: "Flammable", extraction_confidence: 0.95, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-005", supplier_id: "SUP-005", material_id: "MAT-002", receipt_no: "REC-2026-005", arrival_date: TODAY, arrival_time: t("10:05"), date_created: t("10:05"), quantity: 500, unit: "kg", batch_reference: "MCC-CLV-0531", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.72, status: "Needs Review", created_by: "USR-001" },
    { id: "REC-2026-006", supplier_id: "SUP-006", material_id: "MAT-007", receipt_no: "REC-2026-006", arrival_date: TODAY, arrival_time: t("10:40"), date_created: t("10:40"), quantity: 60, unit: "L", batch_reference: "BNL-PAT-0531", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.67, status: "Blocked", created_by: "USR-001" },
    { id: "REC-2026-007", supplier_id: "SUP-001", material_id: "MAT-005", receipt_no: "REC-2026-007", arrival_date: TODAY, arrival_time: t("11:15"), date_created: t("11:15"), quantity: 6, unit: "drums", batch_reference: "JCF-VAN-0531", temperature_requirement: "-20°C to -4°C", hazard_class: "Normal", extraction_confidence: 0.9, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-008", supplier_id: "SUP-004", material_id: "MAT-006", receipt_no: "REC-2026-008", arrival_date: TODAY, arrival_time: t("11:50"), date_created: t("11:50"), quantity: 120, unit: "kg", batch_reference: "SST-GNG-0531", temperature_requirement: "Chilled (2-8°C)", hazard_class: "Normal", extraction_confidence: 0.86, status: "Pending QC", created_by: "USR-001" },
    { id: "REC-2026-009", supplier_id: "SUP-002", material_id: "MAT-008", receipt_no: "REC-2026-009", arrival_date: "2026-05-30", arrival_time: t("13:20", "2026-05-30"), date_created: t("13:20", "2026-05-30"), quantity: 300, unit: "kg", batch_reference: "KTA-CIN-0530", temperature_requirement: "Ambient", hazard_class: "Normal", extraction_confidence: 0.89, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-010", supplier_id: "SUP-003", material_id: "MAT-003", receipt_no: "REC-2026-010", arrival_date: "2026-05-30", arrival_time: t("14:35", "2026-05-30"), date_created: t("14:35", "2026-05-30"), quantity: 25, unit: "kg", batch_reference: "BEC-LAV-0530", temperature_requirement: "Chilled (2-8°C)", hazard_class: "Flammable", extraction_confidence: 0.94, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-011", supplier_id: "SUP-006", material_id: "MAT-007", receipt_no: "REC-2026-011", arrival_date: "2026-05-30", arrival_time: t("15:10", "2026-05-30"), date_created: t("15:10", "2026-05-30"), quantity: 45, unit: "L", batch_reference: "BNL-PAT-0530", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.9, status: "QC Released", created_by: "USR-001" },
    { id: "REC-2026-012", supplier_id: "SUP-005", material_id: "MAT-002", receipt_no: "REC-2026-012", arrival_date: "2026-05-30", arrival_time: t("16:00", "2026-05-30"), date_created: t("16:00", "2026-05-30"), quantity: 400, unit: "kg", batch_reference: "MCC-CLV-0530", temperature_requirement: "Ambient", hazard_class: "Flammable", extraction_confidence: 0.92, status: "QC Released", created_by: "USR-001" },
];

export const DEMO_QC_INSPECTIONS = [
    { id: "QC-2026-002", receipt_id: "REC-2026-002", colour_score: 87, defect_risk: "Low", foreign_matter_risk: "Low", recommendation: "Pass with human review", confidence: 0.86, reason_codes: ["Colour is within expected range", "No visible dark spots detected", "Texture appears consistent"], human_decision: "QC Released", inspected_by: "USR-002", date_created: t("10:42"), inspected_at: t("10:42") },
    { id: "QC-2026-004", receipt_id: "REC-2026-004", colour_score: 92, defect_risk: "Low", foreign_matter_risk: "Low", recommendation: "Pass", confidence: 0.94, reason_codes: ["Floral colour profile excellent", "Clarity within spec", "No sediment detected"], human_decision: "QC Released", inspected_by: "USR-002", date_created: t("09:30"), inspected_at: t("09:30") },
    { id: "QC-2026-006", receipt_id: "REC-2026-006", colour_score: 58, defect_risk: "High", foreign_matter_risk: "Medium", recommendation: "Block Material", confidence: 0.74, reason_codes: ["⚠ Colour darker than reference standard", "⚠ Possible particulate contamination", "Odor deviation flagged"], human_decision: "Blocked", inspected_by: "USR-002", date_created: t("11:05"), inspected_at: t("11:05") },
    { id: "QC-2026-007", receipt_id: "REC-2026-007", colour_score: 90, defect_risk: "Low", foreign_matter_risk: "Low", recommendation: "Pass", confidence: 0.9, reason_codes: ["Colour within expected range", "Clarity verified", "Texture consistent"], human_decision: "QC Released", inspected_by: "USR-002", date_created: t("11:40"), inspected_at: t("11:40") },
    { id: "QC-2026-009", receipt_id: "REC-2026-009", colour_score: 84, defect_risk: "Low", foreign_matter_risk: "Low", recommendation: "Pass with human review", confidence: 0.83, reason_codes: ["Powder colour consistent", "Particle size uniform", "No clumping detected"], human_decision: "QC Released", inspected_by: "USR-002", date_created: t("14:00", "2026-05-30"), inspected_at: t("14:00", "2026-05-30") },
];

// 8 lots in various lifecycle stages (Awaiting Slot, Stored, Dispatched).
export const DEMO_LOTS = [
    { id: "LOT-2026-044", lot_number: "LOT-2026-044", source_receipt_id: "REC-2026-009", receipt_id: "REC-2026-009", material_id: "MAT-008", quantity: 300, status: "Stored", current_location: "AMB-A-02", released_at: t("14:05", "2026-05-30"), date_created: t("14:05", "2026-05-30") },
    { id: "LOT-2026-045", lot_number: "LOT-2026-045", source_receipt_id: "REC-2026-010", receipt_id: "REC-2026-010", material_id: "MAT-003", quantity: 25, status: "Stored", current_location: "COLD-B-01", released_at: t("15:00", "2026-05-30"), date_created: t("15:00", "2026-05-30") },
    { id: "LOT-2026-046", lot_number: "LOT-2026-046", source_receipt_id: "REC-2026-011", receipt_id: "REC-2026-011", material_id: "MAT-007", quantity: 45, status: "Dispatched", current_location: "HAZ-D-02", released_at: t("15:40", "2026-05-30"), date_created: t("15:40", "2026-05-30") },
    { id: "LOT-2026-047", lot_number: "LOT-2026-047", source_receipt_id: "REC-2026-012", receipt_id: "REC-2026-012", material_id: "MAT-002", quantity: 400, status: "Stored", current_location: "HAZ-D-03", released_at: t("16:30", "2026-05-30"), date_created: t("16:30", "2026-05-30") },
    { id: "LOT-2026-049", lot_number: "LOT-2026-049", source_receipt_id: "REC-2026-004", receipt_id: "REC-2026-004", material_id: "MAT-003", quantity: 40, status: "Awaiting Slot", current_location: null, released_at: t("09:35"), date_created: t("09:35") },
    { id: "LOT-2026-050", lot_number: "LOT-2026-050", source_receipt_id: "REC-2026-007", receipt_id: "REC-2026-007", material_id: "MAT-005", quantity: 6, status: "Awaiting Slot", current_location: null, released_at: t("11:45"), date_created: t("11:45") },
    { id: "LOT-2026-051", lot_number: "LOT-2026-051", source_receipt_id: "REC-2026-002", receipt_id: "REC-2026-002", material_id: "MAT-001", quantity: 12, status: "Stored", current_location: "HAZ-D-04", released_at: t("10:45"), date_created: t("10:45") },
];

export const DEMO_PRODUCTION_ORDERS = [
    { id: "PO-2026-021", order_no: "PO-2026-021", material_id: "MAT-001", quantity: 12, planned_start: TODAY, planned_end: "2026-06-02", status: "Scheduled", priority: "High" },
    { id: "PO-2026-022", order_no: "PO-2026-022", material_id: "MAT-003", quantity: 40, planned_start: "2026-06-02", planned_end: "2026-06-03", status: "Queued", priority: "Normal" },
    { id: "PO-2026-023", order_no: "PO-2026-023", material_id: "MAT-002", quantity: 400, planned_start: "2026-06-03", planned_end: "2026-06-05", status: "Queued", priority: "Normal" },
];

export const DEMO_WAREHOUSE_ZONES = [
    { id: "AMB-A", name: "Ambient storage", temp_min: 15, temp_max: 30, hazard_policy: "No flammable", capacity: 40, occupied: 24, current_temperature: 24, status: "Active" },
    { id: "COLD-B", name: "Cold storage", temp_min: -4, temp_max: 4, hazard_policy: "No flammable", capacity: 24, occupied: 15, current_temperature: 2, status: "Active" },
    { id: "FRZ-C", name: "Freezer storage", temp_min: -20, temp_max: -4, hazard_policy: "No flammable", capacity: 18, occupied: 16, current_temperature: -3, status: "Cold-chain Alert" },
    { id: "HAZ-D", name: "Hazard-compatible storage", temp_min: -20, temp_max: 25, hazard_policy: "Flammable allowed", capacity: 30, occupied: 21, current_temperature: 12, status: "Active" },
    { id: "HOLD-QC", name: "Quarantine", temp_min: 15, temp_max: 30, hazard_policy: "QC hold only", capacity: 12, occupied: 4, current_temperature: 23, status: "QC hold" },
];

export const DEMO_WAREHOUSE_BINS = [
    { id: "BIN-AMB-A-02", zone_id: "AMB-A", bin_code: "AMB-A-02", capacity: 12, occupied: 12, status: "Occupied" },
    { id: "BIN-COLD-B-01", zone_id: "COLD-B", bin_code: "COLD-B-01", capacity: 12, occupied: 8, status: "Occupied" },
    { id: "BIN-HAZ-D-02", zone_id: "HAZ-D", bin_code: "HAZ-D-02", capacity: 12, occupied: 0, status: "Available" },
    { id: "BIN-HAZ-D-03", zone_id: "HAZ-D", bin_code: "HAZ-D-03", capacity: 12, occupied: 12, status: "Occupied" },
    { id: "BIN-HAZ-D-04", zone_id: "HAZ-D", bin_code: "HAZ-D-04", capacity: 12, occupied: 12, status: "Occupied" },
];

export const DEMO_INVENTORY_MOVES = [
    { id: "MOVE-2026-001", lot_id: "LOT-2026-051", to_bin_id: "BIN-HAZ-D-04", quantity: 12, moved_by: "Andi Saputra", date_created: t("11:05"), moved_at: t("11:05"), reason: "AI recommended slot accepted" },
    { id: "MOVE-2026-002", lot_id: "LOT-2026-044", to_bin_id: "BIN-AMB-A-02", quantity: 300, moved_by: "Andi Saputra", date_created: t("14:05", "2026-05-30"), moved_at: t("14:05", "2026-05-30"), reason: "AI recommended slot accepted" },
    { id: "MOVE-2026-003", lot_id: "LOT-2026-045", to_bin_id: "BIN-COLD-B-01", quantity: 25, moved_by: "Andi Saputra", date_created: t("15:00", "2026-05-30"), moved_at: t("15:00", "2026-05-30"), reason: "Cold-chain placement" },
    { id: "MOVE-2026-004", lot_id: "LOT-2026-047", to_bin_id: "BIN-HAZ-D-03", quantity: 400, moved_by: "Andi Saputra", date_created: t("16:30", "2026-05-30"), moved_at: t("16:30", "2026-05-30"), reason: "Hazard bay placement" },
];

// Cold-chain time series. FRZ-C shows a gradual excursion crossing the -4°C
// ceiling; COLD-B and HAZ-D stay within range. Used by the trend chart.
function buildTempSeries(zoneId: string, values: number[], min: number, max: number) {
    return values.map((v, i) => {
        const hh = String(7 + i).padStart(2, "0");
        return {
            id: `TEMP-${zoneId}-${i}`,
            zone_id: zoneId,
            recorded_at: t(`${hh}:00`),
            temperature_c: v,
            status: v < min || v > max ? "Cold-chain Alert" : "Normal",
        };
    });
}

export const DEMO_TEMPERATURE_READINGS = [
    ...buildTempSeries("FRZ-C", [-18, -17, -16, -14, -11, -8, -6, -4, -3, -3], -20, -4),
    ...buildTempSeries("COLD-B", [1, 2, 2, 1, 0, 1, 2, 3, 2, 2], -4, 4),
    ...buildTempSeries("HAZ-D", [11, 12, 12, 13, 12, 12, 11, 12, 13, 12], -20, 25),
];

export const DEMO_SAMPLE_DISPATCHES = [
    { id: "DSP-001", lot_id: "LOT-2026-051", lot_number: "LOT-2026-051", material_name: "Citrus Peel Extract", customer_name: "AromaWell Singapore", destination: "Export — Singapore", destination_type: "Export", country: "Singapore", dispatch_type: "Sample", quantity_sample: 2, status: "In Dispatch", date_created: t("09:00") },
    { id: "DSP-002", lot_id: "LOT-2026-051", lot_number: "LOT-2026-051", material_name: "Citrus Peel Extract", customer_name: "Nusantara Beverage Lab", destination: "Local — Jakarta", destination_type: "Local", country: "Indonesia", dispatch_type: "Sample", quantity_sample: 1, status: "Pending Courier", date_created: t("10:00") },
    { id: "DSP-003", lot_id: "LOT-2026-046", lot_number: "LOT-2026-046", material_name: "Patchouli Oil", customer_name: "Maison Aroma Paris", destination: "Export — France", destination_type: "Export", country: "France", dispatch_type: "Sample", quantity_sample: 3, status: "Dispatched", date_created: t("16:10", "2026-05-30") },
    { id: "DSP-004", lot_id: "LOT-2026-045", lot_number: "LOT-2026-045", material_name: "Lavender Absolute", customer_name: "Sakura Cosmetics Japan", destination: "Export — Japan", destination_type: "Export", country: "Japan", dispatch_type: "Trial", quantity_sample: 2, status: "In Dispatch", date_created: t("08:30") },
];

export const DEMO_AUDIT_LOG = [
    { id: "AUD-001", timestamp: t("07:40"), date_created: t("07:40"), actor: "Dimas Pratama", role: "Receiving Operator", action: "Completed AI extraction", entity: "REC-2026-001", change_detail: "Clove Bud Oil from KTA Ponorogo extracted with 93% confidence." },
    { id: "AUD-002", timestamp: t("09:10"), date_created: t("09:10"), actor: "Dimas Pratama", role: "Receiving Operator", action: "Completed AI extraction", entity: "REC-2026-002", change_detail: "Supplier, material, quantity, temperature and hazard fields extracted with 91% confidence." },
    { id: "AUD-003", timestamp: t("09:18"), date_created: t("09:18"), actor: "Dimas Pratama", role: "Receiving Operator", action: "Submitted receipt to QC", entity: "REC-2026-002", change_detail: "Status changed from Draft to Pending QC." },
    { id: "AUD-004", timestamp: t("09:30"), date_created: t("09:30"), actor: "Rani Wulandari", role: "QC Staff", action: "Approved QC release", entity: "QC-2026-004", change_detail: "REC-2026-004 (Lavender Absolute) approved. Status: Pending QC → QC Released." },
    { id: "AUD-005", timestamp: t("10:42"), date_created: t("10:42"), actor: "Rani Wulandari", role: "QC Staff", action: "Approved QC release", entity: "QC-2026-002", change_detail: "Status changed from Pending QC to QC Released. AI confidence 86%." },
    { id: "AUD-006", timestamp: t("10:45"), date_created: t("10:45"), actor: "System", role: "BatchNexus", action: "Generated lot number", entity: "LOT-2026-051", change_detail: "Lot created from REC-2026-002." },
    { id: "AUD-007", timestamp: t("11:05"), date_created: t("11:05"), actor: "Rani Wulandari", role: "QC Staff", action: "Blocked QC release", entity: "QC-2026-006", change_detail: "REC-2026-006 (Patchouli Oil) blocked. Colour darker than reference and possible contamination." },
    { id: "AUD-008", timestamp: t("11:05"), date_created: t("11:05"), actor: "Andi Saputra", role: "Warehouse Admin", action: "Assigned warehouse slot", entity: "MOVE-2026-001", change_detail: "LOT-2026-051 assigned to HAZ-D-04." },
    { id: "AUD-009", timestamp: t("11:30"), date_created: t("11:30"), actor: "System", role: "BatchNexus", action: "Cold-chain alert raised", entity: "FRZ-C", change_detail: "Zone FRZ-C recorded -3°C, outside the required -20°C to -4°C range." },
    { id: "AUD-010", timestamp: t("12:05"), date_created: t("12:05"), actor: "Maya Santoso", role: "Operations Manager", action: "Generated AI Operations summary", entity: "Report", change_detail: "Daily operations summary generated from operational records." },
];

export const INITIAL_DB = {
    users: DEMO_USERS,
    suppliers: DEMO_SUPPLIERS,
    materials: DEMO_MATERIALS,
    inbound_receipts: DEMO_RECEIPTS,
    qc_inspections: DEMO_QC_INSPECTIONS,
    production_orders: DEMO_PRODUCTION_ORDERS,
    lots: DEMO_LOTS,
    warehouse_zones: DEMO_WAREHOUSE_ZONES,
    warehouse_bins: DEMO_WAREHOUSE_BINS,
    inventory_moves: DEMO_INVENTORY_MOVES,
    temperature_readings: DEMO_TEMPERATURE_READINGS,
    sample_dispatches: DEMO_SAMPLE_DISPATCHES,
    audit_logs: DEMO_AUDIT_LOG,
};
