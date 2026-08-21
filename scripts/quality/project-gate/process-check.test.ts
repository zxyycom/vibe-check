import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ProcessResult } from "../../tools/foundation/src/index.ts";
import type { CheckResult } from "vibe-check";
import type { ProjectGateCheckDescriptor } from "../../project-gate/catalog.ts";
import { createProcessCheck, type ProcessCheckDependencies } from "./process-check.ts";

const descriptor: ProjectGateCheckDescriptor = Object.freeze({
  checkId: "fixture-command",
  command: process.execPath,
  args: [],
  dependencies: [],
  displayName: "Fixture command",
  environment: {},
  profiles: ["required", "full"],
  tags: ["tests"]
} as const satisfies ProjectGateCheckDescriptor);

describe("Project Gate process Check", () => {
  it("writes one complete transcript and passes only a zero command exit", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const check = createProcessCheck(
        {
          ...descriptor,
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

  it("reports a safe failure Record for nonzero exit without copying child output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-project-gate-"));
    try {
      const check = createProcessCheck(
        { ...descriptor, args: ["-e", "process.stdout.write('secret output');process.exit(7)"] },
        root
      );
      const records: ReportedRecord[] = [];
      const outcome = await invoke(check, records);

      assert.deepEqual(outcome, { status: "failed", data: { exitCode: 7 } });
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
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("avoids starting N/A or cancelled work and maps process/log boundaries to unavailable", async () => {
    const scenarios: readonly ProcessScenario[] = [
      {
        name: "profile exclusion",
        descriptor: { ...descriptor, profiles: ["full"] },
        flags: ["project-gate:profile=required"],
        expected: { status: "not-applicable", reason: { code: "profile-excluded" } },
        runProcess: unexpectedProcessStart
      },
      {
        name: "tag exclusion",
        descriptor,
        flags: ["project-gate:profile=required", "project-gate:disable-tag=tests"],
        expected: { status: "not-applicable", reason: { code: "tag-disabled" } },
        runProcess: unexpectedProcessStart
      },
      {
        name: "pre-start cancellation",
        descriptor,
        flags: ["project-gate:profile=required"],
        aborted: true,
        expected: { status: "unavailable", reason: { code: "execution-cancelled" } },
        runProcess: unexpectedProcessStart
      },
      {
        name: "spawn failure",
        descriptor,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "process-unavailable" } },
        expectsTranscript: true,
        expectedTranscriptError: "spawn failed",
        runProcess: async (): Promise<ProcessResult> => {
          throw new Error("spawn failed");
        }
      },
      {
        name: "foundation spawn failure result",
        descriptor,
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
        descriptor,
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
        descriptor,
        flags: ["project-gate:profile=required"],
        expected: { status: "unavailable", reason: { code: "transcript-unavailable" } },
        runProcess: async (): Promise<ProcessResult> => ({
          signal: null,
          status: 0,
          stderr: "",
          stdout: ""
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
        const outcome = await invoke(
          createProcessCheck(scenario.descriptor, root, dependencies),
          [],
          scenario.flags,
          controller.signal
        );

        assert.deepEqual(outcome, scenario.expected, scenario.name);
        assert.equal(starts, scenario.runProcess === unexpectedProcessStart ? 0 : 1, scenario.name);
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
          ...descriptor,
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
  readonly descriptor: ProjectGateCheckDescriptor;
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

async function unexpectedProcessStart(): Promise<ProcessResult> {
  throw new Error("process must not start");
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
    options: check.options ?? {},
    project: {
      root: process.cwd(),
      changedFiles: [],
      flags,
      files: { codeAreas: {}, excludeDirs: [], generatedFiles: [], include: [] },
      cache: { directory: "/tmp/cache", enabled: false, reportActivity: () => undefined }
    },
    records: {
      report: (identity, data) => records.push(Object.freeze({ data, identity }))
    },
    signal
  });
}
