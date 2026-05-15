/**
 * Shared CSV + XLSX export helpers for clinic reporting pages.
 *
 * Usage (in an API route):
 *
 * ```ts
 * import { toCsv, toXlsx, parseExportFormat } from "@/lib/exports";
 *
 * const fmt = parseExportFormat(req);
 * if (fmt === "csv")  return toCsv(rows, columns, "rapport");
 * if (fmt === "xlsx") return await toXlsx(rows, columns, "rapport", "Rapport");
 * // else fall through to JSON response
 * ```
 */

import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";

/** Column descriptor used by both toCsv and toXlsx. */
export type Column<T> = {
  /** Key path into row object, or an arbitrary string (use format() to supply value). */
  key: keyof T | string;
  /** Human-readable header shown in the first row. */
  header: string;
  /**
   * Optional transform applied to each cell value before writing.
   * Receives the raw field value and the full row.
   */
  format?: (v: unknown, row: T) => string | number | boolean | null;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolve a cell value for a given row + column descriptor. */
function cellValue<T extends Record<string, unknown>>(
  row: T,
  col: Column<T>,
): string | number | boolean | null {
  const raw = (row as Record<string, unknown>)[col.key as string] ?? null;
  if (col.format) return col.format(raw, row);
  if (raw === null || raw === undefined) return null;
  return String(raw);
}

/** Escape a single CSV field: double interior quotes, wrap when necessary. */
function csvField(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Wrap field if it contains a comma, newline, or double-quote
  if (/[,\n"]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------------------------------------------------------------------------
// toCsv
// ---------------------------------------------------------------------------

/**
 * Serialise `rows` to CSV and return a `Response` ready for `return` in a
 * Next.js route handler.
 *
 * - UTF-8 BOM prefix so Excel opens French/Arabic content correctly without
 *   needing the import wizard.
 * - `"` characters inside field values are doubled per RFC 4180.
 * - Fields that contain `,`, newline, or `"` are wrapped in double quotes.
 *
 * @example
 * ```ts
 * return toCsv(rows, [
 *   { key: "name",  header: "Nom" },
 *   { key: "total", header: "Total (DT)", format: (v) => Number(v).toFixed(3) },
 * ], "rapport-financier");
 * ```
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Column<T>[],
  filename: string,
): Response {
  const lines: string[] = [];

  // Header row
  lines.push(columns.map((c) => csvField(c.header)).join(","));

  // Data rows
  for (const row of rows) {
    lines.push(columns.map((col) => csvField(cellValue(row, col))).join(","));
  }

  // UTF-8 BOM (﻿) + CRLF line endings (Excel default)
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

// ---------------------------------------------------------------------------
// toXlsx
// ---------------------------------------------------------------------------

/**
 * Serialise `rows` to an XLSX workbook and return a `Response` ready for
 * `return` in a Next.js route handler.
 *
 * - Header row is **bold**.
 * - Columns are auto-sized to `max(15, header.length + 2)`.
 * - Uses the `exceljs` library (already in `apps/web` dependencies).
 *
 * @param sheetName Worksheet tab name (defaults to `filename`).
 *
 * @example
 * ```ts
 * return await toXlsx(rows, [
 *   { key: "name",  header: "Nom" },
 *   { key: "total", header: "Total (DT)", format: (v) => Number(v).toFixed(3) },
 * ], "rapport-financier", "Rapport");
 * ```
 */
export async function toXlsx<T extends Record<string, unknown>>(
  rows: T[],
  columns: Column<T>[],
  filename: string,
  sheetName?: string,
): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName ?? filename);

  // Header row — bold
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };

  // Data rows
  for (const row of rows) {
    sheet.addRow(columns.map((col) => cellValue(row, col)));
  }

  // Auto-size columns
  columns.forEach((col, i) => {
    const colObj = sheet.getColumn(i + 1);
    colObj.width = Math.max(15, col.header.length + 2);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

// ---------------------------------------------------------------------------
// parseExportFormat
// ---------------------------------------------------------------------------

/**
 * Read `?format=` from the request URL and return `"csv"`, `"xlsx"`, or
 * `null` (meaning: render the page / return JSON).
 *
 * Case-insensitive. Unrecognised values return `null`.
 *
 * @example
 * ```ts
 * const fmt = parseExportFormat(req);
 * if (fmt === "csv")  return toCsv(rows, columns, "rapport");
 * if (fmt === "xlsx") return await toXlsx(rows, columns, "rapport");
 * return NextResponse.json(rows);
 * ```
 */
export function parseExportFormat(req: NextRequest): "csv" | "xlsx" | null {
  const raw = req.nextUrl.searchParams.get("format")?.toLowerCase();
  if (raw === "csv") return "csv";
  if (raw === "xlsx") return "xlsx";
  return null;
}
