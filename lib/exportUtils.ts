// Shared export helpers — consistent CSV formatting across the app.
//
// All CSV exports use RFC-4180-style quoting (every field quoted, embedded
// quotes doubled), CRLF line endings, and a UTF-8 BOM so Excel opens accented
// characters (e.g. ΔE, °C, "Arôme") correctly.

/** Quotes and escapes a single CSV cell value. */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Builds a CSV string from a header row and data rows. */
export function buildCsv(header: string[], rows: (unknown[])[]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

/** Triggers a browser download of CSV content with a UTF-8 BOM. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(filename, blob);
}

/** Triggers a browser download of plain-text content. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8;" });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Convenience helper: build + download in one call. */
export function exportCsv(filename: string, header: string[], rows: (unknown[])[]): void {
  downloadCsv(filename, buildCsv(header, rows));
}

/** A YYYY-MM-DD date stamp for filenames. */
export function dateStamp(d: Date = new Date()): string {
  return d.toISOString().split("T")[0];
}
