// Fallback Data Layer for Hackathon Demo
import { INITIAL_DB, SEED_VERSION } from "./demoData";

const STORAGE_KEY = "batchnexus_demo_db";
const VERSION_KEY = "batchnexus_seed_version";

export function getDemoDB() {
    if (typeof window === "undefined") return INITIAL_DB;

    // Reseed automatically when the bundled demo data version changes so the
    // local fallback store never serves stale/empty data after an update.
    const storedVersion = Number(localStorage.getItem(VERSION_KEY) || "0");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && storedVersion === SEED_VERSION) {
        return JSON.parse(stored);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
    localStorage.setItem(VERSION_KEY, String(SEED_VERSION));
    return INITIAL_DB;
}

export function saveDemoDB(db: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDemoDB() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
    localStorage.setItem(VERSION_KEY, String(SEED_VERSION));
}

export function fallbackFetch(collection: string, options?: any) {
    const db = getDemoDB();
    let data = db[collection] || [];

    // Basic filtering for demo
    if (options?.filter) {
        Object.entries(options.filter).forEach(([key, val]) => {
            if (typeof val === 'object' && val !== null) {
                // simple equal handling for directus style
                if ('_eq' in val) {
                    data = data.filter((item: any) => item[key] === (val as any)._eq);
                }
            } else {
                data = data.filter((item: any) => item[key] === val);
            }
        });
    }
    
    // Sort logic (very basic for demo)
    if (options?.sort) {
        const desc = options.sort.startsWith('-');
        const field = options.sort.replace('-', '');
        data = [...data].sort((a: any, b: any) => {
            if (a[field] < b[field]) return desc ? 1 : -1;
            if (a[field] > b[field]) return desc ? -1 : 1;
            return 0;
        });
    }

    if (options?.limit) {
        data = data.slice(0, options.limit);
    }

    return { data, meta: { total: data.length } };
}

export function fallbackCreate(collection: string, payload: any) {
    const db = getDemoDB();
    if (!db[collection]) db[collection] = [];
    
    const newItem = {
        id: crypto.randomUUID(),
        date_created: new Date().toISOString(),
        ...payload
    };
    
    db[collection] = [newItem, ...db[collection]];
    saveDemoDB(db);
    return { data: newItem };
}

export function fallbackUpdate(collection: string, id: string, payload: any) {
    const db = getDemoDB();
    if (!db[collection]) db[collection] = [];
    
    const idx = db[collection].findIndex((i: any) => i.id === id);
    if (idx === -1) throw new Error("Item not found in fallback DB");
    
    db[collection][idx] = { ...db[collection][idx], ...payload };
    saveDemoDB(db);
    return { data: db[collection][idx] };
}
