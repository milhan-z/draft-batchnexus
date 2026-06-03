"use client";

interface Props {
  prompts: string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Dynamic, page-aware suggested prompts. Rendered above the input bar so the
 * assistant always offers relevant starting points for the current module.
 */
export function CopilotPromptChips({ prompts, onPick, disabled }: Props) {
  if (!prompts || prompts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {prompts.map((p, i) => (
        <button
          key={i}
          onClick={() => onPick(p)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors bg-white disabled:opacity-50"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
