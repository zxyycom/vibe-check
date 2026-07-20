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

export type ParsedScanArgs = Omit<QualityScanOptions, "artifactDir" | "topN"> & {
  artifactDir: string | null;
  configFile: string | null;
  gatePolicy: GatePolicy | null;
  topN: number | null;
};

const skipBaselineByToken: Partial<Record<string, boolean>> = {
  baseline: false,
  "skip-baseline": true,
  "with-baseline": false
};

export function parseArgs(argv: readonly string[] = process.argv.slice(2)): ParsedScanArgs {
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
        "with-baseline": { type: "boolean" },
        help: { type: "boolean" }
      }
    });
  } catch (error: unknown) {
    if (isMissingGateValueError(error)) {
      throw gateUsageError("--gate requires a value");
    }
    throw error;
  }
  assertSingleOption(parsed.tokens, "config");
  assertSingleGateOption(parsed.tokens);

  if (booleanOption(parsed.values, "help")) {
    printHelp();
    process.exit(0);
  }

  const baseline = stringOption(parsed.values, "baseline") ?? null;
  const gatePolicy = parseGatePolicy(stringOption(parsed.values, "gate"));
  const topN = stringOption(parsed.values, "top-n");
  const scanProfile = parseScanProfile(stringOption(parsed.values, "profile") ?? "full");
  const gateDescriptor = gatePolicy === null
    ? null
    : GATE_POLICY_DESCRIPTORS.find(({ value }) => value === gatePolicy)!;
  if (gateDescriptor?.requiresComparison === true && scanProfile === "quick") {
    throw new CliUsageError(
      `--gate ${gatePolicy} requires --profile full; use --profile full or choose --gate all`
    );
  }
  if (gateDescriptor?.requiresComparison === true && hasOption(parsed.tokens, "skip-baseline")) {
    throw new CliUsageError(
      `--gate ${gatePolicy} requires baseline comparison and cannot be combined with --skip-baseline; remove --skip-baseline`
    );
  }
  if (scanProfile === "quick" && hasBaselineOption(parsed.tokens)) {
    throw new Error("quick quality check does not support baseline options; use --profile full for baseline comparison");
  }

  return {
    artifactDir: stringOption(parsed.values, "artifact-dir") ?? null,
    baseline,
    changedFiles: stringOption(parsed.values, "changed-files") ?? null,
    configFile: stringOption(parsed.values, "config") ?? null,
    gatePolicy,
    scanProfile,
    skipBaseline: scanProfile === "quick"
      ? true
      : gateDescriptor?.requiresComparison === true
        ? false
        : resolveSkipBaseline(parsed.tokens, baseline === null),
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

function resolveSkipBaseline(tokens: readonly ScriptArgToken[], defaultValue: boolean): boolean {
  let skipBaseline = defaultValue;
  for (const token of tokens) {
    if (token.kind !== "option" || token.name === undefined) continue;
    skipBaseline = skipBaselineByToken[token.name] ?? skipBaseline;
  }
  return skipBaseline;
}

function hasBaselineOption(tokens: readonly ScriptArgToken[]): boolean {
  return tokens.some((token) =>
    token.kind === "option" &&
    (token.name === "baseline" || token.name === "with-baseline")
  );
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
    throw new Error(`--${name} may only be provided once`);
  }
}

function gateUsageError(reason: string): CliUsageError {
  const syntax = `--gate <${GATE_POLICY_VALUES.join("|")}>`;
  return new CliUsageError(
    `${reason}; use ${syntax} and choose one of: ${GATE_POLICY_VALUES.join(", ")}`
  );
}

function isMissingGateValueError(error: unknown): boolean {
  return error instanceof Error &&
    "code" in error &&
    error.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" &&
    error.message.includes("--gate");
}

function printHelp(): void {
  const gatePolicyHelp = GATE_POLICY_HELP.map((line) => `  ${line}`).join("\n");
  console.log(`
Vibe Check Quality Observability

Usage: bun run product:cli -- scan [project-root] [options]

Options:
  --profile <quick|full>  Select quick or full quality check mode (default: full)
  --gate <${GATE_POLICY_VALUES.join("|")}>  Evaluate one warning scope as a CI quality gate
  --baseline <sha>        Generate baseline delta from an explicit commit SHA
  --with-baseline         Auto-detect and scan previous-code baseline
  --changed-files <file>  List file; relative paths use project root
                          Absolute list paths are kept; entries are project-relative, one per line
  --config <file>         Complete JSON config; relative paths use project root
                          Omit to use built-in defaults; no discovery or merge is performed
  --top-n <n>             Top N for rankings (built-in default: ${DEFAULT_CONFIG.report.topN})
  --artifact-dir <dir>    Artifact output directory (built-in default: ${DEFAULT_CONFIG.artifactDir})
  --skip-baseline         Skip baseline commit detection and scan
  --verification-output   Print verifier-style status based on unaccepted warnings
  --help                  Show this help

Output:
  metrics.json            Machine-readable quality metrics
  report.md               Human-readable Markdown summary
  warnings.ndjson         Changed warning records when baseline comparison is enabled
  warnings-all.ndjson     Full warning records for local review
  raw/                    Raw scanner outputs

Profiles:
  quick                   Fast current-snapshot check; skips baseline and jscpd
  full                    Full check; runs all configured scanners and optional baseline comparison

Gate policies:
${gatePolicyHelp}
  Accepted warnings remain visible and do not block the gate.
  Exit 1 when an evaluated gate failed after artifacts validate.
  Exit 2 when a requested gate could not be evaluated or the scan/output failed.
`);
}
