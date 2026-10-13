import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readlink, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as before from "./trace-probes.before.js";
import * as after from "./trace-probes.after.js";
import { copyCounts, events, faults, resetTrace, settlement } from "./io-trace.mts";

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(baseDirectory, "fixtures", "semantics", "root");
const outside = path.join(baseDirectory, "fixtures", "semantics", "outside");
await mkdir(path.join(root, "a", "b"), { recursive: true });
await mkdir(outside, { recursive: true });
await writeFile(path.join(root, "a", "b", "file.md"), "# A\n");
await writeFile(path.join(outside, "file.md"), "# Outside\n");
async function ensureFixtureSymlink(destination: string, linkPath: string): Promise<void> {
  try {
    await symlink(destination, linkPath);
  } catch (error: unknown) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "EEXIST"
    )
      throw error;
    assert.equal(await readlink(linkPath), destination);
  }
}
await ensureFixtureSymlink("a", path.join(root, "inner"));
await ensureFixtureSymlink(root, path.join(root, "reset"));
await ensureFixtureSymlink(outside, path.join(root, "escape"));
await ensureFixtureSymlink("loop", path.join(root, "loop"));
for (let index = 0; index < 41; index += 1) {
  await ensureFixtureSymlink(
    index === 40 ? "a/b/file.md" : `h${index + 1}`,
    path.join(root, `h${index}`)
  );
}
try {
  assert.equal((await lstat(path.join(root, "pipe"))).isFIFO(), true);
} catch (error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "ENOENT")
    throw error;
  execFileSync("mkfifo", [path.join(root, "pipe")]);
}
const deepRelativePath = `${Array.from({ length: 127 }, () => "d").join("/")}/deep.md`;
await mkdir(path.dirname(path.join(root, deepRelativePath)), { recursive: true });
await writeFile(path.join(root, deepRelativePath), "# Deep\n");

interface ProbeCase {
  readonly name: string;
  readonly relativePath: string;
  readonly kind: string;
  readonly endpoint?: string;
  readonly faultOperation?: string;
  readonly faultPath?: string;
  readonly faultCode?: string;
  readonly plainDepth?: number;
}
const cases: readonly ProbeCase[] = [
  { name: "root", relativePath: "", kind: "contained" },
  {
    name: "ordinary-file",
    relativePath: "a/b/file.md",
    kind: "contained",
    endpoint: "file",
    plainDepth: 3
  },
  {
    name: "depth-128",
    relativePath: deepRelativePath,
    kind: "contained",
    endpoint: "file",
    plainDepth: 128
  },
  { name: "directory", relativePath: "a/b", kind: "contained", endpoint: "directory" },
  { name: "unsupported-fifo", relativePath: "pipe", kind: "contained", endpoint: "unsupported" },
  { name: "missing-leaf", relativePath: "a/b/missing.md", kind: "missing" },
  { name: "missing-parent", relativePath: "a/missing/file.md", kind: "missing" },
  { name: "enotdir", relativePath: "a/b/file.md/child", kind: "unavailable" },
  { name: "lexical-outside", relativePath: "../outside/file.md", kind: "outside" },
  {
    name: "symlink-remaining",
    relativePath: "inner/b/file.md",
    kind: "contained",
    endpoint: "file"
  },
  {
    name: "symlink-root-reset",
    relativePath: "reset/a/b/file.md",
    kind: "contained",
    endpoint: "file"
  },
  { name: "symlink-external", relativePath: "escape/file.md", kind: "outside" },
  { name: "symlink-loop", relativePath: "loop", kind: "unavailable" },
  { name: "exact-40-hops", relativePath: "h1", kind: "contained", endpoint: "file" },
  { name: "exceeds-40-hops", relativePath: "h0", kind: "unavailable" },
  {
    name: "lstat-failure",
    relativePath: "a/b/file.md",
    kind: "unavailable",
    faultOperation: "lstat",
    faultPath: "a/b",
    faultCode: "EACCES"
  },
  {
    name: "readlink-failure",
    relativePath: "inner/b/file.md",
    kind: "unavailable",
    faultOperation: "readlink",
    faultPath: "inner",
    faultCode: "EIO"
  }
];
const evidence: unknown[] = [];
for (const probeCase of cases) {
  const observations = [];
  const copies = [];
  for (const api of [before, after]) {
    resetTrace();
    if (
      probeCase.faultOperation !== undefined &&
      probeCase.faultPath !== undefined &&
      probeCase.faultCode !== undefined
    ) {
      faults.set(
        `${probeCase.faultOperation}:${path.join(root, probeCase.faultPath)}`,
        probeCase.faultCode
      );
    }
    const result = await api.probeRootContainedPath(root, path.join(root, probeCase.relativePath));
    assert.equal(result.kind, probeCase.kind);
    if (probeCase.endpoint !== undefined) {
      assert.ok(result.kind === "contained");
      assert.equal(result.endpoint?.kind, probeCase.endpoint);
    }
    assert.equal(settlement().activeOperations, 0);
    assert.ok(settlement().peakOperations <= 1);
    if (probeCase.name === "lexical-outside") assert.deepEqual(events, []);
    if (probeCase.name === "symlink-external")
      assert.ok(events.every((event) => !event.includes(`${outside}/`)));
    if (probeCase.name === "exact-40-hops")
      assert.equal(events.filter((event) => event.startsWith("start:readlink:")).length, 40);
    if (probeCase.name === "exceeds-40-hops" || probeCase.name === "symlink-loop")
      assert.equal(events.filter((event) => event.startsWith("start:readlink:")).length, 40);
    observations.push({ result, events: [...events], settlement: settlement() });
    copies.push(copyCounts.remainingArraySlots);
  }
  assert.deepEqual(observations[0], observations[1]);
  if (probeCase.plainDepth !== undefined) {
    assert.deepEqual(copies, [(probeCase.plainDepth * (probeCase.plainDepth - 1)) / 2, 0]);
  }
  evidence.push({
    name: probeCase.name,
    parity: true,
    remainingArraySlotCopies: copies,
    observation: observations[0]
  });
}
for (const readCase of [
  { name: "exact-cap", filePath: "a/b/file.md", maxBytes: 4, ok: true },
  { name: "over-cap", filePath: "a/b/file.md", maxBytes: 3, ok: false, reason: "too-large" },
  { name: "no-follow-symlink", filePath: "h40", maxBytes: 16, ok: false, reason: "unavailable" },
  { name: "nonregular-directory", filePath: "a/b", maxBytes: 16, ok: false, reason: "unavailable" }
]) {
  const observations = [];
  for (const api of [before, after]) {
    resetTrace();
    const result = await api.readRegularFile(path.join(root, readCase.filePath), readCase.maxBytes);
    assert.equal(result.ok, readCase.ok);
    if (result.ok) assert.equal(Buffer.from(result.bytes).toString("utf8"), "# A\n");
    else assert.equal(result.reason, readCase.reason);
    assert.equal(settlement().activeOperations, 0);
    assert.equal(settlement().peakOperations, 1);
    observations.push({ result, events: [...events], settlement: settlement() });
  }
  assert.deepEqual(observations[0], observations[1]);
  evidence.push({ name: readCase.name, parity: true, observation: observations[0] });
}
await writeFile(
  path.join(baseDirectory, "raw", "node-trace-parity.json"),
  `${JSON.stringify({ formedAt: new Date().toISOString(), runtime: process.versions, evidence }, null, 2)}\n`
);
console.log(
  `PASS: ${evidence.length} probe/read variants; exact IO trace, serial peak and settlement parity`
);
