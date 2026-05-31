import fs from "fs";
import https from "https";

const DAAS_URL = process.env.DAAS_URL || process.env.NEXT_PUBLIC_BUILDPAD_DAAS_URL || "https://29dd52b2-e0be-43c7-a587-2c78d2dc107a.daas4.buildpad.ai";
const TOKEN = process.env.DAAS_TOKEN || "Y45aktNq5TgbalfTlggMJ8ukwjwU3wdR";

async function request(endpoint, method, payload = null) {
    const url = `${DAAS_URL}${endpoint}`;
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
    const json = await res.json();
    if (!res.ok) {
        console.error(`Error ${method} ${endpoint}:`, JSON.stringify(json, null, 2));
        throw new Error("Request failed");
    }
    return json;
}

const collections = [
    {
        collection: "audit_logs",
        fields: [
            { field: "id", type: "uuid", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "timestamp", type: "timestamp" },
            { field: "actor", type: "string" },
            { field: "role", type: "string" },
            { field: "action", type: "string" },
            { field: "entity", type: "string" },
            { field: "change_detail", type: "text" }
        ]
    },
    {
        collection: "temperature_readings",
        fields: [
            { field: "id", type: "string", schema: { is_primary_key: true, has_auto_increment: false } },
            { field: "zone_id", type: "string" },
            { field: "recorded_at", type: "string" },
            { field: "temperature_c", type: "float" },
            { field: "status", type: "string" }
        ]
    }
];

async function main() {
    console.log("Creating collections...");
    for (const coll of collections) {
        try {
            console.log(`Checking if ${coll.collection} exists...`);
            await request(`/collections/${coll.collection}`, "GET");
            console.log(`Collection ${coll.collection} already exists.`);
        } catch (e) {
            console.log(`Creating collection ${coll.collection}...`);
            try {
                await request("/collections", "POST", {
                    collection: coll.collection,
                    fields: coll.fields
                });
                console.log(`Successfully created ${coll.collection}!`);
            } catch (err) {
                console.error(`Failed to create ${coll.collection}:`, err);
            }
        }
    }
    
    console.log("Attempting to fix permissions...");
    try {
        const permissionsPayload = [
            { role: null, collection: "audit_logs", action: "create" },
            { role: null, collection: "audit_logs", action: "read" },
            { role: null, collection: "temperature_readings", action: "create" },
            { role: null, collection: "temperature_readings", action: "read" }
        ];
        
        for (const p of permissionsPayload) {
            try {
                await request("/permissions", "POST", p);
            } catch (permErr) {
                // Ignore if permission exists
            }
        }
        console.log("Permissions updated for public role!");
    } catch (err) {
        console.error("Failed to update permissions.");
    }
    
    console.log("Done!");
}

main();
