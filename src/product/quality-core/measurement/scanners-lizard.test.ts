import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkLizard } from "./scanners/tool-availability/lizard.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("quality lizard availability projection", () => {
  it("classifies non-zero version exits with stderr as execution failures", async () => {
    const dependency = createFakeVersionToolConfig({
      stdout: "",
      stderr: "No module named lizard",
      exitCode: 1,
    });

    try {
      const result = await checkLizard(REPO_ROOT, dependency);

      assert.equal(result.available, false);
      assert.equal(result.reason, "execution-error");
      assert.equal(result.version, null);
      assert.match(
        result.error ?? "",
        /lizard --version failed, exit 1: No module named lizard/,
      );
    } finally {
      dependency.cleanup();
    }
  });

  it("classifies missing dependency commands as unavailable tools", async () => {
    const result = await checkLizard(REPO_ROOT, {
      args: [],
      availabilityArgs: ["--version"],
      executable: join(
        REPO_ROOT,
        `vibe-check-missing-lizard-${process.pid}.cmd`,
      ),
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.equal(result.version, null);
    assert.match(result.error ?? "", /lizard command unavailable/);
  });
});
function createFakeVersionToolConfig({
  stdout,
  stderr,
  exitCode,
}: {
  exitCode: number;
  stderr: string;
  stdout: string;
}) {
  const tempDir = mkdtempSync(
    join(tmpdir(), "vibe-check-quality-version-tool-"),
  );
  const fakeToolPath = join(tempDir, "fake-version-tool.ts");

  writeFileSync(
    fakeToolPath,
    `
process.stdout.write(${JSON.stringify(stdout)});
console.error(${JSON.stringify(stderr)});
process.exit(${JSON.stringify(exitCode)});
`,
    "utf8",
  );

  return {
    args: [fakeToolPath],
    availabilityArgs: [fakeToolPath, "--version"],
    executable: process.execPath,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}
