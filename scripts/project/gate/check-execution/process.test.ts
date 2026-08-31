import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ProcessResult } from "../../../process-execution/execution.ts";
import { defineConfig, run, type CheckResult } from "@zxyycom/vibe-check";
import {
  createProcessCheck,
  createProcessCheckWithDataDependency,
  createProcessCheckWithDataDependencyAndSuccessData,
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
  it("publishes closed success data only after a settled transcript", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    let stdoutOutput = '{"version":1}';
    let validationShouldThrow = false;
    let validationCalls = 0;
    const events: string[] = [];
    try {
      const check = createProcessCheckWithDataDependencyAndSuccessData(
        definition,
        root,
        {
          checkId: "fixture-provider",
          environment: () => ({}),
          parseData: (data) => {
            if (typeof data !== "object" || data === null || Reflect.get(data, "version") !== 1) {
              throw new TypeError("invalid dependency");
            }
            return Object.freeze({ version: 1 });
          }
        },
        {
          fromStdout: (stdout) => {
            events.push("from-stdout");
            const value: unknown = JSON.parse(stdout);
            return value;
          },
          parseData: (data) => {
            events.push("parse-data");
            if (typeof data !== "object" || data === null || Reflect.get(data, "version") !== 1) {
              throw new TypeError("invalid output");
            }
            return Object.freeze({ version: 1 });
          },
          validateDependencyData: (data, dependency) => {
            events.push("validate-dependency");
            validationCalls += 1;
            if (validationShouldThrow || data.version !== dependency.version) {
              throw new TypeError("output does not match dependency");
            }
            return data;
          }
        },
        {
          runProcess: async (): Promise<ProcessResult> => ({
            signal: null,
            status: 0,
            stderr: "",
            stdout: stdoutOutput
          }),
          writeTextFile: ({ content, filePath }) => {
            events.push(
              content.includes("status: running") ? "startup-transcript" : "settled-transcript"
            );
            writeFileSync(filePath, content, "utf8");
          }
        }
      );
      const execution = check.execution;
      if (execution === undefined) throw new Error("provider fixture must be executable");
      const result = await execution({
        dependencies: {
          get: (checkId) => ({ ok: true, checkId, status: "passed", data: { version: 1 } })
        },
        options: check.options ?? {},
        project: { flags: [], root: process.cwd() },
        records: { report: () => undefined },
        signal: new AbortController().signal
      });
      assert.deepEqual(result, { status: "passed", data: { version: 1 } });
      assert.equal(validationCalls, 1);
      assert.deepEqual(events, [
        "startup-transcript",
        "settled-transcript",
        "from-stdout",
        "parse-data",
        "validate-dependency"
      ]);
      assert.match(readFileSync(join(root, "process", "fixture-command.log"), "utf8"), /status: 0/);
      validationShouldThrow = true;
      events.length = 0;
      assert.deepEqual(
        await execution({
          dependencies: {
            get: (checkId) => ({ ok: true, checkId, status: "passed", data: { version: 1 } })
          },
          options: check.options ?? {},
          project: { flags: [], root: process.cwd() },
          records: { report: () => undefined },
          signal: new AbortController().signal
        }),
        { status: "unavailable", reason: { code: "process-output-invalid" } }
      );
      assert.equal(validationCalls, 2);
      assert.deepEqual(events, [
        "startup-transcript",
        "settled-transcript",
        "from-stdout",
        "parse-data",
        "validate-dependency"
      ]);
      assert.match(
        readFileSync(join(root, "process", "fixture-command.log"), "utf8"),
        /--- stdout ---\n\{"version":1\}/
      );
      validationShouldThrow = false;
      stdoutOutput = "not JSON";
      assert.deepEqual(
        await execution({
          dependencies: {
            get: (checkId) => ({ ok: true, checkId, status: "passed", data: { version: 1 } })
          },
          options: check.options ?? {},
          project: { flags: [], root: process.cwd() },
          records: { report: () => undefined },
          signal: new AbortController().signal
        }),
        { status: "unavailable", reason: { code: "process-output-invalid" } }
      );
      assert.match(
        readFileSync(join(root, "process", "fixture-command.log"), "utf8"),
        /--- stdout ---\nnot JSON/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

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
      const transcript = readFileSync(join(root, "process", "fixture-command.log"), "utf8");
      assert.match(transcript, /--- stdout ---\nout/);
      assert.match(transcript, /--- stderr ---\nerr/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("writes a running transcript before process start and replaces it after settlement", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    const transcriptPath = join(root, "process", "fixture-command.log");
    let startupTranscript = "";
    try {
      const check = createProcessCheck(
        { ...definition, args: ["fixture-argument"], timeoutMs: 30_000 },
        root,
        {
          runProcess: async (): Promise<ProcessResult> => {
            startupTranscript = readFileSync(transcriptPath, "utf8");
            return { signal: null, status: 0, stderr: "settled stderr", stdout: "settled stdout" };
          },
          writeTextFile: ({ content, filePath }) => writeFileSync(filePath, content, "utf8")
        }
      );

      assert.deepEqual(await invoke(check, []), { status: "passed", data: { exitCode: 0 } });
      assert.match(startupTranscript, /step: command/);
      assert.match(startupTranscript, /status: running/);
      assert.match(startupTranscript, /timeout: 30s/);
      assert.match(startupTranscript, /fixture-argument/);

      const settledTranscript = readFileSync(transcriptPath, "utf8");
      assert.equal(settledTranscript.includes("status: running"), false);
      assert.match(settledTranscript, /status: 0/);
      assert.match(settledTranscript, /--- stdout ---\nsettled stdout/);
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
          project: { flags: [], root: process.cwd() },
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
            message:
              "Command exited with code 7; signal: none; transcript: process/fixture-command.log."
          }
        ]
      });
      assert.deepEqual(records, [
        {
          data: {
            command: process.execPath,
            exitCode: 7,
            log: "process/fixture-command.log",
            signal: "none"
          },
          identity: { id: "command-failure" }
        }
      ]);
      assert.match(
        readFileSync(join(root, "process", "fixture-command.log"), "utf8"),
        /secret output/
      );
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
          message:
            "Command exited with code 7; signal: none; transcript: process/fixture-command.log."
        }
      ]);
      assert.match(
        productRun.output,
        /^ {2}\[1\/1] Fixture command \| failed \| \d+(?:\.\d+)?(?:ms|s)\n {4}\[error] Command exited with code 7; signal: none; transcript: process\/fixture-command\.log\.$/m
      );
      const record = productRun.result.snapshot.records[0];
      assert.equal(record?.checkId, "fixture-command");
      assert.equal(record?.id, "command-failure");
      assert.equal(record?.data.command, process.execPath);
      assert.equal(record?.data.exitCode, 7);
      assert.equal(record?.data.log, "process/fixture-command.log");
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

  it("requires an explicit timeout before reporting safe timeout evidence", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    let observedTimeoutMs: number | undefined;
    const dependencies: ProcessCheckDependencies = {
      runProcess: async (input): Promise<ProcessResult> => {
        observedTimeoutMs = input.timeout;
        return {
          error: new Error("fixture command timed out"),
          signal: "SIGTERM",
          status: null,
          stderr: "",
          stdout: "",
          timedOut: true
        };
      },
      writeTextFile: ({ content, filePath }) => writeFileSync(filePath, content, "utf8")
    };
    try {
      const configured = await invoke(
        createProcessCheck({ ...definition, timeoutMs: 30_000 }, root, dependencies),
        []
      );

      assert.equal(observedTimeoutMs, 30_000);
      assert.deepEqual(configured, {
        status: "unavailable",
        reason: { code: "process-timeout" },
        messages: [
          {
            level: "error",
            code: "command-timeout",
            message: "Command exceeded its 30s timeout; transcript: process/fixture-command.log."
          }
        ]
      });
      assert.match(
        readFileSync(join(root, "process", "fixture-command.log"), "utf8"),
        /timed-out: yes/
      );

      const unconfigured = await invoke(createProcessCheck(definition, root, dependencies), []);
      assert.equal(observedTimeoutMs, undefined);
      assert.deepEqual(unconfigured, {
        status: "unavailable",
        reason: { code: "process-unavailable" }
      });
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
        name: "startup transcript write failure",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "transcript-unavailable" } },
        expectedStarts: 0,
        runProcess: async (): Promise<ProcessResult> => ({
          signal: null,
          status: 7,
          stderr: "secret error",
          stdout: "secret output"
        }),
        writeFailsAt: 1
      },
      {
        name: "settled transcript write failure",
        definition,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "transcript-unavailable" } },
        expectsTranscript: true,
        expectedTranscriptRunning: true,
        runProcess: async (): Promise<ProcessResult> => ({
          signal: null,
          status: 7,
          stderr: "secret error",
          stdout: "secret output"
        }),
        writeFailsAt: 2
      }
    ];

    for (const scenario of scenarios) {
      const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
      try {
        let starts = 0;
        let transcriptWrites = 0;
        const dependencies: ProcessCheckDependencies = {
          runProcess: async (input) => {
            starts += 1;
            assert.equal(input.timeout, undefined, scenario.name);
            return scenario.runProcess(input);
          },
          writeTextFile: ({ content, filePath }) => {
            transcriptWrites += 1;
            if (scenario.writeFailsAt === transcriptWrites) {
              throw new Error("fixture transcript failure");
            }
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
        if (scenario.writeFailsAt !== undefined) {
          assert.deepEqual(outcome.messages ?? [], [], scenario.name);
          assert.deepEqual(records, [], scenario.name);
        }
        assert.equal(starts, scenario.expectedStarts ?? (scenario.aborted ? 0 : 1), scenario.name);
        if (scenario.expectsTranscript) {
          const transcriptPath = join(root, "process", "fixture-command.log");
          assert.equal(existsSync(transcriptPath), true, scenario.name);
          if (scenario.expectedTranscriptError !== undefined) {
            assert.match(
              readFileSync(transcriptPath, "utf8"),
              new RegExp(`error: ${JSON.stringify(scenario.expectedTranscriptError)}`),
              scenario.name
            );
          }
          if (scenario.expectedTranscriptRunning === true) {
            assert.match(readFileSync(transcriptPath, "utf8"), /status: running/, scenario.name);
          }
        }
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  it("maps a settled cancellation fact to transcript evidence and unavailable", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    const controller = new AbortController();
    try {
      const transcriptWrites: string[] = [];
      let starts = 0;
      const check = createProcessCheck(definition, root, {
        runProcess: async ({ cancelSignal }): Promise<ProcessResult> => {
          starts += 1;
          assert.equal(cancelSignal, controller.signal);
          assert.equal(cancelSignal?.aborted, false);
          controller.abort();
          return {
            error: new Error("fixture cancellation"),
            signal: "SIGTERM",
            status: null,
            stderr: "",
            stdout: ""
          };
        },
        writeTextFile: ({ content, filePath }) => {
          transcriptWrites.push(content);
          writeFileSync(filePath, content, "utf8");
        }
      });
      const outcome = await invoke(check, [], undefined, controller.signal);

      assert.deepEqual(outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(starts, 1);
      assert.match(transcriptWrites[0] ?? "", /status: running/);
      assert.match(transcriptWrites[1] ?? "", /check: fixture-command/);
      assert.match(transcriptWrites[1] ?? "", /signal: SIGTERM/);
      assert.match(transcriptWrites[1] ?? "", /error: "fixture cancellation"/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

interface ProcessScenario {
  readonly aborted?: boolean;
  readonly definition: ProcessCheckDescriptor;
  readonly expected: CheckResult;
  readonly expectedStarts?: number;
  readonly expectedTranscriptError?: string;
  readonly expectedTranscriptRunning?: boolean;
  readonly expectsTranscript?: boolean;
  readonly flags: readonly string[];
  readonly name: string;
  readonly runProcess: ProcessCheckDependencies["runProcess"];
  readonly writeFailsAt?: number;
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
