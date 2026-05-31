import { createItem } from "./api/client";
import { getActorName, type UserRole } from "./rbac";

/**
 * Represents a single audit log entry for critical actions in the system.
 */
export interface AuditEntry {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  change_detail: string;
}

/**
 * Logs an audit entry for a critical action.
 *
 * Every critical action (create, approve, assign, override, dispatch,
 * intake manual, acknowledge) must be logged via this function.
 *
 * @param role - The active user role performing the action
 * @param action - The action being performed (e.g. "create", "approve", "override")
 * @param entity - The entity being acted upon (e.g. "lot:LOT-001", "receipt:REC-005")
 * @param changeDetail - Human-readable description of the change
 */
export async function logAudit(
  role: UserRole,
  action: string,
  entity: string,
  changeDetail: string
): Promise<void> {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    actor: getActorName(role),
    role,
    action,
    entity,
    change_detail: changeDetail,
  };

  await createItem("audit_logs", entry);
}
