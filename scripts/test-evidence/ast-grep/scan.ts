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

type AstRuleId =
  | "bun-native-test"
  | "bun-unsupported-alias"
  | "bun-unsupported-dynamic"
  | "bun-unsupported-parameterized";

export type AstMatch = {
  file: string;
  text: string;
  range: AstRange;
  ruleId: AstRuleId;
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

export async function scanAstRules(
  options: {
    cancelSignal?: AbortSignal;
    workspaceRoot: string;
    configPath: string;
    paths: string[];
  },
  runScan = runAstGrep
): Promise<{
  matches: AstMatch[];
  diagnostics: TestEvidenceDiagnostic[];
}> {
  const configName = path.basename(options.configPath);
  const result = await astGrepScanResult(options, runScan);
  if (result.kind === "failure") return result.value;
  if (
    result.value.error !== undefined ||
    result.value.signal !== null ||
    result.value.timedOut === true ||
    (result.value.status !== 0 && result.value.status !== 1)
  ) {
    const errorMessage =
      result.value.error?.message ??
      (result.value.timedOut === true ? "process timed out" : "no error output");
    return staticScanFailure(
      `ast-grep config ${configName} failed with status ${String(result.value.status)}, signal ${result.value.signal ?? "none"}: ${result.value.stderr.trim() || errorMessage}`
    );
  }
  return parsedAstScanResult(result.value.stdout, configName);
}

async function astGrepScanResult(
  options: Parameters<typeof scanAstRules>[0],
  runScan: typeof runAstGrep
): Promise<
  | Readonly<{ readonly kind: "result"; readonly value: Awaited<ReturnType<typeof runAstGrep>> }>
  | Readonly<{
      readonly kind: "failure";
      readonly value: { matches: AstMatch[]; diagnostics: TestEvidenceDiagnostic[] };
    }>
> {
  let result;
  try {
    result = await runScan(
      [
        "scan",
        "--config",
        options.configPath,
        "--json=stream",
        "--color",
        "never",
        ...options.paths
      ],
      {
        ...(options.cancelSignal === undefined ? {} : { cancelSignal: options.cancelSignal }),
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
  configName: string
): { matches: AstMatch[]; diagnostics: TestEvidenceDiagnostic[] } {
  try {
    return { matches: parseAstMatches(stdout), diagnostics: [] };
  } catch (error) {
    return staticScanFailure(
      `ast-grep config ${configName} returned malformed output: ${error instanceof Error ? error.message : String(error)}`
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
    !isAstRange(value.range) ||
    !isNonArrayRecord(value.metaVariables) ||
    !isNonArrayRecord(value.metaVariables.single)
  ) {
    throw new Error("invalid ast-grep match shape");
  }
  if (!isAstRuleId(value.ruleId)) {
    throw new Error(`unknown ast-grep ruleId ${String(value.ruleId)}`);
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
  if (!isNonArrayRecord(value) || !isAstPosition(value.start) || !isAstPosition(value.end)) {
    return false;
  }
  return (
    value.end.line > value.start.line ||
    (value.end.line === value.start.line && value.end.column >= value.start.column)
  );
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

function isAstRuleId(value: unknown): value is AstRuleId {
  switch (value) {
    case "bun-native-test":
    case "bun-unsupported-alias":
    case "bun-unsupported-dynamic":
    case "bun-unsupported-parameterized":
      return true;
    default:
      return false;
  }
}
