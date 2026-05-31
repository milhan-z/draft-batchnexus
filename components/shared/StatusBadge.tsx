import React from "react";

export const StatusBadge = ({ status }: { status: string }) => {
    let colorClass = "bg-surface-variant text-on-surface-variant";
    let icon = "info";

    switch (status) {
        case "Draft":
        case "Pending Courier":
            colorClass = "bg-surface-variant text-on-surface-variant";
            icon = "draft";
            break;
        case "Pending QC":
        case "Needs Review":
        case "Awaiting Slot":
            colorClass = "bg-secondary-container text-on-secondary-container";
            icon = "hourglass_empty";
            break;
        case "QC Released":
        case "Stored":
        case "Dispatched":
            colorClass = "bg-primary-container text-on-primary-container";
            icon = "check_circle";
            break;
        case "Blocked":
        case "BLOCKED":
        case "QC hold":
            colorClass = "bg-error-container text-on-error-container";
            icon = "block";
            break;
        case "On Hold":
            colorClass = "bg-amber-100 text-amber-800";
            icon = "pause_circle";
            break;
        case "Ready for Warehouse":
        case "READY":
            colorClass = "bg-blue-100 text-blue-800";
            icon = "warehouse";
            break;
        case "Lot Created":
        case "In Dispatch":
            colorClass = "bg-tertiary-container text-on-tertiary-container";
            icon = "local_shipping";
            break;
        case "Policy Alert":
        case "Cold-chain Alert":
            colorClass = "bg-error text-on-error";
            icon = "warning";
            break;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
            <span className="material-symbols-outlined text-[12px]">{icon}</span>
            {status}
        </span>
    );
};
