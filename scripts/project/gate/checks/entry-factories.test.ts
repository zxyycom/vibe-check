import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import type { CheckDependencies } from "@zxyycom/vibe-check";
import { isNonArrayRecord } from "../../../value-guards.ts";

type FixtureHandoffProvider = Readonly<{ readonly checkId: string; readonly handoff: true }>;
type FixtureDependencyReadResult =
  | Readonly<{
      readonly ok: true;
      readonly checkId: string;
      readonly status: "passed" | "failed";
      readonly data: { readonly token: string };
    }>
  | Readonly<{
      readonly ok: false;
      readonly error: Readonly<{
        readonly code: "upstream-data-unavailable";
        readonly checkId: string;
        readonly status: "unavailable";
      }>;
    }>;
type FixtureHandoffReadResult = Readonly<{
  readonly ok: false;
  readonly error: Readonly<{
    readonly code: "upstream-handoff-unavailable";
    readonly checkId: string;
  }>;
}>;

import { invokeCheckWithRecords } from "./check-execution.test-support.ts";
import {
  createProjectGateCommandEntry,
  type GateCommandDataDependency
} from "./entry-factories.ts";

it("wires one plain command through Product execution and Gate failure evidence", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-command-entry-"));
  try {
    const entry = createProjectGateCommandEntry({
      checkId: "fixture-command",
      displayName: "Fixture command",
      invocation: {
        command: process.execPath,
        args: ["--eval", "process.stdout.write('child output'); process.exit(7)"],
        cwd: process.cwd(),
        env: { NO_COLOR: "0" }
      },
      mutex: ["fixture-resource"],
      presets: ["test"],
      required: true
    });
    const execution = await invokeCheckWithRecords(entry.check, undefined, root);
    assert.ok(isNonArrayRecord(entry.check.options));
    assert.ok(isNonArrayRecord(entry.check.options.environment));
    assert.equal(entry.check.options.environment.mode, "inherit");
    assert.ok(isNonArrayRecord(entry.check.options.environment.overrides));
    assert.equal(entry.check.options.environment.overrides.NO_COLOR, "1");
    assert.equal(execution.result.status, "failed");
    if (execution.result.status !== "failed") return;
    assert.equal(
      "data" in execution.result ? Reflect.get(execution.result.data, "exitCode") : undefined,
      7
    );
    assert.equal(execution.result.messages?.[0]?.code, "command-failed");
    assert.deepEqual(execution.records[0], {
      identity: { id: "command-failure" },
      data: {
        command: "bun",
        exitCode: 7,
        log: `checks/${root.split("/").at(-1)}/process.log`,
        signal: "none"
      }
    });
    assert.match(readFileSync(join(root, "process.log"), "utf8"), /status=failed/);
    assert.deepEqual(entry.check.dependsOn ?? [], []);
    assert.deepEqual(entry.mutex, ["fixture-resource"]);
    assert.deepEqual(entry.presets, ["test"]);
    assert.equal(entry.required, true);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

it("resolves a direct dependency environment and rejects unavailable providers before spawn", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-command-dependency-"));
  try {
    const dependency: GateCommandDataDependency<{ readonly token: string }> = {
      checkId: "fixture-provider",
      environment: (data) => ({ FIXTURE_TOKEN: data.token }),
      parseData: (data) => {
        if (!isNonArrayRecord(data) || typeof data.token !== "string") {
          throw new TypeError("fixture provider data is invalid");
        }
        return { token: data.token };
      }
    };
    const entry = createProjectGateCommandEntry({
      checkId: "fixture-dependent-command",
      displayName: "Fixture dependent command",
      invocation: {
        command: process.execPath,
        args: ["--eval", "if (process.env.FIXTURE_TOKEN !== 'fixture-token') process.exit(9)"],
        cwd: process.cwd()
      },
      dataDependency: dependency,
      presets: ["test"],
      required: true
    });
    assert.deepEqual(entry.check.dependsOn, ["fixture-provider"]);

    const passed = await invokeCheckWithRecords(
      entry.check,
      undefined,
      join(root, "passed"),
      dependenciesFor({ token: "fixture-token" })
    );
    assert.deepEqual(passed.result, { status: "passed", data: { exitCode: 0 } });

    const failed = await invokeCheckWithRecords(
      entry.check,
      undefined,
      join(root, "failed"),
      dependenciesFor({ token: "fixture-token" }, "failed")
    );
    assert.deepEqual(failed.result, {
      status: "unavailable",
      reason: { code: "command-environment-resolution-failed" }
    });
    assert.equal(failed.records.length, 0);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

it("projects a complete nonzero command through the Gate-owned failure projector", async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-gate-command-projection-"));
  try {
    const entry = createProjectGateCommandEntry({
      checkId: "fixture-projected-command",
      displayName: "Fixture projected command",
      invocation: {
        command: process.execPath,
        args: ["--eval", "process.stdout.write('fixture-output'); process.exit(3)"],
        cwd: process.cwd()
      },
      failureProjection: {
        recordsFromStdout: (stdout) => [
          { id: "fixture-output", data: { outputLength: stdout.length } }
        ]
      },
      presets: [],
      required: true
    });
    const execution = await invokeCheckWithRecords(entry.check, undefined, root);
    assert.equal(execution.result.status, "failed");
    assert.deepEqual(execution.records, [
      { identity: { id: "fixture-output" }, data: { outputLength: 14 } }
    ]);
    const fallbackEntry = createProjectGateCommandEntry({
      checkId: "fixture-projected-fallback",
      displayName: "Fixture projected fallback",
      invocation: {
        command: process.execPath,
        args: ["--eval", "process.stdout.write('fixture-output'); process.exit(3)"],
        cwd: process.cwd()
      },
      failureProjection: {
        recordsFromStdout: () => [
          { id: "duplicate", data: { outputLength: 14 } },
          { id: "duplicate", data: { outputLength: 14 } }
        ]
      },
      presets: [],
      required: true
    });
    const fallback = await invokeCheckWithRecords(
      fallbackEntry.check,
      undefined,
      join(root, "fallback")
    );
    assert.deepEqual(fallback.records[0]?.identity, { id: "command-failure" });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

it("rejects mixed dependency and failure projection adapters at runtime", () => {
  assert.throws(
    () =>
      // @ts-expect-error Both adapters are intentionally invalid at the authoring boundary.
      createProjectGateCommandEntry({
        checkId: "fixture-mixed-command",
        displayName: "Fixture mixed command",
        invocation: { command: process.execPath, args: [], cwd: process.cwd() },
        dataDependency: {
          checkId: "fixture-provider",
          environment: () => ({ FIXTURE_TOKEN: "fixture-token" }),
          parseData: () => ({ token: "fixture-token" })
        },
        failureProjection: { recordsFromStdout: () => [] },
        presets: [],
        required: false
      }),
    {
      name: "TypeError",
      message: "A Gate command Check cannot combine dependency and structured failure adapters"
    }
  );
});

function dependenciesFor(
  data: { readonly token: string },
  status: "passed" | "failed" = "passed"
): CheckDependencies {
  function getDependency(provider: FixtureHandoffProvider): FixtureHandoffReadResult;
  function getDependency(checkId: string): FixtureDependencyReadResult;
  function getDependency(
    dependency: string | FixtureHandoffProvider
  ): FixtureDependencyReadResult | FixtureHandoffReadResult {
    const checkId = typeof dependency === "string" ? dependency : dependency.checkId;
    if (typeof dependency !== "string") {
      return {
        ok: false,
        error: { code: "upstream-handoff-unavailable", checkId }
      };
    }
    if (status === "failed") {
      return {
        ok: false,
        error: { code: "upstream-data-unavailable", checkId, status: "unavailable" }
      };
    }
    return { ok: true, checkId, status, data };
  }
  return { get: getDependency, list: () => Object.freeze([]) };
}
