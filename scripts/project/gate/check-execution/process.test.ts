import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ProcessResult } from "../../../process-execution/execution.ts";
import { defineConfig, run, type CheckResult } from "vibe-check";
import {
  createProcessCheck,
  createProcessCheckWithDataDependency,
  type ProcessCheckDescriptor,
  type ProcessCheckDependencies
} from "./process.ts";

const definition: ProcessCheckDescriptor = Object.freeze({
  checkId: "fixture-command",
  command: process.execPath,
  args: [],
  displayName: "Fixture command",
  environment: {}
});

describe("Project Gate process Check", () => {
  it("writes one complete transcript and passes only a zero command exit", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const check = createProcessCheck(
        {
          ...definition,
          args: [
            "-e",
            "if (process.env.PATH === undefined || process.env.PROJECT_GATE_OVERRIDE_FIXTURE !== 'override') process.exit(3);process.stdout.write('out');process.stderr.write('err')"
          ],
          environment: { PROJECT_GATE_OVERRIDE_FIXTURE: "override" }
        },
        root
      );
      const records: ReportedRecord[] = [];
      const outcome = await invoke(check, records);

      assert.deepEqual(outcome, { status: "passed", data: { exitCode: 0 } });
      assert.deepEqual(records, []);
      const transcript = readFileSync(join(root, "fixture-command.log"), "utf8");
      assert.match(transcript, /--- stdout ---\nout/);
      assert.match(transcript, /--- stderr ---\nerr/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("derives process environment from one typed provider dependency", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    let dependencyEnvironmentValid = true;
    let starts = 0;
    let observedEnvironment: NodeJS.ProcessEnv | undefined;
    try {
      const check = createProcessCheckWithDataDependency(
        definition,
        root,
        {
          checkId: "fixture-provider",
          parseData(data: unknown): Readonly<{ readonly version: 1 }> {
            if (typeof data !== "object" || data === null || Reflect.get(data, "version") !== 1) {
              throw new TypeError("invalid fixture provider data");
            }
            return Object.freeze({ version: 1 });
          },
          environment: (data) => {
            if (dependencyEnvironmentValid)
              return { PROJECT_GATE_TYPED_FIXTURE: String(data.version) };
            const malformedEnvironment: Record<string, string> = {};
            Object.defineProperty(malformedEnvironment, "PROJECT_GATE_TYPED_FIXTURE", {
              enumerable: true,
              get() {
                throw new TypeError("fixture environment getter failed");
              }
            });
            return malformedEnvironment;
          }
        },
        {
          runProcess: async (input): Promise<ProcessResult> => {
            starts += 1;
            observedEnvironment = input.env;
            return { signal: null, status: 0, stderr: "", stdout: "" };
          },
          writeTextFile: ({ content, filePath }) => writeFileSync(filePath, content, "utf8")
        }
      );
      const execution = check.execution;
      if (execution === undefined) throw new Error("dependent fixture Check must be executable");
      const invokeDependency = (get: Parameters<typeof execution>[0]["dependencies"]["get"]) =>
        execution({
          dependencies: { get },
          options: check.options ?? {},
          project: { changedFiles: [], flags: [], root: process.cwd() },
          records: { report: () => undefined },
          signal: new AbortController().signal
        });

      assert.deepEqual(
        await invokeDependency((checkId) => ({
          ok: true,
          checkId,
          status: "passed",
          data: { version: 1 }
        })),
        { status: "passed", data: { exitCode: 0 } }
      );
      assert.equal(observedEnvironment?.PROJECT_GATE_TYPED_FIXTURE, "1");
      dependencyEnvironmentValid = false;
      assert.deepEqual(
        await invokeDependency((checkId) => ({
          ok: true,
          checkId,
          status: "passed",
          data: { version: 1 }
        })),
        { status: "unavailable", reason: { code: "dependency-data-invalid" } }
      );
      dependencyEnvironmentValid = true;
      assert.deepEqual(
        await invokeDependency((checkId) => ({
          ok: true,
          checkId,
          status: "passed",
          data: { version: 2 }
        })),
        { status: "unavailable", reason: { code: "dependency-data-invalid" } }
      );
      assert.deepEqual(
        await invokeDependency((checkId) => ({
          ok: true,
          checkId,
          status: "failed",
          data: { version: 1 }
        })),
        { status: "unavailable", reason: { code: "dependency-failed" } }
      );
      assert.deepEqual(
        await invokeDependency((checkId) => ({
          ok: false,
          error: { code: "upstream-data-unavailable", checkId, status: "unavailable" }
        })),
        { status: "unavailable", reason: { code: "dependency-unavailable" } }
      );
      assert.equal(starts, 1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reports a safe failure Record and command-failed message for nonzero exit without copying child output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const check = createProcessCheck(
        {
          ...definition,
          args: [
            "-e",
            "process.stdout.write('secret output https://user:token@example.test');process.stderr.write('secret error digest:deadbeef');process.exit(7)"
          ]
        },
        root
      );
      const records: ReportedRecord[] = [];
      const outcome = await invoke(check, records);

      assert.deepEqual(outcome, {
        status: "failed",
        data: { exitCode: 7 },
        messages: [
          {
            level: "error",
            code: "command-failed",
            message: "Command exited with code 7; signal: none; transcript: fixture-command.log."
          }
        ]
      });
      assert.deepEqual(records, [
        {
          data: {
            command: process.execPath,
            exitCode: 7,
            log: "fixture-command.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);
      assert.match(readFileSync(join(root, "fixture-command.log"), "utf8"), /secret output/);
      const renderedMessage =
        outcome.status === "failed" ? outcome.messages?.[0]?.message : undefined;
      assert.equal(renderedMessage?.includes("secret output"), false);
      assert.equal(renderedMessage?.includes("secret error"), false);
      assert.equal(renderedMessage?.includes("user:token"), false);
      assert.equal(renderedMessage?.includes("digest:deadbeef"), false);
      assert.equal(renderedMessage?.includes(root), false);
      assert.equal(renderedMessage?.includes(process.execPath), false);

      const productCheck = createProcessCheck(definition, root, {
        runProcess: async (): Promise<ProcessResult> => ({
          signal: null,
          status: 7,
          stderr: "secret error digest:deadbeef transcript-only-stderr",
          stdout: "secret output https://user:token@example.test transcript-only-stdout"
        }),
        writeTextFile: ({ content, filePath }) => writeFileSync(filePath, content, "utf8")
      });
      const productRun = await captureNonTTYProgress(() =>
        run(
          defineConfig({
            checks: [productCheck],
            outputs: {
              output: { enabled: false },
              progressRendering: { enabled: true }
            }
          }),
          { flags: ["project-gate:profile=required"] }
        )
      );

      assert.equal(productRun.result.kind, "completed");
      if (productRun.result.kind !== "completed") return;
      assert.deepEqual(productRun.result.checkMessages, [
        {
          checkId: "fixture-command",
          level: "error",
          code: "command-failed",
          message: "Command exited with code 7; signal: none; transcript: fixture-command.log."
        }
      ]);
      assert.match(
        productRun.output,
        /^ {2}\[1\/1] Fixture command \| failed \| \d+(?:\.\d+)?(?:ms|s)\n {4}\[error] Command exited with code 7; signal: none; transcript: fixture-command\.log\.$/m
      );
      const record = productRun.result.snapshot.records[0];
      assert.equal(record?.checkId, "fixture-command");
      assert.equal(record?.id, "command-failure");
      assert.equal(record?.data.command, process.execPath);
      assert.equal(record?.data.exitCode, 7);
      assert.equal(record?.data.log, "fixture-command.log");
      assert.equal(record?.data.signal, "none");
      const presented = `${productRun.output}\n${JSON.stringify(productRun.result.checkMessages)}`;
      for (const secret of [
        "secret output",
        "secret error",
        "user:token",
        "digest:deadbeef",
        "transcript-only-stdout",
        "transcript-only-stderr",
        root,
        process.execPath
      ]) {
        assert.equal(presented.includes(secret), false, `presentation leaks ${secret}`);
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("avoids starting cancelled work and maps process/log boundaries to unavailable", async () => {
    const scenarios: readonly ProcessScenario[] = [
      {
        name: "pre-start cancellation",
        definition,
        flags: ["project-gate:profile=required"],
        aborted: true,
        expected: { status: "unavailable", reason: { code: "execution-cancelled" } },
        runProcess: async (): Promise<ProcessResult> => {
          throw new Error("process must not start");
        }
      },
      {
        name: "spawn failure",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "process-unavailable" } },
        expectsTranscript: true,
        expectedTranscriptError: "spawn failed",
        runProcess: async (): Promise<ProcessResult> => {
          throw new Error("spawn failed");
        }
      },
      {
        name: "process execution spawn failure result",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "process-unavailable" } },
        expectsTranscript: true,
        expectedTranscriptError: "spawn failed",
        runProcess: async (): Promise<ProcessResult> => ({
          error: new Error("spawn failed"),
          signal: null,
          status: null,
          stderr: "",
          stdout: ""
        })
      },
      {
        name: "missing exit fact after a signal",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "exit-unavailable" } },
        runProcess: async (): Promise<ProcessResult> => ({
          signal: "SIGTERM",
          status: null,
          stderr: "",
          stdout: ""
        })
      },
      {
        name: "transcript write failure",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "transcript-unavailable" } },
        runProcess: async (): Promise<ProcessResult> => ({
          signal: null,
          status: 7,
          stderr: "secret error",
          stdout: "secret output"
        }),
        writeFails: true
      }
    ];

    for (const scenario of scenarios) {
      const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
      try {
        let starts = 0;
        const dependencies: ProcessCheckDependencies = {
          runProcess: async (input) => {
            starts += 1;
            return scenario.runProcess(input);
          },
          writeTextFile: ({ content, filePath }) => {
            if (scenario.writeFails) throw new Error("fixture transcript failure");
            writeFileSync(filePath, content, "utf8");
          }
        };
        const controller = new AbortController();
        if (scenario.aborted) controller.abort();
        const records: ReportedRecord[] = [];
        const outcome = await invoke(
          createProcessCheck(scenario.definition, root, dependencies),
          records,
          scenario.flags,
          controller.signal
        );

        assert.deepEqual(outcome, scenario.expected, scenario.name);
        if (scenario.name === "transcript write failure") {
          assert.deepEqual(outcome.messages ?? [], [], scenario.name);
          assert.deepEqual(records, [], scenario.name);
        }
        assert.equal(starts, scenario.aborted ? 0 : 1, scenario.name);
        if (scenario.expectsTranscript) {
          const transcriptPath = join(root, "fixture-command.log");
          assert.equal(existsSync(transcriptPath), true, scenario.name);
          if (scenario.expectedTranscriptError !== undefined) {
            assert.match(
              readFileSync(transcriptPath, "utf8"),
              new RegExp(`error: ${JSON.stringify(scenario.expectedTranscriptError)}`),
              scenario.name
            );
          }
        }
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  it("cancels an already-started process and preserves its transcript", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    const controller = new AbortController();
    let outcomePromise: ReturnType<typeof invoke> | undefined;
    try {
      const startedPath = join(root, "started");
      const check = createProcessCheck(
        {
          ...definition,
          args: [
            "-e",
            `require('node:fs').writeFileSync(${JSON.stringify(startedPath)}, 'started');setTimeout(() => process.exit(0), 5000)`
          ]
        },
        root
      );
      outcomePromise = invoke(check, [], undefined, controller.signal);
      await waitForPath(startedPath, 2_000);
      controller.abort();
      const outcome = await outcomePromise;

      assert.deepEqual(outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(existsSync(startedPath), true);
      const transcript = readFileSync(join(root, "fixture-command.log"), "utf8");
      assert.match(transcript, /check: fixture-command/);
      assert.match(transcript, /signal: SIGTERM/);
      assert.match(transcript, /error: /);
    } finally {
      controller.abort();
      if (outcomePromise !== undefined) await outcomePromise;
      rmSync(root, { force: true, recursive: true });
    }
  });
});

async function waitForPath(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(filePath)) {
    if (Date.now() >= deadline) throw new Error(`child process did not create marker: ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

interface ProcessScenario {
  readonly aborted?: boolean;
  readonly definition: ProcessCheckDescriptor;
  readonly expected: CheckResult;
  readonly expectedTranscriptError?: string;
  readonly expectsTranscript?: boolean;
  readonly flags: readonly string[];
  readonly name: string;
  readonly runProcess: ProcessCheckDependencies["runProcess"];
  readonly writeFails?: boolean;
}

interface ReportedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

async function invoke(
  check: ReturnType<typeof createProcessCheck>,
  records: ReportedRecord[],
  flags: readonly string[] = ["project-gate:profile=required"],
  signal = new AbortController().signal
) {
  if (check.execution === undefined)
    throw new Error("fixture Check must have an execution callback");
  return check.execution({
    dependencies: Object.freeze({
      get: (checkId: string) =>
        Object.freeze({
          ok: false,
          error: Object.freeze({ code: "dependency-not-declared", checkId })
        })
    }),
    options: check.options ?? {},
    project: {
      root: process.cwd(),
      changedFiles: [],
      flags
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  });
}

async function captureNonTTYProgress<T>(
  operation: () => Promise<T>
): Promise<Readonly<{ readonly output: string; readonly result: T }>> {
  // Public Run owns its default writer; replace stdout only for this operation
  // to observe that real boundary, then restore both descriptors exactly.
  const standardOutput = process.stdout;
  const originalIsTTY = Object.getOwnPropertyDescriptor(standardOutput, "isTTY");
  const originalWrite = Object.getOwnPropertyDescriptor(standardOutput, "write");
  if (originalWrite === undefined)
    throw new Error("process stdout does not expose an own write method");
  const writes: string[] = [];
  Object.defineProperty(standardOutput, "isTTY", {
    configurable: true,
    enumerable: originalIsTTY?.enumerable ?? true,
    value: false,
    writable: true
  });
  Object.defineProperty(standardOutput, "write", {
    ...originalWrite,
    value: (content: string | Uint8Array): boolean => {
      writes.push(typeof content === "string" ? content : new TextDecoder().decode(content));
      return true;
    }
  });
  try {
    const result = await operation();
    return Object.freeze({ output: writes.join(""), result });
  } finally {
    Object.defineProperty(standardOutput, "write", originalWrite);
    if (originalIsTTY === undefined) {
      delete (standardOutput as { isTTY?: boolean }).isTTY;
    } else {
      Object.defineProperty(standardOutput, "isTTY", originalIsTTY);
    }
  }
}
