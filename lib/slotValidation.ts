// ─────────────────────────────────────────────────────────────────────────────
// BatchNexus — Slot Policy Validation Engine
// Validates warehouse slot assignments against zone policies (hazard class,
// temperature range, quarantine status) before allowing lot placement.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of validating a slot assignment against zone policies.
 */
export interface SlotValidationResult {
  valid: boolean;
  violations: PolicyViolation[];
}

/**
 * A single policy violation found during slot validation.
 */
export interface PolicyViolation {
  type: "hazard" | "temperature" | "quarantine";
  message: string;
  zone_id: string;
}

/**
 * Minimal Lot shape required for slot validation.
 * The lot's material properties (hazard_class, temp requirements) are needed.
 */
export interface LotForValidation {
  id: string;
  lot_number: string;
  material_id: string;
  hazard_class: string;
  temp_min: number;
  temp_max: number;
}

/**
 * Minimal Zone shape required for slot validation.
 */
export interface ZoneForValidation {
  id: string;
  name: string;
  temp_min: number;
  temp_max: number;
  hazard_policy: string;
  status: string;
}

/**
 * Minimal Bin shape required for slot validation.
 */
export interface BinForValidation {
  id: string;
  zone_id: string;
  bin_code: string;
}

/**
 * Checks whether a zone's hazard_policy permits the given hazard class.
 *
 * Policy rules:
 * - "Flammable allowed" → permits all hazard classes including "Flammable"
 * - "No flammable" → rejects "Flammable" materials
 * - "QC hold only" → rejects all materials (quarantine zone)
 * - Any other policy → rejects "Flammable" materials by default
 */
function isHazardCompatible(hazardClass: string, hazardPolicy: string): boolean {
  const policy = hazardPolicy.toLowerCase();

  // QC hold zones don't accept regular material placement
  if (policy.includes("qc hold")) {
    return false;
  }

  // Explicitly allows flammable
  if (policy.includes("flammable allowed")) {
    return true;
  }

  // Explicitly disallows flammable
  if (policy.includes("no flammable")) {
    return hazardClass.toLowerCase() !== "flammable";
  }

  // Default: non-flammable materials are always allowed
  return hazardClass.toLowerCase() !== "flammable";
}

/**
 * Checks whether a zone's temperature range encompasses the lot's
 * temperature requirement range.
 *
 * The zone must fully contain the lot's required range:
 * zone.temp_min <= lot.temp_min AND zone.temp_max >= lot.temp_max
 */
function isTemperatureCompatible(
  lotTempMin: number,
  lotTempMax: number,
  zoneTempMin: number,
  zoneTempMax: number
): boolean {
  return zoneTempMin <= lotTempMin && zoneTempMax >= lotTempMax;
}

/**
 * Checks whether a zone is in quarantine/hold status.
 */
function isQuarantineZone(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("qc hold") || s.includes("quarantine");
}

/**
 * Validates a slot assignment against zone policies.
 *
 * Checks performed:
 * 1. Hazard policy compatibility — zone must permit the lot's hazard class
 * 2. Temperature range — zone's temp range must encompass lot's temp requirement
 * 3. Quarantine status — zone must not be in quarantine/hold status
 *
 * @param lot - The lot to be assigned (with material hazard/temp properties)
 * @param zone - The target zone
 * @param bin - The target bin (used for context; must belong to the zone)
 * @returns SlotValidationResult with valid flag and any violations found
 */
export function validateSlotAssignment(
  lot: LotForValidation,
  zone: ZoneForValidation,
  bin: BinForValidation
): SlotValidationResult {
  const violations: PolicyViolation[] = [];

  // 1. Check quarantine status
  if (isQuarantineZone(zone.status)) {
    violations.push({
      type: "quarantine",
      message: `Zone "${zone.name}" (${zone.id}) is in quarantine/hold status and cannot accept new lot assignments.`,
      zone_id: zone.id,
    });
  }

  // 2. Check hazard policy compatibility
  if (!isHazardCompatible(lot.hazard_class, zone.hazard_policy)) {
    const reason = zone.hazard_policy.toLowerCase().includes("qc hold")
      ? `Zone "${zone.name}" (${zone.id}) is a QC hold zone and does not accept regular material placement.`
      : `Zone "${zone.name}" (${zone.id}) has policy "${zone.hazard_policy}" which does not permit materials with hazard class "${lot.hazard_class}".`;

    violations.push({
      type: "hazard",
      message: reason,
      zone_id: zone.id,
    });
  }

  // 3. Check temperature range compatibility
  if (!isTemperatureCompatible(lot.temp_min, lot.temp_max, zone.temp_min, zone.temp_max)) {
    violations.push({
      type: "temperature",
      message: `Zone "${zone.name}" (${zone.id}) temperature range (${zone.temp_min}°C to ${zone.temp_max}°C) does not encompass the lot's required range (${lot.temp_min}°C to ${lot.temp_max}°C).`,
      zone_id: zone.id,
    });
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
