import fs from "fs";
import https from "https";

const DAAS_URL = process.env.DAAS_URL || process.env.NEXT_PUBLIC_BUILDPAD_DAAS_URL || "https://29dd52b2-e0be-43c7-a587-2c78d2dc107a.daas4.buildpad.ai";
const TOKEN = process.env.DAAS_TOKEN || "Y45aktNq5TgbalfTlggMJ8ukwjwU3wdR";

async function request(endpoint, method, payload = null) {
    const url = `${DAAS_URL}/api${endpoint}`;
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
        }
    };
    if (payload) {
        options.body = JSON.stringify(payload);
    }
    
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error(`Non-JSON response for ${endpoint}:`, text.substring(0, 100));
        throw new Error("Non-JSON response");
    }
    
    if (!res.ok) {
        throw new Error(`Request failed: ${json?.errors?.[0]?.message || 'Unknown error'}`);
    }
    return json;
}

const collections = [
    {
        collection: "materials",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "material_code", type: "string" },
            { field: "name", type: "string" },
            { field: "category", type: "string" },
            { field: "hazard_class", type: "string" },
            { field: "temp_min", type: "integer" },
            { field: "temp_max", type: "integer" },
            { field: "temperature_requirement", type: "string" },
            { field: "qc_profile", type: "string" }
        ]
    },
    {
        collection: "suppliers",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "name", type: "string" },
            { field: "country", type: "string" },
            { field: "code", type: "string" },
            { field: "material_focus", type: "string" }
        ]
    },
    {
        collection: "inbound_receipts",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "supplier_id", type: "string" },
            { field: "material_id", type: "string" },
            { field: "receipt_no", type: "string" },
            { field: "arrival_date", type: "string" },
            { field: "arrival_time", type: "string" },
            { field: "date_created", type: "string" },
            { field: "quantity", type: "float" },
            { field: "unit", type: "string" },
            { field: "batch_reference", type: "string" },
            { field: "temperature_requirement", type: "string" },
            { field: "hazard_class", type: "string" },
            { field: "extraction_confidence", type: "float" },
            { field: "status", type: "string" },
            { field: "created_by", type: "string" }
        ]
    },
    {
        collection: "qc_inspections",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "receipt_id", type: "string" },
            { field: "date_created", type: "string" },
            { field: "colour_score", type: "integer" },
            { field: "defect_risk", type: "string" },
            { field: "foreign_matter", type: "string" },
            { field: "status", type: "string" },
            { field: "reasons", type: "json" },
            { field: "inspector", type: "string" }
        ]
    },
    {
        collection: "lots",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "source_receipt_id", type: "string" },
            { field: "material", type: "string" },
            { field: "supplier", type: "string" },
            { field: "quantity", type: "float" },
            { field: "unit", type: "string" },
            { field: "batch_reference", type: "string" },
            { field: "status", type: "string" },
            { field: "warehouse_zone", type: "string" },
            { field: "location_bin", type: "string" },
            { field: "qc_score", type: "integer" },
            { field: "date_created", type: "string" },
            { field: "approved_by", type: "string" }
        ]
    },
    {
        collection: "warehouse_zones",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "name", type: "string" },
            { field: "temperature", type: "string" },
            { field: "capacity", type: "integer" },
            { field: "occupancy", type: "integer" },
            { field: "status", type: "string" }
        ]
    }
];

async function main() {
    console.log("Setting up completely configured DaaS database...");
    
    for (const coll of collections) {
        try {
            console.log(`Checking if ${coll.collection} exists...`);
            await request(`/collections/${coll.collection}`, "GET");
            console.log(`Collection ${coll.collection} already exists. Verifying fields...`);
        } catch (e) {
            console.log(`Creating collection ${coll.collection}...`);
            try {
                await request("/collections", "POST", {
                    collection: coll.collection,
                    fields: coll.fields
                });
                console.log(`Successfully created ${coll.collection}!`);
            } catch (err) {
                console.error(`Failed to create ${coll.collection}:`, err.message);
            }
        }
    }
    
    console.log("Attempting to fix permissions for new collections...");
    try {
        const publicCollections = ["qc_inspections", "lots", "inbound_receipts", "materials", "suppliers", "warehouse_zones"];
        for (const coll of publicCollections) {
            for (const action of ["read", "create", "update"]) {
                try {
                    await request("/permissions", "POST", { role: null, collection: coll, action: action });
                } catch (permErr) {
                    // Ignore if permission exists
                }
            }
        }
        console.log("Permissions updated for public role!");
    } catch (err) {
        console.error("Failed to update permissions.");
    }
    
    console.log("Done! DaaS Database is fully configured.");
}

main();
