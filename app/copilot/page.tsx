"use client";
import { useState } from "react";
import { createItem } from "@/lib/api/client";
import { useRole, getActorName } from "@/lib/rbac";
import { getDemoDB } from "@/lib/demoStore";

interface SourceRecord {
    type: string;
    id: string;
    desc: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: SourceRecord[];
}

function searchDemoDB(query: string): { content: string; sources: SourceRecord[] } {
    const q = query.toLowerCase();
    const db = getDemoDB();

    const matName = (id: string) => db.materials?.find((m: any) => m.id === id)?.name || "material";
    const lotByNumber = (num: string) => db.lots?.find((l: any) => l.lot_number?.toLowerCase() === num.toLowerCase());

    // Direct lot-number lookup for any LOT-XXXX referenced in the query.
    const lotMatch = q.match(/lot[- ]?2026[- ]?(\d{2,4})/i);
    if (lotMatch) {
        const lotNum = `LOT-2026-${lotMatch[1].padStart(3, "0")}`;
        const lot = lotByNumber(lotNum) || db.lots?.find((l: any) => l.lot_number?.includes(lotMatch[1]));
        if (lot) {
            const linkedDisp = (db.sample_dispatches || []).filter((d: any) => d.lot_id === lot.id);
            const dispText = linkedDisp.length
                ? ` It is linked to ${linkedDisp.length} dispatch record(s): ${linkedDisp.map((d: any) => d.customer_name).join(", ")}.`
                : " No dispatch records are linked yet.";
            return {
                content: `${lot.lot_number} (${matName(lot.material_id)}) is currently "${lot.status}"${lot.current_location ? ` at ${lot.current_location}` : ""}.${dispText}`,
                sources: [
                    { type: "Lot record", id: lot.lot_number, desc: `Status: ${lot.status}` },
                    ...(lot.current_location ? [{ type: "Warehouse", id: lot.current_location, desc: "Storage bin" }] : []),
                    ...linkedDisp.map((d: any) => ({ type: "Dispatch", id: d.id, desc: d.customer_name })),
                ],
            };
        }
        return { content: `I could not find ${lotNum} in the operational records.`, sources: [] };
    }

    // Sample/dispatch queries
    if (q.includes("sample") || q.includes("dispatch") || q.includes("kirim")) {
        const dispatches = db.sample_dispatches || [];
        if (dispatches.length > 0) {
            const dspList = dispatches.map((d: any) => `${d.id} → ${d.customer_name} (${d.status})`).join(", ");
            return {
                content: `There are ${dispatches.length} sample dispatch records: ${dspList}.`,
                sources: dispatches.map((d: any) => ({ type: "Dispatch", id: d.id, desc: d.customer_name }))
            };
        }
        return { content: "No sample dispatch records found in the system.", sources: [] };
    }

    // Blocked queries
    if (q.includes("blocked") || q.includes("blok") || q.includes("ditolak") || q.includes("rejected")) {
        const blockedLots = (db.lots || []).filter((l: any) => l.status === "Blocked");
        const blockedReceipts = (db.inbound_receipts || []).filter((r: any) => r.status === "Blocked");
        const needsReview = (db.inbound_receipts || []).filter((r: any) => r.status === "Needs Review");
        const total = blockedLots.length + blockedReceipts.length;
        return {
            content: `There ${total === 1 ? "is" : "are"} ${total} blocked item(s) and ${needsReview.length} awaiting recheck (Needs Review). ${blockedReceipts.map((r: any) => `${r.receipt_no} (${matName(r.material_id)})`).join(", ") || "No blocked receipts."}`,
            sources: [
                ...blockedReceipts.map((r: any) => ({ type: "Receipt", id: r.receipt_no, desc: "Blocked" })),
                ...blockedLots.map((l: any) => ({ type: "Lot", id: l.lot_number, desc: "Blocked" })),
                ...needsReview.map((r: any) => ({ type: "Receipt", id: r.receipt_no, desc: "Needs Review" })),
            ],
        };
    }

    // Cold-chain / temperature alerts
    if (q.includes("cold") || q.includes("suhu") || q.includes("temperature") || q.includes("alert") || q.includes("dingin")) {
        const alerts = (db.warehouse_zones || []).filter((z: any) => z.status === "Cold-chain Alert");
        if (alerts.length > 0) {
            const alertDetail = alerts.map((z: any) => `${z.id} (${z.name}) at ${z.current_temperature}°C`).join(", ");
            return {
                content: `There are ${alerts.length} active cold-chain alert(s): ${alertDetail}. This is outside the safe threshold.`,
                sources: alerts.map((z: any) => ({ type: "Sensor reading", id: z.id, desc: `${z.current_temperature}°C` }))
            };
        }
        return { content: "No cold-chain alerts at this time. All zones operating within normal temperature ranges.", sources: [] };
    }

    // Receipt queries
    if (q.includes("rec-") || q.includes("receipt") || q.includes("inbound") || q.includes("penerimaan")) {
        const recMatch = q.match(/rec[- ]?2026[- ]?(\d+)/i);
        if (recMatch) {
            const recNo = `REC-2026-${recMatch[1]}`;
            const receipt = (db.inbound_receipts || []).find((r: any) => r.receipt_no === recNo);
            if (receipt) {
                return {
                    content: `${receipt.receipt_no} has status "${receipt.status}". Quantity: ${receipt.quantity} ${receipt.unit}. Batch ref: ${receipt.batch_reference}.`,
                    sources: [{ type: "Receipt record", id: receipt.receipt_no, desc: `Status: ${receipt.status}` }]
                };
            }
        }
        const receipts = db.inbound_receipts || [];
        return {
            content: `There are ${receipts.length} inbound receipt(s) in the system. Statuses: ${receipts.map((r: any) => `${r.receipt_no}: ${r.status}`).join(", ")}.`,
            sources: receipts.map((r: any) => ({ type: "Receipt", id: r.receipt_no, desc: r.status }))
        };
    }

    // QC queries
    if (q.includes("qc") || q.includes("quality") || q.includes("inspek")) {
        const qcRecords = db.qc_inspections || [];
        if (qcRecords.length > 0) {
            return {
                content: `There are ${qcRecords.length} QC inspection record(s). Latest: colour score ${qcRecords[0].colour_score}/100, recommendation "${qcRecords[0].recommendation}", decision "${qcRecords[0].human_decision}".`,
                sources: qcRecords.map((q: any) => ({ type: "QC inspection", id: q.id, desc: q.human_decision }))
            };
        }
        return { content: "No QC inspection records found.", sources: [] };
    }

    // Warehouse queries
    if (q.includes("warehouse") || q.includes("gudang") || q.includes("zone") || q.includes("zona")) {
        const zones = db.warehouse_zones || [];
        const zoneList = zones.map((z: any) => `${z.id}: ${z.name} (${z.status})`).join(", ");
        return {
            content: `The warehouse has ${zones.length} zones: ${zoneList}.`,
            sources: zones.map((z: any) => ({ type: "Zone", id: z.id, desc: z.status }))
        };
    }

    // Material queries
    if (q.includes("material") || q.includes("bahan")) {
        const mats = db.materials || [];
        return {
            content: `There are ${mats.length} material(s) registered: ${mats.map((m: any) => `${m.name} (${m.hazard_class})`).join(", ")}.`,
            sources: mats.map((m: any) => ({ type: "Material", id: m.id, desc: m.name }))
        };
    }

    // Audit queries
    if (q.includes("audit") || q.includes("log") || q.includes("riwayat")) {
        const audits = db.audit_logs || [];
        const recent = audits.slice(0, 3);
        return {
            content: `There are ${audits.length} audit log entries. Most recent: ${recent.map((a: any) => `"${a.action}" by ${a.actor}`).join(", ")}.`,
            sources: recent.map((a: any) => ({ type: "Audit", id: a.id, desc: a.action }))
        };
    }

    // Dispatch priority / what to ship next
    if (q.includes("priorit") || q.includes("ship next") || q.includes("dispatch next") || q.includes("prioritas")) {
        const stored = (db.lots || []).filter((l: any) => l.status === "Stored");
        const target = stored[0] || (db.lots || [])[0];
        if (target) {
            return {
                content: `${target.lot_number} should be prioritized for dispatch. It is ${target.status}${target.current_location ? ` at ${target.current_location}` : ""} and is linked to export demand (AromaWell Singapore).`,
                sources: [
                    { type: "Lot record", id: target.lot_number, desc: `Status: ${target.status}` },
                    { type: "Dispatch", id: "DSP-001", desc: "Export — Singapore" },
                ]
            };
        }
    }

    // Stored lots / inventory on hand
    if (q.includes("stored") || q.includes("disimpan") || q.includes("in stock") || q.includes("inventory") || q.includes("stok")) {
        const stored = (db.lots || []).filter((l: any) => l.status === "Stored");
        if (stored.length > 0) {
            return {
                content: `There are ${stored.length} stored lot(s): ${stored.map((l: any) => `${l.lot_number} at ${l.current_location || "unassigned"}`).join(", ")}.`,
                sources: stored.map((l: any) => ({ type: "Lot record", id: l.lot_number, desc: l.current_location || "Stored" }))
            };
        }
        return { content: "No lots are currently in Stored status.", sources: [] };
    }

    // General status / summary
    if (q.includes("status") || q.includes("summary") || q.includes("ringkasan") || q.includes("today") || q.includes("hari ini")) {
        const lots = db.lots || [];
        const receipts = db.inbound_receipts || [];
        const dispatches = db.sample_dispatches || [];
        return {
            content: `Current system status: ${receipts.length} inbound receipts, ${lots.length} lots (${lots.filter((l: any) => l.status === "Stored").length} stored, ${lots.filter((l: any) => l.status === "Pending QC").length} pending QC), ${dispatches.length} dispatches.`,
            sources: [
                { type: "Summary", id: "SYS", desc: "System overview" }
            ]
        };
    }

    // Fallback: try to find anything matching in the DB
    return {
        content: `I searched the operational database but couldn't find a specific match for your query. Try asking about a specific lot number (e.g., LOT-2026-051), receipt (REC-2026-002), warehouse zones, QC status, cold-chain alerts, or dispatches.`,
        sources: []
    };
}

export default function CopilotPage() {
    const { role } = useRole();
    const [messages, setMessages] = useState<Message[]>([{
        id: "1",
        role: "assistant",
        content: "Hello! I am Ops Copilot. I can help you query real-time operational records, audit logs, and status updates across the facility. Try asking about a lot, material, receipt, or warehouse zone."
    }]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const suggestedPrompts = [
        "Where is LOT-2026-051?",
        "Which samples used LOT-2026-051?",
        "What batches are blocked today?",
        "Any cold-chain alerts today?",
        "Show system status summary",
    ];

    const handleSend = async (text: string) => {
        if (!text.trim() || isThinking) return;

        const newMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setIsThinking(true);

        try {
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: getActorName(role),
                role: role,
                action: "Queried Ops Copilot",
                entity: "Copilot",
                change_detail: `Asked: "${text}"`
            });
        } catch (e) {}

        setTimeout(() => {
            const answer = searchDemoDB(text);
            const responseMsg: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: answer.content,
                sources: answer.sources
            };
            setMessages(prev => [...prev, responseMsg]);
            setIsThinking(false);
        }, 800);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-9rem)] max-w-4xl mx-auto w-full">
            <div className="mb-6">
                <h2 className="font-display font-bold text-3xl text-primary">Ops Copilot</h2>
                <p className="text-on-surface-variant mt-1">AI-assisted natural language queries for manufacturing operations.</p>
            </div>

            <div className="flex-1 bg-white border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface border border-outline-variant'}`}>
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <span className="material-symbols-outlined text-[16px]">
                                        {msg.role === 'user' ? 'person' : 'smart_toy'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                        {msg.role === 'user' ? 'You' : 'Ops Copilot'}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-outline-variant/50">
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">Source Records</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {msg.sources.map((src, i) => (
                                                <div key={i} className="bg-white p-2 rounded border border-outline-variant text-xs shadow-sm flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                                                    <div>
                                                        <span className="font-bold block text-[10px] uppercase opacity-70">{src.type}</span>
                                                        <span className="font-mono text-primary font-bold">{src.id}</span>
                                                        <span className="block opacity-80 mt-0.5">{src.desc}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-surface-container-low text-on-surface border border-outline-variant rounded-2xl p-5 flex items-center gap-3">
                                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-70 animate-pulse">Querying Records...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedPrompts.map((p, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(p)}
                                disabled={isThinking}
                                className="px-3 py-1.5 rounded-full border border-outline-variant text-xs hover:border-primary hover:text-primary transition-colors bg-white disabled:opacity-50"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-white border border-outline-variant rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1"
                            placeholder="Ask about a lot, material, receipt, warehouse..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                            disabled={isThinking}
                        />
                        <button
                            onClick={() => handleSend(input)}
                            disabled={!input.trim() || isThinking}
                            className="bg-primary text-on-primary w-12 h-12 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
