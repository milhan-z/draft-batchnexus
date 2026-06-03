"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CopilotDock } from "./CopilotBottomSheet";

/**
 * Global Ops Copilot overlay — ambient assistant layer available on every
 * authenticated page. Starts as a floating orb; expands into a bottom command
 * dock on click. Feels like Siri / Google Assistant, not a chat modal.
 *
 * Selected-lot context:
 *   Pages can set the active lot so questions like "Where is this lot?" resolve
 *   without typing the number. Either:
 *     - dispatch  window.dispatchEvent(new CustomEvent("copilot:selectLot", { detail: "LOT-2026-051" }))
 *     - or set    sessionStorage.setItem("batchnexus_selected_lot", "LOT-2026-051")
 *
 * Other code can open the assistant via:
 *     window.dispatchEvent(new CustomEvent("copilot:open"))
 */
export function FloatingCopilot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  // Track the active lot from explicit events and sessionStorage.
  useEffect(() => {
    const readStored = () => {
      try {
        return sessionStorage.getItem("batchnexus_selected_lot");
      } catch {
        return null;
      }
    };
    setSelectedLot(readStored());

    const onSelect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setSelectedLot(detail || null);
    };
    const onOpen = () => setOpen(true);

    window.addEventListener("copilot:selectLot", onSelect as EventListener);
    window.addEventListener("copilot:open", onOpen);
    return () => {
      window.removeEventListener("copilot:selectLot", onSelect as EventListener);
      window.removeEventListener("copilot:open", onOpen);
    };
  }, []);

  // Refresh selected lot whenever the dock opens or the route changes.
  useEffect(() => {
    try {
      setSelectedLot(sessionStorage.getItem("batchnexus_selected_lot"));
    } catch {
      /* noop */
    }
  }, [open, pathname]);

  // Never show on the login screen.
  if (pathname === "/login") return null;

  return (
    <>
      {/* Floating Orb — closed state */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Ops Copilot"
          title="Ask Ops Copilot"
          className="copilot-orb group"
        >
          {/* Pulse ring */}
          <span className="copilot-orb-ring" />
          {/* Icon */}
          <span className="material-symbols-outlined text-[24px] icon-fill relative z-10">
            auto_awesome
          </span>
        </button>
      )}

      {/* Ambient command dock + response card layer */}
      <CopilotDock
        open={open}
        onClose={() => setOpen(false)}
        selectedLot={selectedLot}
      />
    </>
  );
}
