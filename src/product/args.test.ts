import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseArgs } from "./args.ts";
import {
  GATE_POLICY_HELP,
  GATE_POLICY_VALUES
} from "./quality-core/src/model/gate-policy.ts";

function assertActionableGateValueError(
  argv: readonly string[],
  expectedReason: RegExp
): void {
  assert.throws(
    () => parseArgs(argv),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /--gate/);
      assert.match(error.message, expectedReason);
      for (const value of GATE_POLICY_VALUES) {
        assert.ok(error.message.includes(value), `missing legal gate value ${value}`);
      }
      assert.match(error.message, /use --gate|choose/i);
      return true;
    }
  );
}

function captureScanHelp(): string {
  const exitSignal = Symbol("expected help exit");
  const output: string[] = [];
  const originalExit = process.exit;
  const originalLog = console.log;

  console.log = (...values: unknown[]) => output.push(values.map(String).join(" "));
  process.exit = ((code?: number) => {
    assert.equal(code, 0);
    throw exitSignal;
  }) as typeof process.exit;

  try {
    parseArgs(["--help"]);
    assert.fail("help should exit after printing");
  } catch (error: unknown) {
    assert.equal(error, exitSignal);
  } finally {
    console.log = originalLog;
    process.exit = originalExit;
  }

  return output.join("\n");
}

describe("product config argument parsing", () => {
  it("preserves config path forms and explicit option presence", () => {
    const cases = [
      "vibe-check.config.json",
      "../shared/vibe-check.config.json",
      "/tmp/vibe-check.config.json"
    ];

    for (const configFile of cases) {
      const parsed = parseArgs([
        "--config",
        configFile,
        "--top-n",
        "3",
        "--artifact-dir",
        "artifacts/custom"
      ]);

      assert.equal(parsed.configFile, configFile);
      assert.equal(parsed.topN, 3);
      assert.equal(parsed.artifactDir, "artifacts/custom");
    }
  });

  it("keeps config-dependent options absent when callers omit them", () => {
    const parsed = parseArgs([]);

    assert.equal(parsed.configFile, null);
    assert.equal(parsed.topN, null);
    assert.equal(parsed.artifactDir, null);
  });

  it("rejects duplicate config flags and a missing config value", () => {
    assert.throws(
      () => parseArgs(["--config", "first.json", "--config", "second.json"]),
      /--config may only be provided once/
    );
    assert.throws(() => parseArgs(["--config"]), /config/i);
  });
});

describe("quality gate argument parsing and scan planning", () => {
  it("keeps gate enforcement disabled when callers omit --gate", () => {
    const parsed = parseArgs([]);

    assert.equal(parsed.gatePolicy, null);
    assert.equal(parsed.scanProfile, "full");
    assert.equal(parsed.baselineRevision, null);
  });

  it("accepts every descriptor-derived gate policy value", () => {
    for (const gatePolicy of GATE_POLICY_VALUES) {
      const parsed = parseArgs([
        "--gate",
        gatePolicy,
        "--baseline",
        "base-revision"
      ]);

      assert.equal(parsed.gatePolicy, gatePolicy);
    }
  });

  it("rejects missing, duplicate, and unknown gate values with actionable usage errors", () => {
    assertActionableGateValueError(["--gate"], /requires a value|argument missing/i);
    assertActionableGateValueError(
      ["--gate", "all", "--gate", "changed"],
      /only be provided once/i
    );
    assertActionableGateValueError(["--gate", "everything"], /unknown/i);
  });

  it("keeps the selected profile and baseline plan for the all policy", () => {
    const cases: ReadonlyArray<{
      argv: readonly string[];
      expectedBaselineRevision: string | null;
      expectedProfile: "full" | "quick";
    }> = [
      {
        argv: ["--profile", "quick", "--gate", "all"],
        expectedBaselineRevision: null,
        expectedProfile: "quick"
      },
      {
        argv: ["--profile", "full", "--gate", "all"],
        expectedBaselineRevision: null,
        expectedProfile: "full"
      },
      {
        argv: [
          "--profile",
          "full",
          "--gate",
          "all",
          "--baseline",
          "base-revision"
        ],
        expectedBaselineRevision: "base-revision",
        expectedProfile: "full"
      }
    ];

    for (const testCase of cases) {
      const parsed = parseArgs(testCase.argv);

      assert.equal(parsed.gatePolicy, "all");
      assert.equal(parsed.baselineRevision, testCase.expectedBaselineRevision);
      assert.equal(parsed.scanProfile, testCase.expectedProfile);
    }
  });

  it("requires an explicit baseline for comparison policies", () => {
    for (const gatePolicy of ["changed", "regressions"] as const) {
      assert.throws(
        () => parseArgs(["--gate", gatePolicy]),
        new RegExp(`--gate ${gatePolicy}.*--baseline <revision>`, "i")
      );
    }
  });

  it("retains an explicit baseline revision for comparison policies", () => {
    for (const gatePolicy of ["changed", "regressions"] as const) {
      const parsed = parseArgs([
        "--profile",
        "full",
        "--gate",
        gatePolicy,
        "--baseline",
        "base-sha"
      ]);

      assert.equal(parsed.gatePolicy, gatePolicy);
      assert.equal(parsed.baselineRevision, "base-sha");
    }
  });

  it("rejects comparison policies with quick profile or explicit baseline skipping", () => {
    for (const gatePolicy of ["changed", "regressions"] as const) {
      assert.throws(
        () => parseArgs(["--profile", "quick", "--gate", gatePolicy]),
        new RegExp(`--gate ${gatePolicy} requires --profile full.*use --profile full`, "i")
      );
      assert.throws(
        () => parseArgs(["--gate", gatePolicy, "--skip-baseline"]),
        new RegExp(`--gate ${gatePolicy}.*--skip-baseline.*remove --skip-baseline`, "i")
      );
    }
  });

  it("rejects retired and contradictory baseline options", () => {
    assert.throws(
      () => parseArgs(["--with-baseline"]),
      /--with-baseline.*removed.*--baseline <revision>/i
    );
    assert.throws(
      () => parseArgs(["--baseline", "HEAD", "--skip-baseline"]),
      /--baseline.*--skip-baseline.*cannot be combined/i
    );
    assert.throws(
      () => parseArgs(["--baseline", "HEAD", "--baseline", "HEAD~1"]),
      /--baseline may only be provided once/i
    );
    assert.throws(
      () => parseArgs(["--baseline="]),
      /--baseline.*non-empty revision/i
    );
  });

  it("keeps --skip-baseline as a CLI-only current-snapshot compatibility flag", () => {
    const omitted = parseArgs([]);
    const skipped = parseArgs(["--skip-baseline"]);

    assert.deepEqual(skipped, omitted);
    assert.equal(Object.hasOwn(skipped, "skipBaseline"), false);
  });

  it("keeps verification output orthogonal to gate policy and scan planning", () => {
    for (const gatePolicy of GATE_POLICY_VALUES) {
      const baselineArgs = gatePolicy === "all"
        ? []
        : ["--baseline", "base-revision"];
      const withoutVerification = parseArgs([
        "--gate",
        gatePolicy,
        ...baselineArgs
      ]);
      const withVerification = parseArgs([
        "--gate",
        gatePolicy,
        ...baselineArgs,
        "--verification-output"
      ]);

      assert.deepEqual(
        { ...withVerification, verificationOutput: false },
        withoutVerification
      );
      assert.equal(withVerification.verificationOutput, true);
    }
  });

  it("derives gate values and policy descriptions in scan help from the descriptor", () => {
    const help = captureScanHelp();

    assert.match(help, /explicit --config.*highest precedence/i);
    assert.match(help, /\.vibe-check\/config\.json.*discover/i);
    assert.match(help, /neutral default.*not persisted/i);
    assert.match(help, /every gate.*file-backed/i);
    assert.doesNotMatch(help, /no discovery/);
    assert.ok(help.includes(`--gate <${GATE_POLICY_VALUES.join("|")}>`));
    for (const policyHelp of GATE_POLICY_HELP) {
      assert.ok(help.includes(policyHelp), `missing descriptor help: ${policyHelp}`);
    }
    assert.match(help, /accepted records.*do not block/i);
    assert.match(help, /exit 1.*gate.*failed/i);
    assert.match(help, /exit 2.*could not be evaluated/i);
    assert.match(help, /--baseline <revision>.*explicit/i);
    assert.doesNotMatch(help, /--with-baseline/);
  });
});
