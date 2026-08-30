import path from "node:path";

import { isNonArrayRecord } from "../../value-guards.ts";
import { runAstGrep } from "./command.ts";
import { diagnostic, type SourceRange, type TestEvidenceDiagnostic } from "../entities.ts";

type AstPosition = {
  line: number;
  column: number;
};

type AstRange = {
  start: AstPosition;
  end: AstPosition;
};

export type AstMatch = {
  file: string;
  text: string;
  range: AstRange;
  ruleId: string;
  metaVariables: {
    single: Record<
      string,
      {
        text: string;
        range: AstRange;
      }
    >;
  };
};

export async function scanAstRule(
  options: {
    cancelSignal?: AbortSignal;
    workspaceRoot: string;
    rulePath: string;
    paths: string[];
  },
  runRule = runAstGrep
): Promise<{
  matches: AstMatch[];
  diagnostics: TestEvidenceDiagnostic[];
}> {
  const ruleName = path.basename(options.rulePath);
  const result = await astGrepScanResult(options, runRule);
  if (result.kind === "failure") return result.value;
  if (result.value.status !== 0 && result.value.status !== 1)
    return staticScanFailure(
      `ast-grep rule ${ruleName} failed with status ${String(result.value.status)}: ${result.value.stderr.trim()}`
    );
  return parsedAstScanResult(result.value.stdout, ruleName);
}

async function astGrepScanResult(
  options: Parameters<typeof scanAstRule>[0],
  runRule: typeof runAstGrep
): Promise<
  | Readonly<{ readonly kind: "result"; readonly value: Awaited<ReturnType<typeof runAstGrep>> }>
  | Readonly<{
      readonly kind: "failure";
      readonly value: { matches: AstMatch[]; diagnostics: TestEvidenceDiagnostic[] };
    }>
> {
  let result;
  try {
    result = await runRule(
      ["scan", "--rule", options.rulePath, "--json=stream", "--color", "never", ...options.paths],
      {
        cancelSignal: options.cancelSignal,
        workspaceRoot: options.workspaceRoot
      }
    );
  } catch (error) {
    return Object.freeze({
      kind: "failure",
      value: staticScanFailure(error instanceof Error ? error.message : String(error))
    });
  }
  return Object.freeze({ kind: "result", value: result });
}

function parsedAstScanResult(
  stdout: string,
  ruleName: string
): { matches: AstMatch[]; diagnostics: TestEvidenceDiagnostic[] } {
  try {
    return { matches: parseAstMatches(stdout), diagnostics: [] };
  } catch (error) {
    return staticScanFailure(
      `ast-grep rule ${ruleName} returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function staticScanFailure(message: string): {
  matches: AstMatch[];
  diagnostics: TestEvidenceDiagnostic[];
} {
  return { matches: [], diagnostics: [diagnostic("static-scan-failed", "static", message)] };
}

export function astSourceRange(match: AstMatch): SourceRange {
  return {
    startLine: match.range.start.line + 1,
    startColumn: match.range.start.column + 1,
    endLine: match.range.end.line + 1,
    endColumn: match.range.end.column + 1
  };
}

export function unsupportedAstDiagnostics(
  matches: readonly AstMatch[],
  runner: string
): TestEvidenceDiagnostic[] {
  return matches.map((match) =>
    diagnostic(
      "unsupported-entity-shape",
      "static",
      `${runner} source uses unsupported test entity shape ${match.ruleId}`,
      {
        path: match.file,
        line: match.range.start.line + 1,
        column: match.range.start.column + 1,
        runner
      }
    )
  );
}

function parseAstMatches(stdout: string): AstMatch[] {
  return stdout
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const value: unknown = JSON.parse(line);
      return normalizeAstMatch(value);
    });
}

function normalizeAstMatch(value: unknown): AstMatch {
  if (
    !isNonArrayRecord(value) ||
    typeof value.file !== "string" ||
    typeof value.text !== "string" ||
    typeof value.ruleId !== "string" ||
    !isAstRange(value.range) ||
    !isNonArrayRecord(value.metaVariables) ||
    !isNonArrayRecord(value.metaVariables.single)
  ) {
    throw new Error("invalid ast-grep match shape");
  }
  const single = Object.fromEntries(
    Object.entries(value.metaVariables.single).map(([key, candidate]) => {
      if (
        !isNonArrayRecord(candidate) ||
        typeof candidate.text !== "string" ||
        !isAstRange(candidate.range)
      ) {
        throw new Error(`invalid ast-grep metavariable ${key}`);
      }
      return [
        key,
        {
          text: candidate.text,
          range: candidate.range
        }
      ];
    })
  );
  return {
    file: value.file,
    text: value.text,
    range: value.range,
    ruleId: value.ruleId,
    metaVariables: {
      single
    }
  };
}

function isAstRange(value: unknown): value is AstRange {
  return isNonArrayRecord(value) && isAstPosition(value.start) && isAstPosition(value.end);
}

function isAstPosition(value: unknown): value is AstPosition {
  return (
    isNonArrayRecord(value) &&
    Number.isInteger(value.line) &&
    Number(value.line) >= 0 &&
    Number.isInteger(value.column) &&
    Number(value.column) >= 0
  );
}
