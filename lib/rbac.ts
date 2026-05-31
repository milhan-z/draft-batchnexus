"use client";
import { useState, useEffect } from "react";

export type UserRole = 
  | "Receiving Operator" 
  | "QC Staff" 
  | "PPIC Planner" 
  | "Warehouse Admin" 
  | "Operations Manager" 
  | "Customer Service"
  | "Admin";

export const ROLES: { id: UserRole; label: string; icon: string; desc: string }[] = [
    { id: "Admin", label: "Admin", icon: "admin_panel_settings", desc: "Superuser fallback" },
    { id: "Receiving Operator", label: "Receiving Operator", icon: "inventory", desc: "Inbound & document intake" },
    { id: "QC Staff", label: "QC Staff", icon: "biotech", desc: "Quality assurance" },
    { id: "PPIC Planner", label: "PPIC Planner", icon: "calendar_month", desc: "Production scheduling" },
    { id: "Warehouse Admin", label: "Warehouse Admin", icon: "warehouse", desc: "Inventory & slotting" },
    { id: "Operations Manager", label: "Operations Manager", icon: "manage_accounts", desc: "Audit & oversight" },
    { id: "Customer Service", label: "Customer Service", icon: "support_agent", desc: "View-only dispatch" },
];

// Demo persona names per role. Used to attribute audit-log actor names so the
// "who did what" trail reflects the active persona instead of a generic label.
export const PERSONA_NAMES: Record<string, string> = {
    "Receiving Operator": "Dimas Pratama",
    "QC Staff": "Rani Wulandari",
    "PPIC Planner": "Budi Hartono",
    "Warehouse Admin": "Andi Saputra",
    "Operations Manager": "Maya Santoso",
    "Customer Service": "Sari Putri",
    "Admin": "System Admin",
};

export function getActorName(role: UserRole | string): string {
    return PERSONA_NAMES[role] || "System Admin";
}

// ── Route-level access control ────────────────────────────────
// Each role only sees the modules relevant to its job function.
// This drives both the sidebar navigation AND route-level access enforcement.
// "*" means full access (Operations Manager & Admin).
export const ROLE_ACCESS: Record<string, string[]> = {
    "Admin": ["*"],
    "Operations Manager": ["*"],
    "Receiving Operator": ["/", "/inbound", "/lots"],
    "QC Staff": ["/", "/qc", "/lots", "/audit"],
    "PPIC Planner": ["/", "/ppic", "/lots", "/copilot"],
    "Warehouse Admin": ["/", "/warehouse", "/lots", "/audit"],
    "Customer Service": ["/lots", "/dispatch", "/copilot"],
};

// ── Route-to-capability mapping ────────────────────────────────
// Ensures that route access is always aligned with capability functions.
// If a route has a corresponding capability check, route access implies
// capability access. This prevents misalignment between ROLE_ACCESS and can* helpers.
const ROUTE_CAPABILITY_MAP: Record<string, (role: UserRole | string) => boolean> = {
    "/audit": canViewAudit,
    "/summary": canGenerateSummary,
};

export function canAccessRoute(role: UserRole | string, path: string): boolean {
    const allowed = ROLE_ACCESS[role] || ROLE_ACCESS["Customer Service"];
    if (allowed.includes("*")) {
        // Even wildcard roles must pass capability checks for gated routes
        const base = "/" + (path.split("/")[1] || "");
        const capCheck = ROUTE_CAPABILITY_MAP[path] || ROUTE_CAPABILITY_MAP[base];
        if (capCheck && !capCheck(role)) return false;
        return true;
    }
    // Normalise nested routes (e.g. /inbound/new → /inbound)
    const base = "/" + (path.split("/")[1] || "");
    const hasRoute = allowed.includes(path) || allowed.includes(base);
    if (!hasRoute) return false;
    // Verify capability alignment: route access must imply capability access
    const capCheck = ROUTE_CAPABILITY_MAP[path] || ROUTE_CAPABILITY_MAP[base];
    if (capCheck && !capCheck(role)) return false;
    return true;
}

/**
 * Returns a human-readable reason why a role cannot access a route.
 * Used by the PageLayout to display an "Access Denied" message.
 */
export function getAccessDeniedReason(role: UserRole | string, path: string): string {
    const base = "/" + (path.split("/")[1] || "");
    const capCheck = ROUTE_CAPABILITY_MAP[path] || ROUTE_CAPABILITY_MAP[base];
    if (capCheck && !capCheck(role)) {
        return `Your role "${role}" does not have the required capability to access this page.`;
    }
    return `Your role "${role}" does not have access to this page.`;
}

export function useRole() {
    const [role, setRole] = useState<UserRole>("Admin");

    useEffect(() => {
        const saved = localStorage.getItem("batchnexus_role") as UserRole;
        if (saved && ROLES.find(r => r.id === saved)) {
            setRole(saved);
        }
    }, []);

    const changeRole = (newRole: UserRole) => {
        setRole(newRole);
        localStorage.setItem("batchnexus_role", newRole);
        window.dispatchEvent(new Event("roleChange"));
    };

    // Re-sync if other components change it
    useEffect(() => {
        const handleSync = () => {
            const saved = localStorage.getItem("batchnexus_role") as UserRole;
            if (saved && saved !== role) setRole(saved);
        };
        window.addEventListener("roleChange", handleSync);
        return () => window.removeEventListener("roleChange", handleSync);
    }, [role]);

    return { role, changeRole };
}

export function canCreateReceipt(role: UserRole | string): boolean {
    return ["Receiving Operator", "Operations Manager", "Admin"].includes(role);
}

export function canSubmitToQC(role: UserRole | string): boolean {
    return ["Receiving Operator", "Operations Manager", "Admin"].includes(role);
}

export function canApproveQC(role: UserRole | string): boolean {
    return ["QC Staff", "Operations Manager", "Admin"].includes(role);
}

export function canAssignSlot(role: UserRole | string): boolean {
    return ["Warehouse Admin", "Operations Manager", "Admin"].includes(role);
}

export function canMarkReadyForProduction(role: UserRole | string): boolean {
    return ["PPIC Planner", "Operations Manager", "Admin"].includes(role);
}

export function canGenerateSummary(role: UserRole | string): boolean {
    return ["Operations Manager", "Admin"].includes(role);
}

export function canExportTrace(role: UserRole | string): boolean {
    return ["Operations Manager", "Admin"].includes(role);
}

export function canViewAudit(role: UserRole | string): boolean {
    return ["QC Staff", "Warehouse Admin", "Operations Manager", "Admin"].includes(role);
}

/** Full audit access (generate summary from audit, export all) — Manager/Admin only */
export function canManageAudit(role: UserRole | string): boolean {
    return ["Operations Manager", "Admin"].includes(role);
}
