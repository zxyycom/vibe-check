import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../data-boundary/value-shapes.ts";
import type { CheckOutcome } from "../../check/check.ts";

import { fingerprintProjectFiles } from "../project-files/file-fingerprint.ts";
import { createRoot, scanner } from "./default-check.execution.test-support.ts";

export interface CacheAcquisitionProbeResult {
  readonly counts: Readonly<{
    sourceReads: number;
    fingerprintHashes: number;
    git: number;
    cacheDirectory: number;
  }>;
  readonly outcome: CheckOutcome;
}

export type CacheAcquisitionProbe = (
  mode: "cache-off" | "cache-on" | "no-eligible" | "unavailable",
  minimumTokens?: number
) => Promise<CacheAcquisitionProbeResult>;

export function assertConditionalCacheAcquisition(): void {
  const root = createRoot("vibe-check-duplicate-cache-acquisition-");
  try {
    createReadingScanner(root);
    const child = spawnSync(
      process.execPath,
      [
        join(
          dirname(fileURLToPath(import.meta.url)),
          "default-check.cache-acquisition.test-support.ts"
        ),
        root
      ],
      { encoding: "utf8" }
    );
    assert.equal(child.status, 0, child.stderr);
    const completion: unknown = JSON.parse(child.stdout);
    assert.deepEqual(completion, { probeCount: 10 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Test-owned expectations run in the isolated child; each probe remains a new Check and Run. */
export async function assertCacheAcquisitionSequence(
  root: string,
  probe: CacheAcquisitionProbe
): Promise<void> {
  const disabled = await probe("cache-off");
  assert.equal(disabled.outcome.status, "passed");
  assertNoCacheAcquisition(disabled);
  assert.equal(readCount(root, "scans"), 1);
  assert.equal(readCount(root, "versions"), 1);
  assert.equal(existsSync(join(root, ".cache-probe")), false);

  const noEligible = await probe("no-eligible");
  assert.deepEqual(noEligible.outcome, {
    status: "not-applicable",
    reason: { code: "no-eligible-input" }
  });
  assertNoCacheAcquisition(noEligible);
  assert.equal(readCount(root, "scans"), 1);
  assert.equal(readCount(root, "versions"), 1);

  const unavailable = await probe("unavailable");
  assert(unavailable.outcome.status === "unavailable");
  assert.deepEqual(unavailable.outcome.reason, { code: "external-dependency-unavailable" });
  assertNoCacheAcquisition(unavailable);
  assert.equal(existsSync(join(root, ".cache-probe")), false);

  // A cache miss samples before scan. The scanner mutates one source after actually reading it.
  const before = fingerprintProjectFiles(root, ["src/a.ts", "src/b.ts"]);
  writeFileSync(join(root, "mutate-once"), "yes");
  const miss = await probe("cache-on");
  assert.equal(miss.outcome.status, "passed");
  assert.deepEqual(miss.counts, {
    sourceReads: 2,
    fingerprintHashes: 3,
    git: 1,
    cacheDirectory: 1
  });
  assert.equal(readCount(root, "scans"), 2);
  const cacheRoot = join(root, ".cache-probe", "quality-scan-cache-v3");
  const entries = readdirSync(cacheRoot);
  assert.equal(entries.length, 1);
  const payload: unknown = JSON.parse(readFileSync(join(cacheRoot, entries[0] ?? ""), "utf8"));
  assert(isNonArrayRecord(payload));
  assert.deepEqual(payload.inputFingerprint, before);
  assert.equal(payload.configVersion, "4");
  assert.equal(payload.toolVersion, "5.0.11");

  // The changed source misses, then the unchanged identity hits without another scan.
  await probe("cache-on");
  assert.equal(readCount(root, "scans"), 3);
  const hit = await probe("cache-on");
  assert.deepEqual(hit.counts, miss.counts);
  assert.equal(readCount(root, "scans"), 3);
  assert.equal(readCount(root, "versions"), 4);

  writeFileSync(join(root, "version"), "5.0.12");
  await probe("cache-on");
  assert.equal(readCount(root, "scans"), 4);
  await probe("cache-on", 101);
  assert.equal(readCount(root, "scans"), 5);
  writeFileSync(join(root, "src", "c.ts"), "export const c = 3;\n");
  await probe("cache-on", 101);
  assert.equal(readCount(root, "scans"), 6);

  // Collection succeeds, then the executable removes a source during its version probe.
  // Cache-off still lets the scanner own actual read failure; no cache preflight substitutes for it.
  writeFileSync(join(root, "remove-on-version"), "yes");
  const readFailure = await probe("cache-off");
  assert(readFailure.outcome.status === "unavailable");
  assert.deepEqual(readFailure.outcome.reason, { code: "external-execution-failed" });
  assertNoCacheAcquisition(readFailure);
}

function assertNoCacheAcquisition(result: CacheAcquisitionProbeResult): void {
  assert.deepEqual(result.counts, {
    sourceReads: 0,
    fingerprintHashes: 0,
    git: 0,
    cacheDirectory: 0
  });
}

function readCount(root: string, name: string): number {
  return Number(readFileSync(join(root, name), "utf8"));
}

function createReadingScanner(root: string): void {
  scanner(
    root,
    [
      "import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "const count = (name) => { const file = join(process.cwd(), name); writeFileSync(file, String(existsSync(file) ? Number(readFileSync(file, 'utf8')) + 1 : 1)); };",
      "if (process.argv.includes('--version')) {",
      "  count('versions');",
      "  if (existsSync('remove-on-version')) { unlinkSync('src/a.ts'); unlinkSync('remove-on-version'); }",
      "  process.stdout.write('jscpd ' + (existsSync('version') ? readFileSync('version', 'utf8') : '5.0.11') + '\\n');",
      "} else {",
      "  count('scans');",
      "  const config = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--config') + 1], 'utf8'));",
      "  for (const file of config.path) readFileSync(file, 'utf8');",
      "  if (existsSync('mutate-once')) { writeFileSync('src/a.ts', 'export const changed = true;\\n'); unlinkSync('mutate-once'); }",
      "  const output = process.argv[process.argv.indexOf('--output') + 1];",
      "  mkdirSync(output, { recursive: true });",
      "  writeFileSync(join(output, 'jscpd-report.json'), JSON.stringify({ duplicates: [] }));",
      "}"
    ].join("\n")
  );
}
