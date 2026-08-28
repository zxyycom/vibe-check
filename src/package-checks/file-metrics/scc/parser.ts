import type { ExactInputMeasurement } from "../../project-files/exact-input-measurement.ts";
import { errorMessage } from "../../host-environment/error-message.ts";
import { normalizeScannerReportedPath } from "../../project-files/reported-path.ts";
import type { FileMetric } from "../measurement-model.ts";
import { parseCsvRows } from "./csv.ts";

export const SCC_VERSION = "3.7.0";
export const SCC_VERSION_OUTPUT = `scc version ${SCC_VERSION}`;
export const SCC_BY_FILE_CSV_HEADER =
  "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";

export type SccScanResult =
  | {
      readonly measurements: readonly ExactInputMeasurement<FileMetric>[];
      readonly ok: true;
    }
  | {
      readonly error: string;
      readonly ok: false;
      readonly reason: "execution" | "invalid-result";
    };

interface SccColumnIndexes {
  blanks: number;
  code: number;
  comments: number;
  complexity: number;
  filename: number;
  lines: number;
  provider: number;
}

interface ParsedSccRow {
  readonly codeLines: number;
  readonly complexity: number | null;
  readonly path: string;
}

interface SccRawRow {
  readonly blankLines: string;
  readonly codeLines: string;
  readonly commentLines: string;
  readonly complexity: string;
  readonly filename: string;
  readonly lineCount: string;
  readonly providerPath: string;
}

/**
 * 解析 scc CSV 输出。
 *
 * scc 3.7.0 `--by-file --format csv` 列：
 * Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC
 *
 * - Lines 包含所有行（code + comments + blanks）
 * - Code 是文件级代码行数，用于 code-line finding
 * - Complexity 是 scc complexitychecks token 命中数，用于 low-decision-token allowance，不是函数级 CC
 * - ULOC (Usable Lines of Code) 由 3.7.0 输出，但首期不进入稳定 metrics
 */
export function parseSccCSV(csv: string, cwd: string): SccScanResult {
  try {
    const rows = parseCsvRows(csv);
    const headerIdx = findSccHeaderIndex(rows);
    if (headerIdx < 0) {
      return {
        ok: false,
        error: `expected scc ${SCC_VERSION} by-file CSV header "${SCC_BY_FILE_CSV_HEADER}", got "${observedSccHeader(rows)}"`,
        reason: "invalid-result"
      };
    }

    const columns = sccColumnIndexes(rows[headerIdx] ?? []);
    const measurements = parseSccMetrics(rows.slice(headerIdx + 1), columns, headerIdx + 2, cwd);
    return {
      ok: true,
      measurements
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Failed to parse scc CSV: ${errorMessage(error)}`,
      reason: "invalid-result"
    };
  }
}

function findSccHeaderIndex(rows: string[][]): number {
  const expectedHeader = SCC_BY_FILE_CSV_HEADER.split(",");
  return rows.findIndex((row) => isCsvRow(row, expectedHeader));
}

function observedSccHeader(rows: string[][]): string {
  return rows.find((row) => row[0] === "Language")?.join(",") ?? rows[0]?.join(",") ?? "";
}

function sccColumnIndexes(headerCols: string[]): SccColumnIndexes {
  return {
    provider: headerCols.indexOf("Provider"),
    filename: headerCols.indexOf("Filename"),
    lines: headerCols.indexOf("Lines"),
    code: headerCols.indexOf("Code"),
    comments: headerCols.indexOf("Comments"),
    blanks: headerCols.indexOf("Blanks"),
    complexity: headerCols.indexOf("Complexity")
  };
}

function parseSccMetrics(
  rows: string[][],
  columns: SccColumnIndexes,
  firstRowNumber: number,
  cwd: string
): ExactInputMeasurement<FileMetric>[] {
  const measurements: ExactInputMeasurement<FileMetric>[] = [];

  for (const [index, row] of rows.entries()) {
    const measurement = parseSccFileMetric(row, columns, firstRowNumber + index, cwd);
    measurements.push(measurement);
  }

  measurements.sort((left, right) => compareText(left.payload.path, right.payload.path));
  return measurements;
}

function parseSccFileMetric(
  parts: string[],
  columns: SccColumnIndexes,
  rowNumber: number,
  cwd: string
): ExactInputMeasurement<FileMetric> {
  const row = parseSccRow(parts, columns, rowNumber);
  const sourcePath = normalizeScannerReportedPath(row.path, cwd);
  return {
    sourcePaths: [sourcePath],
    payload: {
      path: sourcePath,
      codeLines: row.codeLines,
      decisionTokens: {
        value: row.complexity,
        source: "scc"
      }
    }
  };
}

function parseSccRow(parts: string[], columns: SccColumnIndexes, rowNumber: number): ParsedSccRow {
  const expectedColumnCount = SCC_BY_FILE_CSV_HEADER.split(",").length;
  if (parts.length !== expectedColumnCount) {
    throw new Error(
      `row ${rowNumber} has ${parts.length} columns; expected ${expectedColumnCount}`
    );
  }
  const rawRow = sccRawRow(parts, columns);
  if (!rawRow.filename) {
    throw new Error(`row ${rowNumber} field Filename must not be empty`);
  }
  validateSccRowCounts(rawRow, rowNumber);

  return {
    path: rawRow.providerPath || rawRow.filename,
    codeLines: parseRequiredInteger(rawRow.codeLines, "Code", rowNumber),
    complexity: parseOptionalInteger(rawRow.complexity, "Complexity", rowNumber)
  };
}

function validateSccRowCounts(row: SccRawRow, rowNumber: number): void {
  parseRequiredInteger(row.lineCount, "Lines", rowNumber);
  parseRequiredInteger(row.commentLines, "Comments", rowNumber);
  parseRequiredInteger(row.blankLines, "Blanks", rowNumber);
}

function sccRawRow(parts: string[], columns: SccColumnIndexes): SccRawRow {
  return {
    blankLines: sccColumnValue(parts, columns.blanks),
    codeLines: sccColumnValue(parts, columns.code),
    commentLines: sccColumnValue(parts, columns.comments),
    complexity: sccColumnValue(parts, columns.complexity),
    filename: sccColumnValue(parts, columns.filename),
    lineCount: sccColumnValue(parts, columns.lines),
    providerPath: sccColumnValue(parts, columns.provider)
  };
}

function parseRequiredInteger(value: string, field: string, rowNumber: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`row ${rowNumber} field ${field} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`row ${rowNumber} field ${field} exceeds the supported integer range`);
  }
  return parsed;
}

function parseOptionalInteger(value: string, field: string, rowNumber: number): number | null {
  return value === "" ? null : parseRequiredInteger(value, field, rowNumber);
}

function sccColumnValue(parts: string[], index: number): string {
  return index >= 0 ? (parts[index] ?? "") : "";
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isCsvRow(row: string[], expected: string[]): boolean {
  return row.length === expected.length && row.every((value, index) => value === expected[index]);
}
