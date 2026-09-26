import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateContext } from "./result-contributor.ts";
import { createProjectGateResult } from "./result.ts";
import {
  loadLocalPerformanceBaselines,
  LOCAL_PERFORMANCE_BASELINE_PATH,
  type ProjectGatePerformanceBaseline
} from "./performance-baseline.ts";
import { evaluateProjectGatePerformance } from "./performance-observation.ts";

const runtime = Object.freeze({ architecture: "x64", bunVersion: "1.3.14", platform: "linux" });
const baseline = Object.freeze({
  declarativeFingerprint: "a".repeat(64),
  maxElapsedMs: 135,
  maxMeanCheckMs: 2000,
  maxP95CheckMs: 5000,
  profile: "required" as const,
  runtime
} satisfies ProjectGatePerformanceBaseline);

describe("Project Gate performance budgets", () => {
  it("warns on exceeded budgets but blocks missing policy or invalid measurements", () => {
    const initialResult = createProjectGateResult("passed", [
      { code: "existing", level: "info", message: "kept" }
    ]);
    const within = evaluateProjectGatePerformance(
      Object.freeze({ ...context(135), initialResult }),
      runtime
    );
    assert.equal(within.blocks, false);
    assert.match(within.messages[0]?.message ?? "", /within warning budget 135\.0ms/);
    assert.equal(initialResult.status, "passed");
    assert.equal(initialResult.messages.length, 1);

    const exceeded = evaluateProjectGatePerformance(
      Object.freeze({ ...context(136), initialResult }),
      runtime
    );
    assert.equal(exceeded.blocks, false);
    assert.equal(exceeded.messages[0]?.code, "project-gate-performance-limit-exceeded");
    assert.equal(exceeded.messages[0]?.level, "warning");
    assert.deepEqual(initialResult, {
      status: "passed",
      messages: [{ code: "existing", level: "info", message: "kept" }]
    });

    for (const performanceBaselines of [
      [],
      [{ ...baseline, profile: "all" as const }],
      [{ ...baseline, runtime: { ...runtime, architecture: "arm64" } }],
      [{ ...baseline, runtime: { ...runtime, bunVersion: "other" } }],
      [{ ...baseline, runtime: { ...runtime, platform: "darwin" } }]
    ]) {
      const missing = evaluateProjectGatePerformance(
        Object.freeze({ ...context(120), initialResult, performanceBaselines }),
        runtime
      );
      assert.equal(missing.blocks, true);
      assert.equal(missing.messages[0]?.code, "project-gate-performance-baseline-missing");
      assert.match(missing.messages[0]?.message ?? "", /elapsed-to-initial-result 120\.0ms/);
    }

    const invalid = evaluateProjectGatePerformance(
      Object.freeze({
        ...context(Number.NaN),
        initialResult
      }),
      runtime
    );
    assert.equal(invalid.blocks, true);
    assert.equal(invalid.messages[0]?.code, "project-gate-performance-invalid-timing");
    assert.doesNotMatch(invalid.messages[0]?.message ?? "", /candidate preparation/);

    const invalidFacts = evaluateProjectGatePerformance(
      Object.freeze({ ...context(120), initialResult, runResult: { kind: "completed" } }),
      runtime
    );
    assert.equal(invalidFacts.blocks, true);
    assert.equal(invalidFacts.messages[0]?.code, "project-gate-performance-invalid-run-facts");

    const alreadyFailed = evaluateProjectGatePerformance(
      Object.freeze({
        ...context(136),
        initialResult: createProjectGateResult("failed")
      }),
      runtime
    );
    assert.equal(alreadyFailed.blocks, false);
  });

  it("enforces profile and runtime budgets independently of fingerprint metadata without rewriting them", () => {
    const fingerprint = "b".repeat(64);
    for (const profile of ["required", "all"] as const) {
      for (const [elapsedMs, productMs, exceeded] of [
        [120, 70, false],
        [135, 85, false],
        [136, 86, true]
      ] as const) {
        for (const metadata of [{ declarativeFingerprint: baseline.declarativeFingerprint }, {}]) {
          const initial = context(elapsedMs);
          const configured = {
            ...metadata,
            maxElapsedMs: 135,
            maxMeanCheckMs: 2000,
            maxP95CheckMs: 5000,
            profile,
            runtime
          };
          const baselines = Object.freeze([Object.freeze(configured)]);
          const result = evaluateProjectGatePerformance(
            Object.freeze({
              ...initial,
              initialResult: createProjectGateResult("passed"),
              performanceBaselines: baselines,
              runResult: Object.freeze({
                checkDurations: [],
                declarativeFingerprint: fingerprint,
                kind: "completed"
              }),
              selection: Object.freeze({ kind: profile })
            }),
            runtime
          );
          assert.equal(result.blocks, false);
          assert.equal(result.messages.length, 2);
          assert.equal(
            result.messages[0]?.code,
            exceeded
              ? "project-gate-performance-limit-exceeded"
              : "project-gate-performance-within-limit"
          );
          assert.equal(result.messages[0]?.level, exceeded ? "warning" : "info");
          const message = result.messages[0]?.message ?? "";
          for (const detail of [
            `elapsed-to-initial-result ${elapsedMs}.0ms`,
            "candidate preparation 20.0ms",
            "adapter/setup 30.0ms",
            `Product Run ${productMs}.0ms`,
            "warning budget 135.0ms"
          ]) {
            assert.ok(message.includes(detail), detail);
          }
          assert.doesNotMatch(message, /no matching|manually update|fingerprint/);
          assert.deepEqual(baselines, [configured]);
        }
      }
    }
  });

  it("summarizes current Check costs and evaluates mean and nearest-rank p95 independently", () => {
    const boundary = [...Array<number>(19).fill(100), 8100];
    const scenarios = [
      { durations: [], count: 0, total: 0, mean: null, p95: null, exceeded: [] },
      { durations: [null, null], count: 0, total: 0, mean: null, p95: null, exceeded: [] },
      {
        durations: [0, null],
        count: 1,
        total: 0,
        mean: 0,
        p95: 0,
        exceeded: [],
        slowest: "check-00=0.0ms"
      },
      {
        durations: [null, ...boundary],
        count: 20,
        total: 10000,
        mean: 500,
        p95: 100,
        exceeded: [],
        slowest: "check-20=8100.0ms, check-01=100.0ms, check-02=100.0ms"
      },
      {
        durations: [...Array<number>(19).fill(100), 8120],
        count: 20,
        total: 10020,
        mean: 501,
        p95: 100,
        exceeded: ["mean"],
        slowest: "check-19=8120.0ms, check-00=100.0ms, check-01=100.0ms"
      },
      { durations: [101, null], count: 1, total: 101, mean: 101, p95: 101, exceeded: ["p95"] },
      { durations: [501], count: 1, total: 501, mean: 501, p95: 501, exceeded: ["mean", "p95"] },
      {
        durations: [...Array<number>(18).fill(100), 8100],
        count: 19,
        total: 9900,
        mean: 9900 / 19,
        p95: 8100,
        exceeded: ["mean", "p95"]
      },
      {
        durations: [...Array<number>(33).fill(100), 8100],
        count: 34,
        total: 11400,
        mean: 11400 / 34,
        p95: 100,
        exceeded: []
      },
      {
        durations: [...Array<number>(32).fill(100), 200, 8100],
        count: 34,
        total: 11500,
        mean: 11500 / 34,
        p95: 200,
        exceeded: ["p95"]
      }
    ];
    for (const scenario of scenarios) {
      const checkDurations = Object.freeze(
        scenario.durations
          .map((durationMs, index) =>
            Object.freeze({
              checkId: `check-${index.toString().padStart(2, "0")}`,
              durationMs
            })
          )
          .reverse()
      );
      const initial = context(120);
      const result = evaluateProjectGatePerformance(
        Object.freeze({
          ...initial,
          initialResult: createProjectGateResult("passed"),
          performanceBaselines: [{ ...baseline, maxMeanCheckMs: 500, maxP95CheckMs: 100 }],
          runResult: Object.freeze({
            kind: "completed",
            declarativeFingerprint: "a".repeat(64),
            checkDurations
          })
        }),
        runtime
      );
      assert.equal(result.blocks, false);
      const message = result.messages[1];
      assert.equal(message?.code, "project-gate-performance-check-durations");
      assert.equal(message?.level, scenario.exceeded.length === 0 ? "info" : "warning");
      const text = message?.message ?? "";
      assert.ok(text.includes(`executed Checks=${scenario.count};`), text);
      assert.ok(
        text.includes(`cumulative execution ${scenario.total.toFixed(1)}ms (not wall time)`),
        text
      );
      if (scenario.mean === null || scenario.p95 === null) {
        assert.match(text, /mean=n\/a; p95=n\/a; Check budgets not evaluated/);
      } else {
        assert.ok(text.includes(`mean ${scenario.mean.toFixed(1)}ms (budget 500.0ms)`), text);
        assert.ok(
          text.includes(`p95 ${scenario.p95.toFixed(1)}ms (nearest-rank; budget 100.0ms)`),
          text
        );
        assert.ok(
          text.includes(
            scenario.exceeded.length === 0
              ? "within Check warning budgets"
              : `exceeded Check warning budgets: ${scenario.exceeded.join(", ")}`
          ),
          text
        );
      }
      if (scenario.slowest !== undefined) {
        assert.ok(text.endsWith(`slowest Checks: ${scenario.slowest}`), text);
      }
    }
  });

  it("rejects malformed, duplicate, or overflowing Check duration facts without emitting statistics", () => {
    for (const checkDurations of [
      [{ checkId: "bad id", durationMs: 10 }],
      [{ checkId: "fixture", durationMs: -1 }],
      [{ checkId: "fixture", durationMs: Number.NaN }],
      [{ checkId: "fixture", durationMs: Number.POSITIVE_INFINITY }],
      [{ checkId: "fixture", durationMs: "10" }],
      [{ checkId: "fixture" }],
      [
        { checkId: "fixture", durationMs: 10 },
        { checkId: "fixture", durationMs: null }
      ],
      [
        { checkId: "first", durationMs: Number.MAX_VALUE },
        { checkId: "second", durationMs: Number.MAX_VALUE }
      ]
    ]) {
      const result = evaluateProjectGatePerformance(
        Object.freeze({
          ...context(120),
          initialResult: createProjectGateResult("passed"),
          runResult: { kind: "completed", declarativeFingerprint: "a".repeat(64), checkDurations }
        }),
        runtime
      );
      assert.equal(result.blocks, true);
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0]?.code, "project-gate-performance-invalid-run-facts");
      assert.doesNotMatch(result.messages[0]?.message ?? "", /mean |p95 |cumulative/);
    }
  });

  it("loads only an explicit regular local JSON file with fixed, unique limits", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-performance-baseline-"));
    const path = join(root, LOCAL_PERFORMANCE_BASELINE_PATH);
    try {
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "missing" });
      mkdirSync(dirname(path), { recursive: true });
      const legacySource = JSON.stringify({ schemaVersion: 1, baselines: [baseline] });
      writeFileSync(path, legacySource);
      assert.deepEqual(loadLocalPerformanceBaselines(root), {
        kind: "loaded",
        baselines: [baseline]
      });
      assert.equal(readFileSync(path, "utf8"), legacySource);
      const withoutFingerprint = { maxElapsedMs: 135, profile: "required", runtime };
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [withoutFingerprint] }));
      assert.deepEqual(loadLocalPerformanceBaselines(root), {
        kind: "loaded",
        baselines: [{ ...withoutFingerprint, maxMeanCheckMs: 2000, maxP95CheckMs: 5000 }]
      });
      for (const overrides of [
        { maxMeanCheckMs: 1500 },
        { maxP95CheckMs: 4000 },
        { maxMeanCheckMs: 1500, maxP95CheckMs: 4000 }
      ]) {
        const source = JSON.stringify({
          schemaVersion: 1,
          baselines: [{ ...withoutFingerprint, ...overrides }]
        });
        writeFileSync(path, source);
        assert.deepEqual(loadLocalPerformanceBaselines(root), {
          kind: "loaded",
          baselines: [
            { ...withoutFingerprint, maxMeanCheckMs: 2000, maxP95CheckMs: 5000, ...overrides }
          ]
        });
        assert.equal(readFileSync(path, "utf8"), source);
      }
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [baseline, baseline] }));
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      for (const duplicate of [
        withoutFingerprint,
        { ...baseline, declarativeFingerprint: "b".repeat(64), maxElapsedMs: 999 }
      ]) {
        writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [baseline, duplicate] }));
        assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      }
      for (const invalid of [
        { ...baseline, declarativeFingerprint: null },
        { ...baseline, declarativeFingerprint: "invalid" },
        { ...withoutFingerprint, unexpected: true }
      ]) {
        writeFileSync(path, JSON.stringify({ schemaVersion: 1, baselines: [invalid] }));
        assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
      }
      for (const field of ["maxElapsedMs", "maxMeanCheckMs", "maxP95CheckMs"]) {
        for (const invalid of [null, 0, -1, 1.5, "2000", Number.MAX_SAFE_INTEGER + 1]) {
          writeFileSync(
            path,
            JSON.stringify({ schemaVersion: 1, baselines: [{ ...baseline, [field]: invalid }] })
          );
          assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
        }
      }
      rmSync(path);
      const target = join(root, "outside.json");
      writeFileSync(target, JSON.stringify({ schemaVersion: 1, baselines: [baseline] }));
      symlinkSync(target, path);
      assert.deepEqual(loadLocalPerformanceBaselines(root), { kind: "invalid" });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

function context(elapsedToInitialResultMs: number): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: "/tmp/project-gate-observation",
    preparedCandidate,
    performanceBaselines: [baseline],
    repositoryRoot: "/workspace/vibe-check",
    runResult: Object.freeze({
      checkDurations: [],
      declarativeFingerprint: "a".repeat(64),
      kind: "completed"
    }),
    selection: Object.freeze({ kind: "required" as const }),
    timing: Object.freeze({
      adapterSetupMs: 30,
      candidatePreparationMs: 20,
      elapsedToInitialResultMs,
      initialResultAtMs: elapsedToInitialResultMs,
      productRunMs: elapsedToInitialResultMs - 50,
      startedAtMs: 0
    })
  });
}

const preparedCandidate = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: ["package/index.mjs"],
  inputFingerprint: "a".repeat(64),
  installedPackageDirectory: "/tmp/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse" as const,
  preparationReason: "installation-current" as const,
  resolvedEntryPath: "/tmp/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  sha256: "b".repeat(64),
  stagingDirectory: "/tmp/staging"
} satisfies PreparedPackageCandidate);
