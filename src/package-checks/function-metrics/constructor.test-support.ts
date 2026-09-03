import {
  createTypeScriptSourceRoot,
  executeCheck,
  type ReportedCheckRecord
} from "../check-execution.test-support.ts";

export const execute = executeCheck;
export type ReportedRecord = ReportedCheckRecord;

export function recordField(record: ReportedRecord, key: string): unknown {
  return Object.hasOwn(record.data, key) ? Reflect.get(record.data, key) : undefined;
}

export function createRoot(prefix: string): string {
  return createTypeScriptSourceRoot(prefix);
}

export const STRICT_LIMITS = {
  codeLines: {
    maximum: 10,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 20 }
  },
  cyclomaticComplexity: { maximum: 5 },
  parameters: { maximum: 4 }
} as const;

export const RELAXED_LIMITS = {
  codeLines: {
    maximum: 100,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 150 }
  },
  cyclomaticComplexity: { maximum: 100 },
  parameters: { maximum: 100 }
} as const;
