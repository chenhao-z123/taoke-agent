import * as XLSX from "xlsx";

function normalizeCell(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function spreadsheetBufferToRawText(buffer: ArrayBuffer | Uint8Array): string {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return "";
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  return rows
    .map((row) => 
      row
        .map(normalizeCell)
        .filter((cell): cell is string => Boolean(cell))
        .join(" | ")
    )
    .filter((row) => row.length > 0)
    .join("\n");
}
