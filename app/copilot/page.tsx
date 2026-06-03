"use client";
import { createItem } from "@/lib/api/client";
import { useRole } from "@/lib/rbac";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import React, { useState } from "react";

export default function CopilotPage() {
    const { role } = useRole();
    const [input, setInput] = useState("");
    
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({ api: "/api/ai/copilot" }),
        messages: [
            {
                id: "1",
                role: "assistant",
                parts: [{ type: "text", text: "Hello! I am Ops Copilot. I can help you query real-time operational records, audit logs, and status updates across the facility. Try asking about a lot, material, receipt, or warehouse zone." }]
            }
        ] as UIMessage[]
    });

    const isLoading = status === "submitted" || status === "streaming";

    const suggestedPrompts = [
        "Where is LOT-2026-051?",
        "Which samples used LOT-2026-051?",
        "What batches are blocked today?",
        "Any cold-chain alerts today?",
        "Show system status summary",
    ];

    const handleSend = async (e: React.FormEvent, overrideText?: string) => {
        e?.preventDefault?.();
        const textToSubmit = overrideText || input;
        
        if (!textToSubmit.trim() || isLoading) return;

        try {
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: "Current User",
                role: role,
                action: "Queried Ops Copilot",
                entity: "Copilot",
                change_detail: `Asked: "${textToSubmit}"`
            });
        } catch (err) {}

        sendMessage({ id: Date.now().toString(), parts: [{ type: "text", text: textToSubmit }], role: 'user' });
        if (!overrideText) {
            setInput("");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-220px)] md:h-[calc(100vh-140px)] max-w-4xl mx-auto w-full animate-fade-in">
            <div className="mb-4 md:mb-5">
                <div className="flex items-center gap-3">
                    <div className="hidden sm:grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                        <span className="material-symbols-outlined text-[22px] icon-fill">smart_toy</span>
                    </div>
                    <div>
                        <h1 className="text-2xl text-slate-900 font-semibold tracking-tight">Ops Copilot</h1>
                        <p className="text-slate-500 text-sm mt-0.5">AI-assisted natural language queries for manufacturing operations.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 ui-card flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto soft-scroll p-4 sm:p-6 space-y-5">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-rise`}>
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <span className="material-symbols-outlined text-[18px]">
                                        {msg.role === 'user' ? 'person' : 'smart_toy'}
                                    </span>
                                </div>
                                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {msg.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-rise">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedPrompts.map((p, i) => (
                            <button
                                key={i}
                                onClick={(e) => handleSend(e, p)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors bg-white disabled:opacity-50"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <form id="copilot-form" onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            className="field flex-1 h-12"
                            placeholder="Ask about a lot, material, receipt, warehouse..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="bg-emerald-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
