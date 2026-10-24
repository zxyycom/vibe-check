import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";
import { test } from "node:test";

import { isNonArrayRecord } from "../../../value-guards.ts";
import { ExternalConsumerPreparationDiagnostics } from "./preparation-diagnostics.ts";

test("consumer preparation diagnostics retain safe facts without changing operation outcomes", () => {
  const lines: string[] = [];
  const diagnostics = new ExternalConsumerPreparationDiagnostics((line) => lines.push(line));
  const expected = Object.freeze({ material: "unchanged" });
  const actual = diagnostics.measure("fixture", () => {
    assert.match(lines[0] ?? "", /"event":"stage-started","stage":"fixture"/u);
    return expected;
  });
  assert.equal(actual, expected);
  const failure = new Error("private failure detail");
  assert.throws(
    () =>
      diagnostics.measure("install", () => {
        throw failure;
      }),
    (error: unknown) => error === failure
  );
  const stdout = "148 packages installed [3.61s]\nhttps://user:secret@registry.invalid/private\n";
  const stderr =
    "Resolving dependencies\nResolved, downloaded and extracted [12]\n\u001b[31mTOKEN=secret\n";
  diagnostics.installationResult(installationResult({ stdout, stderr }));
  const events = lines.map(parseDiagnostic);
  assert.equal(events.length, 5);
  assert.deepEqual(
    events.map(({ event, stage, status }) => ({ event, stage, status })),
    [
      { event: "stage-started", stage: "fixture", status: undefined },
      { event: "stage-finished", stage: "fixture", status: "completed" },
      { event: "stage-started", stage: "install", status: undefined },
      { event: "stage-finished", stage: "install", status: "failed" },
      { event: "install-result", stage: undefined, status: undefined }
    ]
  );
  for (const event of events) {
    const timing = event.durationMs ?? event.elapsedMs;
    assert.equal(typeof timing, "number");
    assert.ok(Number.isFinite(timing));
    assert.ok(Number(timing) >= 0);
  }
  assert.deepEqual(events[4]?.stdout, {
    bytes: Buffer.byteLength(stdout),
    inspectionTruncated: false,
    resolvingDependencies: false,
    resolvedDownloadedExtractedCount: null,
    installedPackageCount: 148
  });
  assert.deepEqual(events[4]?.stderr, {
    bytes: Buffer.byteLength(stderr),
    inspectionTruncated: false,
    resolvingDependencies: true,
    resolvedDownloadedExtractedCount: 12,
    installedPackageCount: null
  });
  assert.doesNotMatch(lines.join(""), /secret|registry|TOKEN|private/u);
  assert.equal(lines.join("").includes("\u001b"), false);

  diagnostics.installationResult(
    installationResult({
      status: null,
      signal: "SIGTERM",
      error: Object.assign(new Error("secret output buffer failure"), { code: "ENOBUFS" }),
      stdout: "",
      stderr: ""
    })
  );
  const signalled = parseDiagnostic(lines[5] ?? "");
  assert.equal(signalled.exitCode, null);
  assert.equal(signalled.signalled, true);
  assert.equal(signalled.commandError, true);
  assert.doesNotMatch(lines.join(""), /secret/u);
});

test("consumer preparation diagnostics bound inspection and transcript without skipping work", () => {
  const lines: string[] = [];
  const diagnostics = new ExternalConsumerPreparationDiagnostics((line) => lines.push(line));
  const marker = "148 packages installed [3.61s]";
  const partialMarker = `${"x".repeat(8192 - marker.length - 1)}\n${marker}`;
  const output = `${partialMarker}${"9".repeat(9000)}\nResolving dependencies\n`;
  diagnostics.installationResult(installationResult({ stdout: output, stderr: "" }));
  assert.deepEqual(parseDiagnostic(lines[0] ?? "").stdout, {
    bytes: Buffer.byteLength(output),
    inspectionTruncated: true,
    resolvingDependencies: false,
    resolvedDownloadedExtractedCount: null,
    installedPackageCount: null
  });
  let operations = 0;
  for (let index = 0; index < 200; index += 1) {
    diagnostics.measure("fixture", () => {
      operations += 1;
    });
  }
  assert.equal(operations, 200);
  assert.ok(Buffer.byteLength(lines.join("")) <= 8192);
  assert.deepEqual(parseDiagnostic(lines.at(-1) ?? ""), { event: "diagnostics-truncated" });
  assert.equal(lines.filter((line) => line.includes('"diagnostics-truncated"')).length, 1);
  for (const line of lines) parseDiagnostic(line);

  const writeFailure = new Error("diagnostic write failed");
  const broken = new ExternalConsumerPreparationDiagnostics(() => {
    throw writeFailure;
  });
  let invoked = false;
  assert.throws(
    () => {
      broken.measure("install", () => {
        invoked = true;
      });
    },
    (error: unknown) => error === writeFailure
  );
  assert.equal(invoked, false);
});

function installationResult(
  overrides: Partial<SpawnSyncReturns<string>> = {}
): SpawnSyncReturns<string> {
  return { pid: 42, status: 0, signal: null, stdout: "", stderr: "", output: [], ...overrides };
}

function parseDiagnostic(line: string): Record<string, unknown> {
  assert.match(line, /^external-consumer-setup \{[^\n]+\}\n$/u);
  const event: unknown = JSON.parse(line.slice("external-consumer-setup ".length));
  assert.ok(isNonArrayRecord(event));
  return event;
}
