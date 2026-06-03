// Audit integrity helper — DEMO tamper-evident hashing.
//
// This produces a deterministic SHA-256 hash of an audit entry's canonical
// fields so the Audit Log UI can show a stable "fingerprint" for each row.
// It is a demonstration of tamper-evident patterns only — NOT a blockchain,
// digital signature, or any legal/regulatory compliance guarantee.

import type { AuditEntry } from "./audit";

/** Subset of audit fields used to compute the integrity fingerprint. */
type HashableAudit = Partial<AuditEntry> & {
  id?: string;
  date_created?: string;
  [key: string]: unknown;
};

/**
 * Builds a stable, canonical string from the audit's core fields. Field order
 * is fixed so the same logical entry always yields the same hash regardless of
 * object key ordering.
 */
function canonicalize(audit: HashableAudit): string {
  const fields = [
    audit.timestamp ?? audit.date_created ?? "",
    audit.actor ?? "",
    audit.role ?? "",
    audit.action ?? "",
    audit.entity ?? "",
    audit.change_detail ?? "",
  ];
  return fields.map((f) => String(f)).join("|");
}

/**
 * Synchronous, dependency-free 64-bit (FNV-1a style) fallback hash rendered as
 * hex. Used when the Web Crypto SubtleCrypto API is unavailable (older runtimes
 * or non-secure contexts). Deterministic and good enough for a demo fingerprint.
 */
function fallbackHash(input: string): string {
  // Two 32-bit accumulators combined into a 16-char hex string.
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ c, 0x85ebca6b) + i) >>> 0;
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${toHex(h1)}${toHex(h2)}`;
}

/**
 * Generates a tamper-evident SHA-256 hash (hex) of an audit entry.
 *
 * Uses the browser/Web Crypto `crypto.subtle.digest` when available, falling
 * back to a deterministic non-cryptographic hash otherwise so the UI always
 * has a fingerprint to display.
 *
 * @param audit - The audit entry (or any object with the core audit fields).
 * @returns A hex-encoded hash string.
 */
export async function generateAuditHash(audit: HashableAudit): Promise<string> {
  const canonical = canonicalize(audit);

  try {
    const subtle =
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      "subtle" in globalThis.crypto
        ? globalThis.crypto.subtle
        : undefined;

    if (subtle) {
      const data = new TextEncoder().encode(canonical);
      const digest = await subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // Fall through to the deterministic fallback below.
  }

  return fallbackHash(canonical);
}

/**
 * Returns a short, human-readable form of a hash for compact display in tables
 * and badges (e.g. "a1b2c3d4"). Returns "—" for empty input.
 *
 * @param hash - A full hash string from {@link generateAuditHash}.
 * @param length - Number of leading characters to keep (default 8).
 */
export function shortHash(hash: string, length = 8): string {
  if (!hash) return "—";
  return hash.slice(0, length);
}
