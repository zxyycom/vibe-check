import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_JSCPD_COMMAND,
  readJscpdBinTarget,
  resolveJscpdCommand
} from "./command-resolution.ts";
import { scanWithJscpd } from "./scanner.ts";
import { checkJscpd } from "./availability.ts";

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
        minimumLines: 3,
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
        minimumLines: 3,
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
        command: {
          executable: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
          kind: "custom"
        }
      },
      minimumLines: 3,
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
      command: {
        executable: join(REPO_ROOT, `docnav-missing-jscpd-${process.pid}.cmd`),
        kind: "custom"
      }
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.equal(result.source, "custom command");
    assert.match(result.error, /jscpd dependency binary unavailable/);
  });

  it("uses identifiable jscpd versions as provenance without exact locking", async () => {
    const compatibleFutureVersion = createFakeJscpdToolConfig({
      stdout: "cpd 5.1.0\n",
      stderr: "",
      exitCode: 0
    });
    const unrecognizedVersion = createFakeJscpdToolConfig({
      stdout: "custom scanner\n",
      stderr: "",
      exitCode: 0
    });

    try {
      const available = await checkJscpd(REPO_ROOT, compatibleFutureVersion);
      assert.equal(available.available, true);
      assert.equal(available.version, "5.1.0");

      const unavailable = await checkJscpd(REPO_ROOT, unrecognizedVersion);
      assert.equal(unavailable.available, false);
      assert.equal(unavailable.reason, "execution-error");
      assert.match(unavailable.error, /unrecognized output/);
    } finally {
      compatibleFutureVersion.cleanup();
      unrecognizedVersion.cleanup();
    }
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
      assert.deepEqual(DEFAULT_JSCPD_COMMAND, { kind: "package" });
      const resolvedCommand = resolveJscpdCommand(DEFAULT_JSCPD_COMMAND);
      assert.equal(resolvedCommand.kind, "resolved");
      if (resolvedCommand.kind === "resolved") {
        assert.equal(resolvedCommand.command.executable, process.execPath);
        assert.equal(resolvedCommand.command.scanPrefixArguments[0], declaredBinTarget);
        assert.deepEqual(resolvedCommand.command.versionArguments, [
          declaredBinTarget,
          "--version"
        ]);
      }
      const availability = await checkJscpd(tempDir, {
        command: DEFAULT_JSCPD_COMMAND
      });
      assert.equal(availability.available, true);
      assert.equal(availability.source, "package dependency");

      const result = scanWithJscpd({
        files: [join(tempDir, "a.ts"), join(tempDir, "b.ts")],
        cwd: tempDir,
        dependency: { command: DEFAULT_JSCPD_COMMAND },
        minimumLines: 3,
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
        minimumLines: 3,
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
    `#!/usr/bin/env bun
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
  chmodSync(fakeJscpdPath, 0o755);

  return {
    command: {
      executable: fakeJscpdPath,
      kind: "custom" as const
    },
    cleanup: () => rmSync(tempDir, { recursive: true, force: true })
  };
}
