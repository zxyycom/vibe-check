// Investigation-only probe. Run from the workspace with:
// mise exec -- node docs/investigations/_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs
// This imports current source, not a published package; output is observational, not a regression test.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { commandCheck, defineConfig, run } from "../../../../src/index.ts";

const workspace = fileURLToPath(new URL("../../../../", import.meta.url));
const outputs = {
  diagnosticLogging: { enabled: false },
  machinePublication: { enabled: false },
  progressRendering: { enabled: false }
};
const observations = [];

for (const [fd, timeoutMs, exitAfter, exitCode] of [
  [1, 1_000, null, 0],
  [1, 3_000, null, 0],
  [2, 3_000, null, 0],
  [1, 3_000, 600, 0],
  [1, 1_000, 200, 23]
]) {
  const root = mkdtempSync(join(tmpdir(), "vibe-output-limit-investigation-"));
  let callbackCalls = 0;
  let received = null;
  try {
    const pidPath = join(root, "pid");
    const effectPath = join(root, "effect");
    const source = [
      "const fs = require('node:fs');",
      `fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));`,
      `fs.writeSync(${fd}, 'x'.repeat(4096));`,
      `setTimeout(() => fs.writeFileSync(${JSON.stringify(effectPath)}, 'still-running'), 250);`,
      exitAfter === null
        ? "setInterval(() => {}, 1000);"
        : `setTimeout(() => process.exit(${exitCode}), ${exitAfter});`
    ].join("\n");
    const check = commandCheck({
      checkId: "probe",
      displayName: "Output limit probe",
      executable: process.execPath,
      arguments: ["--eval", source],
      outputByteLimit: 32,
      timeoutMs,
      afterCommand: {
        execute: ({ command }) => {
          callbackCalls += 1;
          received = {
            exitCode: command.exitCode,
            stdoutLength: command.stdout.length,
            stderrLength: command.stderr.length
          };
          return { status: "passed", data: { accepted: true } };
        }
      }
    });
    const start = performance.now();
    const result = await run(defineConfig({ checks: [check], outputs }), { projectRoot: root });
    const elapsedMs = performance.now() - start;
    const pid = Number(readFileSync(pidPath, "utf8"));
    let childAliveAfterReturn = true;
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
      childAliveAfterReturn = false;
    }
    observations.push({
      layer: "public-api",
      fd,
      timeoutMs,
      exitAfter,
      exitCode,
      elapsedMs,
      kind: result.kind,
      outcome: result.kind === "completed" ? result.snapshot.checks[0].outcome : null,
      callbackCalls,
      received,
      effectAfter250ms: existsSync(effectPath),
      childAliveAfterReturn
    });
  } finally {
    // Only this invocation's freshly allocated fixture directory is removed.
    rmSync(root, { force: true, recursive: true });
  }
}

const raw = await execa(
  process.execPath,
  ["--eval", 'require("node:fs").writeSync(1,"x".repeat(4096));setTimeout(()=>process.exit(23),200)'],
  { maxBuffer: 32, timeout: 1_000, reject: false }
);
observations.push({
  layer: "raw-execa",
  exitCode: raw.exitCode,
  isMaxBuffer: raw.isMaxBuffer,
  timedOut: raw.timedOut,
  signal: raw.signal ?? null,
  stdoutLength: raw.stdout.length
});

const unicode = commandCheck({
  checkId: "unicode",
  displayName: "UTF-8 byte limit probe",
  executable: process.execPath,
  arguments: ["--eval", 'require("node:fs").writeSync(1,"中".repeat(32))'],
  timeoutMs: 1_000,
  outputByteLimit: 64
});
const unicodeResult = await run(defineConfig({ checks: [unicode], outputs }));
observations.push({
  layer: "public-api-unicode",
  utf8Bytes: 96,
  limit: 64,
  outcome: unicodeResult.kind === "completed" ? unicodeResult.snapshot.checks[0].outcome : null
});

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: workspace, encoding: "utf8" }).trim(),
  platform: process.platform,
  arch: process.arch,
  node: process.versions.node,
  bun: process.versions.bun ?? null,
  execa: JSON.parse(readFileSync(new URL("../../../../node_modules/execa/package.json", import.meta.url), "utf8")).version,
  observations
}, null, 2));
