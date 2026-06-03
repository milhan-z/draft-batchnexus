"use client";

import { useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * The Siri/Assistant-style command bar — a single glowing emerald pill docked
 * at the bottom of the content area. Submits on Enter; the send button is
 * disabled while empty or while a query is running.
 */
export function CopilotInputBar({ value, onChange, onSubmit, disabled, autoFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Defer focus so the open animation doesn't fight the caret.
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 h-14 pl-4 pr-2 rounded-full bg-white border-2 border-emerald-500
        shadow-[0_0_0_4px_rgba(5,150,105,0.12),0_16px_44px_-12px_rgba(5,150,105,0.45)]
        focus-within:border-emerald-600 focus-within:shadow-[0_0_0_5px_rgba(5,150,105,0.16),0_18px_48px_-12px_rgba(5,150,105,0.5)]
        transition-shadow"
    >
      <span className="material-symbols-outlined text-[22px] text-emerald-500 icon-fill shrink-0 pointer-events-none">
        auto_awesome
      </span>
      <input
        ref={inputRef}
        type="text"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400"
        placeholder="Ask about lot status, QC result, warehouse location, dispatch, or audit..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40 shrink-0"
        aria-label="Send"
      >
        <span className="material-symbols-outlined text-[20px]">
          {disabled ? "progress_activity" : "arrow_upward"}
        </span>
      </button>
    </form>
  );
}
