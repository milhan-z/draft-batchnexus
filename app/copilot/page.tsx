"use client";
import { createItem } from "@/lib/api/client";
import { useRole } from "@/lib/rbac";
import { useChat } from "ai/react";
import React from "react";

export default function CopilotPage() {
    const { role } = useRole();
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/ai/copilot",
        initialMessages: [
            {
                id: "1",
                role: "assistant",
                content: "Hello! I am Ops Copilot. I can help you query real-time operational records, audit logs, and status updates across the facility. Try asking about a lot, material, receipt, or warehouse zone."
            }
        ]
    });

    const suggestedPrompts = [
        "Where is LOT-2026-051?",
        "Which samples used LOT-2026-051?",
        "What batches are blocked today?",
        "Any cold-chain alerts today?",
        "Show system status summary",
    ];

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        try {
            await createItem("audit_logs", {
                timestamp: new Date().toISOString(),
                actor: "Current User",
                role: role,
                action: "Queried Ops Copilot",
                entity: "Copilot",
                change_detail: `Asked: "${input}"`
            });
        } catch (err) {}

        handleSubmit(e);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full">
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
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-surface-container-low text-on-surface border border-outline-variant rounded-2xl p-5 flex items-center gap-3">
                                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-70 animate-pulse">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {suggestedPrompts.map((p, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    handleInputChange({ target: { value: p } } as any);
                                    setTimeout(() => {
                                        const form = document.getElementById("copilot-form") as HTMLFormElement;
                                        if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                                    }, 100);
                                }}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-full border border-outline-variant text-xs hover:border-primary hover:text-primary transition-colors bg-white disabled:opacity-50"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <form id="copilot-form" onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-white border border-outline-variant rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1"
                            placeholder="Ask about a lot, material, receipt, warehouse..."
                            value={input}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="bg-primary text-on-primary w-12 h-12 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
