import type { FunctionMetric } from "../../../model/schema.ts";
import {
  errorMessage,
  parseCsvRows,
} from "../../../../../foundation/src/index.ts";

export type LizardScanResult =
  | { functions: FunctionMetric[]; ok: true }
  | { error: string; ok: false; reason: "execution" | "invalid-result" };

const LIZARD_COLUMNS = {
  nloc: 0,
  ccn: 1,
  parameterCount: 3,
  filePath: 6,
  functionName: 7,
  startLine: 9,
  endLine: 10,
} as const;

/**
 * 将 Lizard CSV 输出解析为 FunctionMetric 数组。
 *
 * Lizard 1.23 CSV 列（--csv）：
 * NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line
 */
export function parseLizardCSV(csv: string): LizardScanResult {
  try {
    const functions: FunctionMetric[] = [];

    for (const [index, row] of lizardDataRows(parseCsvRows(csv)).entries()) {
      const metric = functionMetricFromLizardRow(row);
      if (!metric) {
        throw new Error(`invalid Lizard 1.23 CSV row ${index + 1}`);
      }
      functions.push(metric);
    }

    functions.sort(compareFunctionMetrics);

    return { ok: true, functions };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Failed to parse lizard CSV: ${errorMessage(error)}`,
      reason: "invalid-result",
    };
  }
}

function lizardDataRows(rows: string[][]): string[][] {
  const header = rows[0] ?? [];
  return isLizard123Header(header) ? rows.slice(1) : rows;
}

function functionMetricFromLizardRow(parts: string[]): FunctionMetric | null {
  if (parts.length < 11) {
    return null;
  }

  const values = parseLizardMetricValues(parts);
  if (!values) {
    return null;
  }

  const filePath = parts[LIZARD_COLUMNS.filePath].trim();
  if (filePath === "" || values.endLine < values.startLine) {
    return null;
  }

  return {
    name: parts[LIZARD_COLUMNS.functionName] || "unknown",
    file: filePath,
    codeArea: "unknown",
    startLine: values.startLine,
    endLine: values.endLine,
    lines: values.nloc,
    parameterCount: values.parameterCount,
    cyclomaticComplexity: {
      value: values.ccn,
      source: "lizard",
    },
    isChanged: false,
  };
}

type LizardMetricValues = {
  ccn: number | null;
  endLine: number;
  nloc: number;
  parameterCount: number;
  startLine: number;
};

function parseLizardMetricValues(parts: string[]): LizardMetricValues | null {
  const ccnText = parts[LIZARD_COLUMNS.ccn].trim();
  const ccn = ccnText === "" ? null : parseInteger(ccnText, 0);
  const endLine = parseInteger(parts[LIZARD_COLUMNS.endLine], 1);
  const nloc = parseInteger(parts[LIZARD_COLUMNS.nloc], 0);
  const parameterCount = parseInteger(parts[LIZARD_COLUMNS.parameterCount], 0);
  const startLine = parseInteger(parts[LIZARD_COLUMNS.startLine], 1);

  if (
    (ccnText !== "" && ccn === null) ||
    [endLine, nloc, parameterCount, startLine].some((value) => value === null)
  ) {
    return null;
  }

  return {
    ccn,
    endLine: endLine as number,
    nloc: nloc as number,
    parameterCount: parameterCount as number,
    startLine: startLine as number,
  };
}

function compareFunctionMetrics(a: FunctionMetric, b: FunctionMetric): number {
  const ccDiff =
    (b.cyclomaticComplexity.value ?? 0) - (a.cyclomaticComplexity.value ?? 0);
  if (ccDiff !== 0) return ccDiff;
  return b.lines - a.lines;
}

function parseInteger(
  value: string | undefined,
  minimum: number,
): number | null {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

function isLizard123Header(parts: string[]): boolean {
  return (
    parts.length >= 11 &&
    parts[LIZARD_COLUMNS.nloc] === "NLOC" &&
    parts[LIZARD_COLUMNS.ccn] === "CCN" &&
    parts[LIZARD_COLUMNS.parameterCount] === "parameter count" &&
    parts[LIZARD_COLUMNS.filePath] === "file path" &&
    parts[LIZARD_COLUMNS.functionName] === "function name" &&
    parts[LIZARD_COLUMNS.startLine] === "start line" &&
    parts[LIZARD_COLUMNS.endLine] === "end line"
  );
}
