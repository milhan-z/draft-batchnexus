import { INITIAL_DB } from "../lib/demoData";

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
        console.error(`Error ${method} ${endpoint}:`, JSON.stringify(json, null, 2));
        throw new Error(json?.errors?.[0]?.message || "Request failed");
    }
    return json;
}

async function main() {
    console.log("Seeding DaaS with initial demo data...");
    
    for (const [collection, records] of Object.entries(INITIAL_DB)) {
        console.log(`\nSeeding ${collection} (${records.length} items)...`);
        
        // Directus bulk upload might have issues, let's just insert one by one
        let successCount = 0;
        for (const item of records) {
            try {
                const res = await request(`/items/${collection}`, "POST", item);
                if (res && !res.error) successCount++;
            } catch(e) {
                console.log(`Failed item ${item.id}: ${e.message}`);
            }
        }
        console.log(`Successfully seeded ${successCount} items into ${collection}!`);
    }
    console.log("\nDone seeding!");
}

main();
