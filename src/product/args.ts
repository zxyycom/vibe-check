import { DEFAULT_CONFIG } from "./config.ts";
import { booleanOption, parsePositiveInteger, parseScriptArgs, stringOption, type ScriptArgToken } from "./foundation/src/args.ts";
import { CliUsageError } from "./foundation/src/errors.ts";
import {
  QUALITY_SCAN_PROFILES,
  type QualityScanOptions,
  type QualityScanProfile
} from "./quality-core/src/scan-command/command-model.ts";
import {
  GATE_POLICY_DESCRIPTORS,
  GATE_POLICY_HELP,
  GATE_POLICY_VALUES,
  type GatePolicy
} from "./quality-core/src/model/gate-policy.ts";

export type ParsedScanArgs = Omit<
  QualityScanOptions,
  "artifactDir" | "baselineCommitSha" | "topN"
> & {
  artifactDir: string | null;
  baselineRevision: string | null;
  configFile: string | null;
  gatePolicy: GatePolicy | null;
  topN: number | null;
};

export function parseArgs(argv: readonly string[] = process.argv.slice(2)): ParsedScanArgs {
  if (hasRetiredWithBaselineOption(argv)) {
    throw new CliUsageError(
      "--with-baseline was removed; use --baseline <revision> for comparison or omit it for a current snapshot"
    );
  }

  let parsed: ReturnType<typeof parseScriptArgs>;
  try {
    parsed = parseScriptArgs({
      args: argv,
      options: {
        baseline: { type: "string" },
        "changed-files": { type: "string" },
        config: { type: "string" },
        gate: { type: "string" },
        "top-n": { type: "string" },
        "artifact-dir": { type: "string" },
        profile: { type: "string" },
        "skip-baseline": { type: "boolean" },
        "verification-output": { type: "boolean" },
        help: { type: "boolean" }
      }
    });
  } catch (error: unknown) {
    if (isMissingGateValueError(error)) {
      throw gateUsageError("--gate requires a value");
    }
    if (isMissingOptionValueError(error, "baseline")) {
      throw new CliUsageError("--baseline requires a non-empty revision");
    }
    throw error;
  }
  assertSingleOption(parsed.tokens, "config");
  assertSingleOption(parsed.tokens, "baseline");
  assertSingleGateOption(parsed.tokens);

  if (booleanOption(parsed.values, "help")) {
    printHelp();
    process.exit(0);
  }

  const baselineRevision = stringOption(parsed.values, "baseline") ?? null;
  const gatePolicy = parseGatePolicy(stringOption(parsed.values, "gate"));
  const topN = stringOption(parsed.values, "top-n");
  const scanProfile = parseScanProfile(stringOption(parsed.values, "profile") ?? "full");
  const gateDescriptor = gatePolicy === null
    ? null
    : GATE_POLICY_DESCRIPTORS.find(({ value }) => value === gatePolicy)!;
  const skipsBaseline = hasOption(parsed.tokens, "skip-baseline");
  if (baselineRevision === "") {
    throw new CliUsageError("--baseline requires a non-empty revision");
  }
  if (baselineRevision !== null && skipsBaseline) {
    throw new CliUsageError("--baseline and --skip-baseline cannot be combined");
  }
  if (gateDescriptor?.requiresComparison === true && scanProfile === "quick") {
    throw new CliUsageError(
      `--gate ${gatePolicy} requires --profile full; use --profile full or choose --gate all`
    );
  }
  if (gateDescriptor?.requiresComparison === true && baselineRevision === null) {
    if (skipsBaseline) {
      throw new CliUsageError(
        `--gate ${gatePolicy} cannot be combined with --skip-baseline; remove --skip-baseline and provide --baseline <revision>`
      );
    }
    throw new CliUsageError(
      `--gate ${gatePolicy} requires an explicit --baseline <revision>; provide one to enable comparison`
    );
  }
  if (scanProfile === "quick" && baselineRevision !== null) {
    throw new CliUsageError(
      "quick quality check does not support --baseline; use --profile full for baseline comparison"
    );
  }

  return {
    artifactDir: stringOption(parsed.values, "artifact-dir") ?? null,
    baselineRevision,
    changedFiles: stringOption(parsed.values, "changed-files") ?? null,
    configFile: stringOption(parsed.values, "config") ?? null,
    gatePolicy,
    scanProfile,
    topN: topN === undefined ? null : parsePositiveInteger(topN, "--top-n"),
    verificationOutput: booleanOption(parsed.values, "verification-output")
  };
}

function parseGatePolicy(value: string | undefined): GatePolicy | null {
  if (value === undefined) return null;
  if (GATE_POLICY_VALUES.includes(value as GatePolicy)) {
    return value as GatePolicy;
  }
  throw gateUsageError(`unknown --gate value: ${value}`);
}

function parseScanProfile(value: string): QualityScanProfile {
  if (QUALITY_SCAN_PROFILES.includes(value as QualityScanProfile)) {
    return value as QualityScanProfile;
  }
  throw new Error(`unknown quality scan profile: ${value}`);
}

function hasOption(tokens: readonly ScriptArgToken[], name: string): boolean {
  return tokens.some((token) => token.kind === "option" && token.name === name);
}

function assertSingleGateOption(tokens: readonly ScriptArgToken[]): void {
  if (tokens.filter((token) => token.kind === "option" && token.name === "gate").length > 1) {
    throw gateUsageError("--gate may only be provided once");
  }
}

function assertSingleOption(tokens: readonly ScriptArgToken[], name: string): void {
  const count = tokens.filter(
    (token) => token.kind === "option" && token.name === name
  ).length;
  if (count > 1) {
    throw new CliUsageError(`--${name} may only be provided once`);
  }
}

function gateUsageError(reason: string): CliUsageError {
  const syntax = `--gate <${GATE_POLICY_VALUES.join("|")}>`;
  return new CliUsageError(
    `${reason}; use ${syntax} and choose one of: ${GATE_POLICY_VALUES.join(", ")}`
  );
}

function isMissingGateValueError(error: unknown): boolean {
  return isMissingOptionValueError(error, "gate");
}

function isMissingOptionValueError(error: unknown, name: string): boolean {
  return error instanceof Error &&
    "code" in error &&
    error.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" &&
    error.message.includes(`--${name}`);
}

function hasRetiredWithBaselineOption(argv: readonly string[]): boolean {
  return argv.some((argument) =>
    argument === "--with-baseline" || argument.startsWith("--with-baseline=")
  );
}

function printHelp(): void {
  const gatePolicyHelp = GATE_POLICY_HELP.map((line) => `  ${line}`).join("\n");
  console.log(`
Vibe Check Quality Observability

Usage: bun run product:cli -- scan [project-root] [options]

Options:
  --profile <quick|full>  Select quick or full quality check mode (default: full)
  --gate <${GATE_POLICY_VALUES.join("|")}>  Evaluate a named record policy as a CI quality gate
  --baseline <revision>   Compare with an explicit locally available Git revision
  --changed-files <file>  List file; relative paths use project root
                          Absolute list paths are kept; entries are project-relative, one per line
  --config <file>         Complete semantic config v1; relative paths use project root
                          Explicit --config has highest precedence
  --top-n <n>             Records per report section (neutral default: ${DEFAULT_CONFIG.report.topN})
  --artifact-dir <dir>    Artifact output directory (neutral default: ${DEFAULT_CONFIG.artifactDir})
  --skip-baseline         Request the default current-snapshot-only scan
  --verification-output   Print verifier-style status based on unaccepted warnings
  --help                  Show this help

Output:
  run.json                Machine-readable run, reference, and decision evidence
  records.ndjson          Machine-readable quality records
  report.md               Human-readable Markdown summary
  raw/                    Raw scanner outputs

Profiles:
  quick                   Fast current-snapshot check; skips baseline and duplicate detection
  full                    Full check; comparison runs only with explicit --baseline

Config selection:
  Otherwise .vibe-check/config.json is discovered from the normalized project root.
  Without either file, ungated scans use the neutral default (not persisted).
  Every gate requires a complete file-backed config from discovery or --config.

Gate policies:
${gatePolicyHelp}
  Accepted records remain visible and do not block the gate.
  changed and regressions require --profile full and explicit --baseline <revision>.
  Exit 1 when an evaluated gate failed after artifacts validate.
  Exit 2 when a requested gate could not be evaluated or the scan/output failed.
`);
}
