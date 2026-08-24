import type { FileMetric, LanguageAggregate } from "../../../configuration/metric-contract.ts";
import type { ScopedMeasurement } from "../../scoped-measurement.ts";
import { errorMessage } from "../../../../foundation/errors.ts";
import { parseCsvRows } from "../../../../foundation/csv.ts";
import { normalizeScannerReportedPath } from "../source-path.ts";

export const SCC_VERSION = "3.7.0";
export const SCC_VERSION_OUTPUT = `scc version ${SCC_VERSION}`;
export const SCC_BY_FILE_CSV_HEADER =
  "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";

export type SccScanResult =
  | {
      readonly aggregates: { readonly byLanguage: readonly LanguageAggregate[] };
      readonly measurements: readonly ScopedMeasurement<FileMetric>[];
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
  language: number;
  lines: number;
  provider: number;
}

type ParsedSccFileMetric = FileMetric &
  Required<Pick<FileMetric, "blankLines" | "codeLines" | "commentLines">>;

type ParsedSccRow = {
  blankLines: number;
  codeLines: number;
  commentLines: number;
  complexity: number | null;
  language: string;
  lineCount: number;
  path: string;
};

type SccRawRow = {
  blankLines: string;
  codeLines: string;
  commentLines: string;
  complexity: string;
  filename: string;
  language: string;
  lineCount: string;
  providerPath: string;
};

/**
 * 解析 scc CSV 输出。
 *
 * scc 3.7.0 `--by-file --format csv` 列：
 * Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC
 *
 * - Lines 包含所有行（code + comments + blanks）
 * - Code 是文件级代码行数，用于文件大小 warning
 * - Complexity 是 scc complexitychecks token 命中数，不是完整语言解析后的函数级 CC
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
    const parsed = parseSccMetrics(rows.slice(headerIdx + 1), columns, headerIdx + 2, cwd);
    return {
      ok: true,
      measurements: parsed.measurements,
      aggregates: { byLanguage: parsed.byLanguage }
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
    language: headerCols.indexOf("Language"),
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
): {
  byLanguage: LanguageAggregate[];
  measurements: ScopedMeasurement<FileMetric>[];
} {
  const measurements: ScopedMeasurement<FileMetric>[] = [];
  const langMap = new Map<string, LanguageAggregate>();

  for (const [index, row] of rows.entries()) {
    const measurement = parseSccFileMetric(row, columns, firstRowNumber + index, cwd);
    measurements.push(measurement);
    addLanguageMetric(langMap, measurement.payload);
  }

  measurements.sort((a, b) => b.payload.lines - a.payload.lines);
  const byLanguage = Array.from(langMap.values()).sort((a, b) => b.lines - a.lines);
  return { measurements, byLanguage };
}

function parseSccFileMetric(
  parts: string[],
  columns: SccColumnIndexes,
  rowNumber: number,
  cwd: string
): ScopedMeasurement<ParsedSccFileMetric> {
  const row = parseSccRow(parts, columns, rowNumber);
  const sourcePath = normalizeScannerReportedPath(row.path, cwd);
  return {
    sourcePaths: [sourcePath],
    payload: {
      path: sourcePath,
      language: row.language,
      codeArea: "unknown",
      lines: row.lineCount,
      codeLines: row.codeLines,
      commentLines: row.commentLines,
      blankLines: row.blankLines,
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

  return {
    path: rawRow.providerPath || rawRow.filename,
    language: rawRow.language,
    lineCount: parseRequiredInteger(rawRow.lineCount, "Lines", rowNumber),
    codeLines: parseRequiredInteger(rawRow.codeLines, "Code", rowNumber),
    commentLines: parseRequiredInteger(rawRow.commentLines, "Comments", rowNumber),
    blankLines: parseRequiredInteger(rawRow.blankLines, "Blanks", rowNumber),
    complexity: parseOptionalInteger(rawRow.complexity, "Complexity", rowNumber)
  };
}

function sccRawRow(parts: string[], columns: SccColumnIndexes): SccRawRow {
  return {
    blankLines: sccColumnValue(parts, columns.blanks),
    codeLines: sccColumnValue(parts, columns.code),
    commentLines: sccColumnValue(parts, columns.comments),
    complexity: sccColumnValue(parts, columns.complexity),
    filename: sccColumnValue(parts, columns.filename),
    language: sccColumnValue(parts, columns.language),
    lineCount: sccColumnValue(parts, columns.lines),
    providerPath: sccColumnValue(parts, columns.provider)
  };
}

function addLanguageMetric(
  langMap: Map<string, LanguageAggregate>,
  metric: ParsedSccFileMetric
): void {
  const existing = langMap.get(metric.language);
  if (existing) {
    incrementLanguageAggregate(existing, metric);
    return;
  }

  langMap.set(metric.language, createLanguageAggregate(metric));
}

function incrementLanguageAggregate(
  existing: LanguageAggregate,
  metric: ParsedSccFileMetric
): void {
  existing.files++;
  existing.lines += metric.lines;
  existing.codeLines += metric.codeLines;
  existing.commentLines += metric.commentLines;
  existing.blankLines += metric.blankLines;
}

function createLanguageAggregate(metric: ParsedSccFileMetric): LanguageAggregate {
  return {
    language: metric.language,
    files: 1,
    lines: metric.lines,
    codeLines: metric.codeLines,
    commentLines: metric.commentLines,
    blankLines: metric.blankLines
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

function isCsvRow(row: string[], expected: string[]): boolean {
  return row.length === expected.length && row.every((value, index) => value === expected[index]);
}
