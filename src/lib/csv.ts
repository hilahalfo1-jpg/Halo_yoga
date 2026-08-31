/**
 * Quote + escape one CSV cell: String()-ified, `"` doubled, wrapped in quotes.
 * Cells starting with =, +, - or @ get a leading `'` so spreadsheet apps
 * treat them as text instead of formulas (CSV formula-injection).
 */
export function escapeCsvCell(cell: string | number | null | undefined): string {
  let s = String(cell ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV (UTF-8 BOM, every cell escaped via escapeCsvCell, \n line
 * breaks) and trigger a browser download for it.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const csv =
    "\uFEFF" +
    [headers, ...rows].map((r) => r.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
