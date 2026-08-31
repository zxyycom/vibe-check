import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkLizard } from "./availability.ts";
import { scanWithLizard } from "./scanner.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("Lizard adapter command boundary", () => {
  it("classifies non-zero version exits with stderr as execution failures", async () => {
    const dependency = createFakeLizard({
      source: [
        "if (process.argv.includes('--version')) {",
        "  console.error('No module named lizard');",
        "  process.exit(1);",
        "}"
      ].join("\n")
    });

    try {
      const result = await checkLizard(REPO_ROOT, dependency);

      assert.equal(result.available, false);
      assert.equal(result.reason, "execution-error");
      assert.match(result.error, /lizard --version failed, exit 1: No module named lizard/);
    } finally {
      dependency.cleanup();
    }
  });

  it("classifies missing dependency commands as unavailable tools", async () => {
    const result = await checkLizard(REPO_ROOT, {
      executable: join(REPO_ROOT, `vibe-check-missing-lizard-${process.pid}.cmd`)
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "tool-unavailable");
    assert.match(result.error, /lizard command unavailable/);
  });

  it("rejects empty version provenance instead of accepting an unknown tool", async () => {
    const dependency = createFakeLizard({ source: "process.exit(0);" });

    try {
      const result = await checkLizard(REPO_ROOT, dependency);

      assert.equal(result.available, false);
      assert.equal(result.reason, "contract-error");
      assert.match(result.error, /must output canonical 1\.23\.<patch>/);
    } finally {
      dependency.cleanup();
    }
  });

  it("accepts canonical supported 1.23 versions", async () => {
    for (const version of ["1.23.0", "1.23.1"]) {
      const dependency = createFakeLizard({
        source: `if (process.argv.includes('--version')) process.stdout.write('${version}\\n');`
      });
      try {
        const result = await checkLizard(REPO_ROOT, dependency);
        assert.deepEqual(result, { available: true, version });
      } finally {
        dependency.cleanup();
      }
    }
  });

  it("rejects noncanonical version provenance without echoing it", async () => {
    for (const version of [
      "1.23",
      "lizard 1.23.0",
      "1.23.00",
      "01.23.0",
      "1.023.0",
      "untrusted version output"
    ]) {
      const dependency = createFakeLizard({
        source: `if (process.argv.includes('--version')) process.stdout.write('${version}\\n');`
      });
      try {
        const result = await checkLizard(REPO_ROOT, dependency);
        assert.equal(result.available, false);
        assert.equal(result.reason, "contract-error");
        assert.equal(result.error, "lizard --version must output canonical 1.23.<patch>");
      } finally {
        dependency.cleanup();
      }
    }
  });

  it("rejects unsupported canonical version provenance", async () => {
    for (const version of ["1.22.9", "2.0.0"]) {
      const dependency = createFakeLizard({
        source: `if (process.argv.includes('--version')) process.stdout.write('${version}\\n');`
      });
      try {
        const result = await checkLizard(REPO_ROOT, dependency);
        assert.equal(result.available, false);
        assert.equal(result.reason, "contract-error");
        assert.match(result.error, new RegExp(version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      } finally {
        dependency.cleanup();
      }
    }
  });

  it("classifies signal termination as execution failure", () => {
    const dependency = createFakeLizard({ source: "process.kill(process.pid, 'SIGTERM');" });

    try {
      const result = scanWithLizard({
        cwd: REPO_ROOT,
        dependency,
        files: ["src/a.ts"]
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "execution");
        assert.match(result.error, /SIGTERM/);
      }
    } finally {
      dependency.cleanup();
    }
  });

  it("passes only exact paths and adapter-owned CSV arguments to the executable", () => {
    const dependency = createFakeLizard({
      source: [
        "const expected = ['src/a.ts', 'src/b.ts', '--csv'];",
        "if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
        "process.stdout.write('NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\\n12,2,30,1,12,a@1-12@src/a.ts,src/a.ts,a,a (),1,12\\n');"
      ].join("\n")
    });
    try {
      const result = scanWithLizard({
        cwd: REPO_ROOT,
        dependency,
        files: ["src/a.ts", "src/b.ts"]
      });
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.measurements.length, 1);
    } finally {
      dependency.cleanup();
    }
  });
});

function createFakeLizard({ source }: { source: string }) {
  const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-lizard-command-"));
  const executable = join(tempDir, "fake-lizard");
  writeFileSync(executable, `#!${process.execPath}\n${source}\n`, "utf8");
  chmodSync(executable, 0o755);
  return {
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    executable
  };
}
