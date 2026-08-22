import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_JSCPD_COMMAND,
  readJscpdBinTarget,
  resolveJscpdCommand
} from "./scanners/jscpd/default-command.ts";
import { scanWithJscpd } from "./scanners/jscpd/scanner.ts";
import { checkJscpd } from "./scanners/tool-availability/jscpd.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("quality jscpd wrapper failure projection", () => {
  it("does not treat a successful jscpd run without JSON as a successful empty scan", () => {
    const dependency = createFakeJscpdToolConfig({
      stdout: "",
      stderr: "",
      exitCode: 0
    });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        dependency,
        minimumTokens: 75
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-report-failure");
        assert.match(result.error, /jscpd JSON report missing/);
      }
    } finally {
      dependency.cleanup();
    }
  });

  it("classifies empty jscpd JSON reports as report failures", () => {
    const dependency = createFakeJscpdToolConfig({
      stdout: "",
      stderr: "",
      exitCode: 0,
      reportJson: "   \n"
    });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        dependency,
        minimumTokens: 75
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-report-failure");
        assert.match(result.error, /jscpd JSON report is empty/);
      }
    } finally {
      dependency.cleanup();
    }
  });

  it("classifies commands missing after preflight as execution failures", () => {
    const result = scanWithJscpd({
      files: ["scripts/a.ts", "scripts/b.ts"],
      cwd: REPO_ROOT,
      dependency: {
        args: [],
        availabilityArgs: ["--version"],
        executable: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
        maxConcurrency: 1
      },
      minimumTokens: 75
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "jscpd-execution-error");
      assert.match(result.error, /jscpd process error/);
    }
  });

  it("classifies unavailable jscpd dependency binaries in tool availability", async () => {
    const result = await checkJscpd(REPO_ROOT, {
      args: [],
      availabilityArgs: ["--version"],
      executable: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
      maxConcurrency: 1
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.equal(result.source, "repository devDependency");
    assert.match(result.error ?? "", /jscpd dependency binary unavailable/);

    const missingBinTargetPath = join(REPO_ROOT, `docnav-missing-jscpd-bin-${process.pid}.js`);
    const missingBinTarget = await checkJscpd(REPO_ROOT, {
      args: [missingBinTargetPath],
      availabilityArgs: [missingBinTargetPath, "--version"],
      executable: process.execPath,
      maxConcurrency: 1
    });
    assert.equal(missingBinTarget.available, false);
    assert.equal(missingBinTarget.reason, "execution-error");
  });

  it("keeps real duplicate findings non-fatal and normalizes jscpd JSON", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-real-"));
    const duplicateSource = [
      "export function duplicatedExample(value: number): number {",
      "  let total = value;",
      "  total += 1;",
      "  total += 2;",
      "  total += 3;",
      "  total += 4;",
      "  total += 5;",
      "  total += 6;",
      "  total += 7;",
      "  total += 8;",
      "  total += 9;",
      "  total += 10;",
      "  return total;",
      "}",
      ""
    ].join("\n");

    writeFileSync(join(tempDir, "a.ts"), duplicateSource, "utf8");
    writeFileSync(join(tempDir, "b.ts"), duplicateSource, "utf8");

    try {
      const packageManifestPath = fileURLToPath(import.meta.resolve("jscpd/package.json"));
      const declaredBinTarget = readJscpdBinTarget(packageManifestPath);
      assert.notEqual(DEFAULT_JSCPD_COMMAND.executable, process.execPath);
      assert.deepEqual(DEFAULT_JSCPD_COMMAND.args, []);
      assert.deepEqual(DEFAULT_JSCPD_COMMAND.availabilityArgs, ["--version"]);
      const resolvedCommand = resolveJscpdCommand(DEFAULT_JSCPD_COMMAND);
      assert.equal(resolvedCommand.kind, "resolved");
      if (resolvedCommand.kind === "resolved") {
        assert.equal(resolvedCommand.command.executable, process.execPath);
        assert.equal(resolvedCommand.command.args[0], declaredBinTarget);
        assert.deepEqual(resolvedCommand.command.availabilityArgs, [
          declaredBinTarget,
          "--version"
        ]);
      }
      const availability = await checkJscpd(tempDir, {
        ...DEFAULT_JSCPD_COMMAND,
        maxConcurrency: 1
      });
      assert.equal(availability.available, true);
      assert.equal(availability.source, "package dependency");

      const result = scanWithJscpd({
        files: [join(tempDir, "a.ts"), join(tempDir, "b.ts")],
        cwd: tempDir,
        dependency: { ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 1 },
        minimumTokens: 20
      });

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.measurements.length, 1);
        assert.equal(result.measurements[0].payload.locations.length, 2);
        assert.deepEqual(
          result.measurements[0].payload.locations.map((location) => location.path),
          ["a.ts", "b.ts"]
        );
        assert.deepEqual(result.measurements[0].sourcePaths, ["a.ts", "b.ts"]);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("classifies non-zero jscpd exits as execution failures", () => {
    const dependency = createFakeJscpdToolConfig({
      stdout: "",
      stderr: "bad invocation",
      exitCode: 2
    });

    try {
      const result = scanWithJscpd({
        files: ["scripts/a.ts", "scripts/b.ts"],
        cwd: REPO_ROOT,
        dependency,
        minimumTokens: 50
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "jscpd-execution-error");
        assert.match(result.error, /jscpd exit 2: bad invocation/);
      }
    } finally {
      dependency.cleanup();
    }
  });
});
function createFakeJscpdToolConfig({
  reportJson,
  stdout,
  stderr,
  exitCode
}: {
  exitCode: number;
  reportJson?: string;
  stderr: string;
  stdout: string;
}) {
  const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-"));
  const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");

  writeFileSync(
    fakeJscpdPath,
    `
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const outputIndex = process.argv.indexOf("--output");
if (${JSON.stringify(reportJson)} !== undefined && outputIndex >= 0) {
  const outputDir = process.argv[outputIndex + 1];
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "jscpd-report.json"), ${JSON.stringify(reportJson)}, "utf8");
}
process.stdout.write(${JSON.stringify(stdout)});
console.error(${JSON.stringify(stderr)});
process.exit(${JSON.stringify(exitCode)});
`,
    "utf8"
  );

  return {
    args: [fakeJscpdPath],
    availabilityArgs: [fakeJscpdPath, "--version"],
    executable: process.execPath,
    maxConcurrency: 1,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}
