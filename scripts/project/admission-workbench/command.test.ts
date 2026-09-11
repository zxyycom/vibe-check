import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { execa } from "execa";

import { requiredFixture } from "./fixture-registry.ts";

const command = "scripts/project/admission-workbench/command.ts";

test("command writes identified virtual stdout for static and isolated learned replicates", async () => {
  const outputs = new Map<string, CommandEvidence>();
  for (const policy of ["static", "learned"]) {
    const result = await execa("bun", [
      command,
      "profile-variation",
      "--policy",
      policy,
      "--seed",
      "9",
      "--replicates",
      "2"
    ]);
    assert.equal(result.stderr, "");
    const evidence = parseEvidence(result.stdout);
    outputs.set(policy, evidence);
    assert.equal(evidence.status, "success");
    assert.equal(evidence.source, "virtual");
    assert.equal(evidence.results.length, 2);
    assert.equal(evidence.candidateIdentity.packageName, "@zxyycom/vibe-check");
    assert.match(evidence.candidateIdentity.entrySha256, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(
      evidence.results.every(({ status }) => status === "success"),
      true
    );
  }
  const staticEvidence = outputs.get("static");
  const learnedEvidence = outputs.get("learned");
  assert.ok(staticEvidence);
  assert.ok(learnedEvidence);
  assert.deepEqual(
    learnedEvidence.results.map((entry) => entry.sampledWorkCommitment),
    staticEvidence.results.map((entry) => entry.sampledWorkCommitment)
  );
  assert.notEqual(learnedEvidence.policyIdentity.historySnapshotSha256, null);
  assert.equal(learnedEvidence.policyIdentity.identityProjectionId, "task-id-v1");
});

test("command exclusively creates an explicit output after complete serialization", async () => {
  const root = await mkdtemp(join(tmpdir(), "admission-command-out-"));
  const output = join(root, "evidence.json");
  const result = await execa("bun", [command, "chain", "--out", output]);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.equal(parseEvidence(await readFile(output, "utf8")).status, "success");

  const second = await execa("bun", [command, "chain", "--out", output], { reject: false });
  assert.equal(second.exitCode, 64);
  assert.equal(parsedRecord(second.stderr).status, "error");
});

test("command rejects malformed arguments inputs and unsafe output targets", async () => {
  const root = await mkdtemp(join(tmpdir(), "admission-command-invalid-"));
  const existing = join(root, "exists.json");
  const malformed = join(root, "malformed.json");
  await writeFile(existing, "x");
  await writeFile(malformed, "{");
  const link = join(root, "link.json");
  await symlink(existing, link);
  for (const args of [
    ["chain", "--seed", "-1"],
    ["chain", "--unknown", "x"],
    [malformed],
    ["chain", "--out", existing],
    ["chain", "--out", link]
  ]) {
    const result = await execa("bun", [command, ...args], { reject: false });
    assert.equal(result.exitCode, 64);
    const error = parsedRecord(result.stderr);
    assert.equal(error.status, "error");
    assert.equal(requiredRecord(error.error).code, "invalid-input");
  }
});

test("command returns nonzero error evidence with parsed identity for a public graph rejection", async () => {
  const root = await mkdtemp(join(tmpdir(), "admission-command-graph-"));
  const path = join(root, "rejected.json");
  await writeFile(
    path,
    JSON.stringify({
      ...structuredClone(requiredFixture("chain")),
      graph: { ...structuredClone(requiredFixture("chain").graph), maxParallel: 0 }
    })
  );
  const result = await execa("bun", [command, path], { reject: false });
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  const evidence = parseEvidence(result.stderr);
  assert.equal(evidence.status, "error");
  assert.equal(evidence.results[0]?.status, "error");
  assert.equal(evidence.results[0]?.error?.code, "graph-rejected");
  assert.equal(evidence.results[0]?.scenarioIdentity?.scenarioId, "chain");
});

test("workbench source consumes only the installed public package and never the Gate entry", async () => {
  const sourceFiles = (await readdir("scripts/project/admission-workbench"))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort();
  for (const file of sourceFiles) {
    const source = await readFile(join("scripts/project/admission-workbench", file), "utf8");
    assert.equal(source.includes('from "../../../src/'), false);
    assert.equal(source.includes('from "../../gate/'), false);
    assert.equal(source.includes("scripts/project/gate/run.ts"), false);
  }
});

interface CommandEvidence {
  readonly candidateIdentity: Readonly<{
    readonly entrySha256: string;
    readonly packageName: string;
  }>;
  readonly policyIdentity: Readonly<{
    readonly historySnapshotSha256: string | null;
    readonly identityProjectionId: string | null;
  }>;
  readonly results: readonly Readonly<{
    readonly error?: Readonly<{ readonly code: string }>;
    readonly sampledWorkCommitment?: string;
    readonly scenarioIdentity?: Readonly<{ readonly scenarioId: string }>;
    readonly status: "error" | "success";
  }>[];
  readonly source: string;
  readonly status: "error" | "success";
}

function parseEvidence(value: string): CommandEvidence {
  const parsed: unknown = JSON.parse(value);
  if (!isCommandEvidence(parsed)) throw new TypeError("command returned invalid evidence");
  return parsed;
}

function parsedRecord(value: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(value);
  return requiredRecord(parsed);
}

function requiredRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new TypeError("expected a record");
  return value;
}

function isCommandEvidence(value: unknown): value is CommandEvidence {
  if (!isRecord(value)) return false;
  const candidate = value.candidateIdentity;
  const policy = value.policyIdentity;
  const results = value.results;
  return (
    isRecord(candidate) &&
    typeof candidate.entrySha256 === "string" &&
    typeof candidate.packageName === "string" &&
    isRecord(policy) &&
    (typeof policy.historySnapshotSha256 === "string" || policy.historySnapshotSha256 === null) &&
    (typeof policy.identityProjectionId === "string" || policy.identityProjectionId === null) &&
    Array.isArray(results) &&
    results.every(
      (result) => isRecord(result) && (result.status === "error" || result.status === "success")
    ) &&
    typeof value.source === "string" &&
    (value.status === "error" || value.status === "success")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
