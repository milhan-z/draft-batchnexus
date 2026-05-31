/**
 * Seed Script — Populates the BuildPad DaaS (Directus) backend with realistic
 * demo data for the BatchNexus Control Tower hackathon pitch.
 *
 * Connection (in priority order):
 *   1. CLI args:   node scripts/seed-daas.mjs <url> <token>
 *   2. Env vars:   DAAS_URL + DAAS_TOKEN
 *   3. Env login:  DAAS_URL + DAAS_ADMIN_EMAIL + DAAS_ADMIN_PASSWORD
 *   4. Built-in fallback URL + admin credentials (last resort)
 *
 * The script waits out cold starts (BuildPad instances return 503 while waking)
 * and is idempotent-friendly: it logs failures per record and keeps going.
 *
 * Usage:
 *   node scripts/seed-daas.mjs
 *   node scripts/seed-daas.mjs https://<id>.daas4.buildpad.ai <static-token>
 */

// ── Configuration ────────────────────────────────────────────
const argUrl = process.argv[2];
const argToken = process.argv[3];

const DAAS_URL = (argUrl || process.env.DAAS_URL || process.env.NEXT_PUBLIC_BUILDPAD_DAAS_URL ||
  "https://29dd52b2-e0be-43c7-a587-2c78d2dc107a.daas4.buildpad.ai").replace(/\/$/, "");

const STATIC_TOKEN = argToken || process.env.DAAS_TOKEN || "Y45aktNq5TgbalfTlggMJ8ukwjwU3wdR";
const ADMIN_EMAIL = process.env.DAAS_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.DAAS_ADMIN_PASSWORD || "IgYRlAre0X9qbTZWifnL";

let authToken = STATIC_TOKEN;

// ── Helpers ──────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for the instance to be reachable (handles BuildPad cold-start 503s). */
async function waitForServer(maxAttempts = 12) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${DAAS_URL}/server/health`, { method: "GET" });
      if (res.ok || res.status === 401 || res.status === 403) {
        console.log("✅ DaaS instance is reachable.\n");
        return true;
      }
      console.log(`   ⏳ Attempt ${attempt}/${maxAttempts}: server returned ${res.status} (waking up?)...`);
    } catch (err) {
      console.log(`   ⏳ Attempt ${attempt}/${maxAttempts}: ${err.message}`);
    }
    await sleep(5000);
  }
  return false;
}

/** Try to obtain an admin token via login (fallback when static token fails). */
async function tryAdminLogin() {
  try {
    const res = await fetch(`${DAAS_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.access_token) {
        authToken = json.data.access_token;
        console.log("🔑 Authenticated via admin login.\n");
        return true;
      }
    }
    console.log(`   ℹ️ Admin login returned ${res.status}; continuing with static token.`);
  } catch (err) {
    console.log(`   ℹ️ Admin login failed: ${err.message}; continuing with static token.`);
  }
  return false;
}

async function post(collection, body) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${DAAS_URL}/api/items/${collection}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 503) {
        console.log(`   ⏳ ${collection}: 503, retrying...`);
        await sleep(4000);
        continue;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`❌ ${collection}: ${res.status} ${JSON.stringify(json).slice(0, 160)}`);
        return null;
      }
      console.log(`✅ ${collection}: ${json.data?.id ?? "ok"}`);
      return json.data;
    } catch (err) {
      console.log(`   ⏳ ${collection}: ${err.message}, retrying...`);
      await sleep(3000);
    }
  }
  console.error(`❌ ${collection}: gave up after retries.`);
  return null;
}

// ── Seed routine ─────────────────────────────────────────────
async function main() {
  console.log(`🌱 BatchNexus DaaS seed`);
  console.log(`   URL: ${DAAS_URL}\n`);

  const reachable = await waitForServer();
  if (!reachable) {
    console.error("\n❌ DaaS instance is not reachable (still 503/unavailable).");
    console.error("   The BuildPad instance is likely suspended. Wake/restart it from the");
    console.error("   BuildPad dashboard, then run this script again.\n");
    process.exit(1);
  }

  await tryAdminLogin();

  // ─── 1. Suppliers ──────────────────────────────────────
  const sup1 = await post("suppliers", { name: "KTA Ponorogo", code: "KTA-PON", country: "Indonesia", contact_email: "supply@kta-ponorogo.co.id" });
  const sup2 = await post("suppliers", { name: "Java Citrus Farm", code: "JCF", country: "Indonesia", contact_email: "ops@javacitrus.co.id" });
  const sup3 = await post("suppliers", { name: "Flores Botanica", code: "FLB", country: "Indonesia", contact_email: "hello@floresbotanica.id" });

  // ─── 2. Materials ─────────────────────────────────────
  const mat1 = await post("materials", { name: "Lavender Absolute", type: "Essential Oil", hazard_class: "Flammable", default_temp: "Ambient", temp_min: 15, temp_max: 30 });
  const mat2 = await post("materials", { name: "Citrus Peel Extract", type: "Extract Liquid", hazard_class: "Flammable", default_temp: "-20 to -4°C", temp_min: -20, temp_max: -4 });
  const mat3 = await post("materials", { name: "Sandalwood Oil", type: "Essential Oil", hazard_class: "Normal", default_temp: "Ambient", temp_min: 15, temp_max: 30 });
  const mat4 = await post("materials", { name: "Rose Absolute", type: "Essential Oil", hazard_class: "Normal", default_temp: "Chilled", temp_min: 2, temp_max: 8 });
  const mat5 = await post("materials", { name: "Clove Bud Oil", type: "Essential Oil", hazard_class: "Flammable", default_temp: "Ambient", temp_min: 15, temp_max: 30 });

  // ─── 3. Warehouse Zones ───────────────────────────────
  const zoneAmb = await post("warehouse_zones", { name: "AMB-A", temp_min: 15, temp_max: 30, hazard_class_allowed: "Normal", capacity: 40, occupied: 22, status: "Active" });
  const zoneCold = await post("warehouse_zones", { name: "COLD-B", temp_min: 2, temp_max: 8, hazard_class_allowed: "Normal", capacity: 24, occupied: 15, status: "Active" });
  const zoneFrz = await post("warehouse_zones", { name: "FRZ-C", temp_min: -25, temp_max: -4, hazard_class_allowed: "Normal", capacity: 18, occupied: 16, current_temperature: -3, status: "Cold-chain Alert" });
  const zoneHaz = await post("warehouse_zones", { name: "HAZ-D", temp_min: -25, temp_max: 30, hazard_class_allowed: "Flammable", capacity: 30, occupied: 20, status: "Active" });

  // ─── 4. Warehouse Bins ────────────────────────────────
  const zoneBins = [
    [zoneAmb, "AMB-A", 6, 20], [zoneCold, "COLD-B", 6, 15],
    [zoneFrz, "FRZ-C", 4, 12], [zoneHaz, "HAZ-D", 6, 10],
  ];
  for (const [zone, prefix, count, cap] of zoneBins) {
    if (!zone) continue;
    for (let i = 1; i <= count; i++) {
      await post("warehouse_bins", {
        name: `${prefix}-0${i}`,
        capacity_drums: cap,
        occupied_drums: i <= 3 ? Math.floor(Math.random() * (cap - 2)) + 1 : 0,
        zone_id: zone.id,
      });
    }
  }

  // ─── 5. Inbound Receipts ──────────────────────────────
  const rec1 = await post("inbound_receipts", { supplier_id: sup1?.id, material_id: mat1?.id, quantity: 150, unit: "kg", arrival_date: "2026-05-27", batch_reference: "BGR-24-LVA", temperature_requirement: "Ambient", hazard_class: "Flammable", status: "QC Released" });
  const rec2 = await post("inbound_receipts", { supplier_id: sup2?.id, material_id: mat2?.id, quantity: 500, unit: "kg", arrival_date: "2026-05-28", batch_reference: "JCF-CIT-0526", temperature_requirement: "-20 to -4°C", hazard_class: "Flammable", status: "Pending QC" });
  await post("inbound_receipts", { supplier_id: sup3?.id, material_id: mat3?.id, quantity: 25, unit: "kg", arrival_date: "2026-05-28", batch_reference: "IND-99-SAN", temperature_requirement: "Ambient", hazard_class: "Normal", status: "Needs Review" });
  await post("inbound_receipts", { supplier_id: sup1?.id, material_id: mat4?.id, quantity: 30, unit: "kg", arrival_date: "2026-05-29", batch_reference: "FLB-RS-0529", temperature_requirement: "Chilled", hazard_class: "Normal", status: "Pending QC" });
  await post("inbound_receipts", { supplier_id: sup1?.id, material_id: mat5?.id, quantity: 200, unit: "kg", arrival_date: "2026-05-29", batch_reference: "KTA-CLV-0529", temperature_requirement: "Ambient", hazard_class: "Flammable", status: "Pending QC" });

  // ─── 6. QC Inspection + Lot for the released receipt ──
  if (rec1) {
    await post("qc_inspections", {
      receipt_id: rec1.id, ai_color_score: 92, ai_defect_risk: 0.08, ai_foreign_matter_risk: 0.05,
      ai_recommendation: "Pass", human_decision: "QC Released", lot_number_generated: "LOT-2026-049",
      comments: "Approved by Rani Wulandari. Excellent quality batch.",
    });
    if (mat1) await post("lots", { lot_number: "LOT-2026-049", quantity: 150, status: "Stored", current_location: "HAZ-D-04", receipt_id: rec1.id, material_id: mat1.id });
  }
  // A second stored lot used across the golden demo (LOT-2026-051)
  if (rec2 && mat2) {
    await post("lots", { lot_number: "LOT-2026-051", quantity: 12, status: "Stored", current_location: "HAZ-D-04", receipt_id: rec2.id, material_id: mat2.id });
  }

  // ─── 7. Sample Dispatches ─────────────────────────────
  await post("sample_dispatches", { lot_number: "LOT-2026-051", material_name: "Citrus Peel Extract", destination: "Export — Singapore", dispatch_type: "Sample", quantity_sample: 2, status: "In Dispatch" });
  await post("sample_dispatches", { lot_number: "LOT-2026-051", material_name: "Citrus Peel Extract", destination: "Local — Jakarta", dispatch_type: "Sample", quantity_sample: 1, status: "Pending Courier" });

  // ─── 8. Audit Log (seed history) ──────────────────────
  const auditSeed = [
    { actor: "Dimas Pratama", role: "Receiving Operator", action: "Completed AI extraction", entity: "BGR-24-LVA", change_detail: "Lavender Absolute extracted with 92% confidence." },
    { actor: "Rani Wulandari", role: "QC Staff", action: "Approved QC release", entity: "BGR-24-LVA", change_detail: "Status: Pending QC → QC Released." },
    { actor: "System", role: "BatchNexus", action: "Generated lot number", entity: "LOT-2026-049", change_detail: "Lot created from BGR-24-LVA." },
    { actor: "Andi Saputra", role: "Warehouse Admin", action: "Assigned warehouse slot", entity: "LOT-2026-049", change_detail: "LOT-2026-049 assigned to HAZ-D-04." },
  ];
  for (const a of auditSeed) await post("audit_logs", { ...a, timestamp: new Date().toISOString() });

  console.log("\n🎉 Seed complete! Your DaaS is ready for the demo.");
}

main().catch((e) => { console.error(e); process.exit(1); });
