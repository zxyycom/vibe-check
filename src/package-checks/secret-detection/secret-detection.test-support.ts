import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import { executeSecretDetection, settleSecretDetectionFindings } from "./execution.ts";
import type { ResolvedSecretDetectionOptions } from "./options.ts";

export const EXPLICIT_FILES: ProjectFileSelection = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*"]),
  source: "filesystem"
});
export const CANARY = "MIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const CANARY_DIGEST = createHash("sha256").update(CANARY).digest("hex");
const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({ error: { checkId, code: "dependency-not-declared" as const }, ok: false }),
  list: () => Object.freeze([])
});

interface ObservedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

export interface SecretDetectionExecution {
  readonly records: readonly ObservedRecord[];
  readonly result: CheckResult;
}

export function runSecretDetection(
  root: string,
  overrides: Readonly<Partial<ResolvedSecretDetectionOptions>> = {},
  signal = new AbortController().signal
): Promise<SecretDetectionExecution> {
  const records: ObservedRecord[] = [];
  const options: DeepReadonly<ResolvedSecretDetectionOptions> = Object.freeze({
    files: EXPLICIT_FILES,
    findingWaivers: Object.freeze([]),
    maximumFileBytes: 1_048_576,
    maximumFileCount: 2_048,
    maximumTotalBytes: 8_388_608,
    ...overrides
  });
  const context: CheckExecutionContext<ResolvedSecretDetectionOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options,
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({
      report(identity: Readonly<{ readonly id: string }>, data: object): void {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  return executeSecretDetection(context).then((result) =>
    Object.freeze({ records: Object.freeze(records), result })
  );
}

export function settleDuplicateSafeFindings(
  identity: Readonly<{
    readonly ordinal: number;
    readonly path: string;
    readonly ruleId: "@secretlint/secretlint-rule-privatekey";
    readonly structuralClass: "text-document";
  }>
): SecretDetectionExecution {
  const records: ObservedRecord[] = [];
  const context: CheckExecutionContext<ResolvedSecretDetectionOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: Object.freeze({
      files: EXPLICIT_FILES,
      findingWaivers: Object.freeze([{ identity, reason: "A unique finding only." }]),
      maximumFileBytes: 1_048_576,
      maximumFileCount: 2_048,
      maximumTotalBytes: 8_388_608
    }),
    project: Object.freeze({ flags: Object.freeze([]), root: "/unused" }),
    records: Object.freeze({
      report(recordIdentity: Readonly<{ readonly id: string }>, data: object): void {
        records.push(Object.freeze({ data, identity: recordIdentity }));
      }
    }),
    signal: new AbortController().signal
  });
  const issue = Object.freeze({
    location: Object.freeze({ endColumn: 2, endLine: 1, startColumn: 1, startLine: 1 }),
    ...identity
  });
  const result = settleSecretDetectionFindings(
    context,
    2,
    Object.freeze([issue, issue]),
    Object.freeze([])
  );
  return Object.freeze({ records: Object.freeze(records), result });
}

export function projectRoot(): string {
  return mkdtempSync(join(tmpdir(), "vibe-check-secret-detection-"));
}

export function syntheticPrivateKey(value: string = CANARY): string {
  return `-----BEGIN PRIVATE KEY-----\n${value}${"A".repeat(160)}\n-----END PRIVATE KEY-----\n`;
}

export function syntheticPrivateKeyPlaceholder(): string {
  return "-----BEGIN PRIVATE KEY-----\nnot-a-private-key\n-----END PRIVATE KEY-----\n";
}

export function allProductSurface(observed: SecretDetectionExecution): string {
  return JSON.stringify({ records: observed.records, result: observed.result });
}

export function assertNoCanaryMaterial(surface: string): void {
  assertNoCanaryValue(surface, CANARY);
  assertNoCanaryValue(surface, CANARY_DIGEST);
  assertNoCanaryValue(surface, "BEGIN PRIVATE KEY");
}

export function completedSecretDetectionData(observed: SecretDetectionExecution) {
  if (observed.result.status !== "passed" && observed.result.status !== "failed") {
    throw new Error(
      `expected a completed secret detection result, received ${observed.result.status}`
    );
  }
  return observed.result.data;
}

function assertNoCanaryValue(surface: string, value: string): void {
  if (surface.includes(value))
    throw new Error("secretDetection published synthetic canary material");
}
