import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../tools/foundation/src/index.ts";

import { defineProjectGateCatalog, PROJECT_GATE_CATALOG } from "./catalog.ts";
import { parseProjectGateArguments, selectionFlags } from "./controls.ts";
import { projectGateEligibility } from "./eligibility.ts";
import {
  createInvocationLogDirectory,
  PROJECT_GATE_EXIT_STATUS,
  projectGateExitStatus,
  runProjectGate,
  type ProjectGateExitStatus
} from "./index.ts";

const prepared = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: [],
  inputFingerprint: "fixture",
  installedPackageDirectory: "/tmp/consumer/node_modules/vibe-check",
  resolvedEntryPath: "/tmp/consumer/node_modules/vibe-check/index.mjs",
  reused: true,
  sha256: "fixture",
  stagingDirectory: "/tmp/staging"
});

const rootPackageManifestSource = readFileSync(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
  "utf8"
);

describe("Project Gate catalog, root binding, and controls", () => {
  it("binds retained workspace verification names directly to the Gate profiles without disabled tags", () => {
    const manifest: unknown = JSON.parse(rootPackageManifestSource);
    assert.ok(isNonArrayRecord(manifest), "root package manifest must be an object");
    const rootScripts = manifest.scripts;
    assert.ok(isNonArrayRecord(rootScripts), "root package manifest must declare a scripts object");

    assert.deepEqual(
      {
        base: rootScripts["verify:vibe-check-workspace"],
        full: rootScripts["verify:vibe-check-workspace:full"],
        required: rootScripts["verify:vibe-check-workspace:required"]
      },
      {
        base: "bun scripts/project-gate/index.ts",
        full: "bun scripts/project-gate/index.ts --profile full",
        required: "bun scripts/project-gate/index.ts --profile required"
      }
    );
  });

  it("keeps the independent 20-Check required/full profile contract closed", () => {
    assert.equal(PROJECT_GATE_CATALOG.length, 20);
    assert.equal(
      PROJECT_GATE_CATALOG.filter((descriptor) => descriptor.profiles.includes("required")).length,
      14
    );
    assert.equal(
      PROJECT_GATE_CATALOG.filter((descriptor) => descriptor.profiles.includes("full")).length,
      19
    );
    assert.equal(new Set(PROJECT_GATE_CATALOG.map(({ checkId }) => checkId)).size, 20);
    assert.throws(
      () =>
        defineProjectGateCatalog(
          PROJECT_GATE_CATALOG.map((descriptor) => {
            if (descriptor.checkId === "typecheck-product") {
              return { ...descriptor, dependencies: ["lint-product"] };
            }
            if (descriptor.checkId === "lint-product") {
              return { ...descriptor, dependencies: ["typecheck-product"] };
            }
            return descriptor;
          })
        ),
      /dependency cycle/
    );
    assert.throws(
      () =>
        defineProjectGateCatalog(
          PROJECT_GATE_CATALOG.map((descriptor) =>
            descriptor.checkId === "product-tests"
              ? { ...descriptor, dependencies: ["quality-quick-check"] }
              : descriptor
          )
        ),
      /dependency is excluded from profile full/
    );
  });

  it("normalizes a profile plus repeatable disabled tags into opaque flags", () => {
    const parsed = parseProjectGateArguments([
      "--profile",
      "required",
      "--disable-tag",
      "quality",
      "--disable-tag",
      "docs",
      "--disable-tag",
      "quality"
    ]);

    assert.deepEqual(parsed, {
      ok: true,
      value: { profile: "required", disabledTags: ["docs", "quality"] }
    });
    if (!parsed.ok) return;
    assert.deepEqual(selectionFlags(parsed.value), [
      "project-gate:profile=required",
      "project-gate:disable-tag=docs",
      "project-gate:disable-tag=quality"
    ]);
    assert.equal(parseProjectGateArguments(["unexpected"]).ok, false);
    assert.equal(parseProjectGateArguments(["--disable-tag", ""]).ok, false);
  });
});

describe("Project Gate adapter closure", () => {
  it("does not load or run a candidate consumer after preparation failure", async () => {
    let loaded = false;
    const status = await runProjectGate([], {
      createInvocationLogDirectory: (): string => {
        throw new Error("logs must not be created");
      },
      loadRunModule: async () => {
        loaded = true;
        throw new Error("must not load");
      },
      prepareCandidate: async () => {
        throw new Error("fixture preparation failure");
      }
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(loaded, false);
  });

  it("rejects an imported entry that differs from the prepared candidate before log/run", async () => {
    let createdLogs = false;
    let ran = false;
    const status = await runProjectGate([], {
      createInvocationLogDirectory: (): string => {
        createdLogs = true;
        return "/tmp/logs";
      },
      loadRunModule: async () => ({
        resolvedEntryPath: "/tmp/other/index.mjs",
        runProjectGate: async () => {
          ran = true;
          return completedResult({ profile: "full", disabledTags: [] });
        }
      }),
      prepareCandidate: async () => prepared
    });

    assert.equal(status, PROJECT_GATE_EXIT_STATUS.unavailable);
    assert.equal(createdLogs, false);
    assert.equal(ran, false);
  });

  it("requires every expected eligible and N/A final Check outcome", () => {
    const selection = { profile: "required" as const, disabledTags: ["quality"] as const };
    assert.equal(
      projectGateExitStatus(completedResult(selection), selection),
      PROJECT_GATE_EXIT_STATUS.passed
    );

    const logDirectory = createInvocationLogDirectory();
    try {
      assert.equal(existsSync(logDirectory), true);
      assert.match(
        relative(resolve(dirname(fileURLToPath(import.meta.url)), "../.."), logDirectory),
        /^\.log\/project-gate\//
      );
    } finally {
      rmSync(logDirectory, { force: true, recursive: true });
    }

    const incomplete = completedResult(selection, "typecheck-product", {
      status: "not-applicable",
      reason: { code: "tag-disabled" }
    });
    assert.equal(projectGateExitStatus(incomplete, selection), PROJECT_GATE_EXIT_STATUS.failed);
  });

  it("maps completed closure failures to 1 and non-completed or malformed results to 2", () => {
    const selection = { profile: "full" as const, disabledTags: [] as const };
    const complete = completedResult(selection);
    const cases: readonly [string, unknown, ProjectGateExitStatus][] = [
      [
        "definition warning",
        { ...complete, definitionWarnings: [{}] },
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      [
        "progress failure",
        { ...complete, effects: { progress: { status: "failed" } } },
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      [
        "failed gate",
        { ...complete, decision: { gate: { status: "failed" } } },
        PROJECT_GATE_EXIT_STATUS.failed
      ],
      ["configuration", { kind: "configuration" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["planning", { kind: "planning" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["execution", { kind: "execution" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["effect", { kind: "effect" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["cancelled", { kind: "cancelled" }, PROJECT_GATE_EXIT_STATUS.unavailable],
      ["malformed completed", { kind: "completed" }, PROJECT_GATE_EXIT_STATUS.unavailable]
    ];

    for (const [name, result, expectedStatus] of cases) {
      assert.equal(projectGateExitStatus(result, selection), expectedStatus, name);
    }
  });
});

function completedResult(
  selection: {
    readonly profile: "required" | "full";
    readonly disabledTags: readonly never[] | readonly ["quality"];
  },
  changedCheckId?: string,
  changedOutcome?: unknown
) {
  return {
    kind: "completed",
    definitionWarnings: [],
    effects: { progress: { status: "succeeded" } },
    decision: { gate: { status: "passed" } },
    snapshot: {
      checks: PROJECT_GATE_CATALOG.map((descriptor) => {
        const eligibility = projectGateEligibility(descriptor, selection);
        const outcome = eligibility.eligible
          ? { status: "completed", verdict: "passed" }
          : { status: "not-applicable", reason: { code: eligibility.reasonCode } };
        return {
          checkId: descriptor.checkId,
          outcome: descriptor.checkId === changedCheckId ? changedOutcome : outcome
        };
      })
    }
  };
}
