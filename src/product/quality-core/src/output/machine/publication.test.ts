import { strict as assert } from "node:assert";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createEmptyMetrics } from "../../model/schema.ts";
import {
  projectMachineMetricsV1,
  serializeMachineArtifactCandidatesV1
} from "./index.ts";
import {
  publishMachineArtifactCandidatesV1,
  type MachinePublicationFileOps
} from "./publication.ts";

const CANONICAL_FILES = [
  "metrics.json",
  "warnings.ndjson",
  "warnings-all.ndjson"
] as const;
const OWNED_TEMP = ".vibe-check-machine-prior-metrics.json.tmp";

const PUBLICATION_FAILURE_CASES = [
  {
    inject(ops: MachinePublicationFileOps): MachinePublicationFileOps {
      let failed = false;
      return {
        ...ops,
        remove(path) {
          if (!failed && path.endsWith("metrics.json")) {
            failed = true;
            throw new Error("controlled cleanup failure");
          }
          ops.remove(path);
        }
      };
    },
    label: "prior cleanup",
    message: /controlled cleanup failure/,
    seedPrior: true
  },
  {
    inject(ops: MachinePublicationFileOps): MachinePublicationFileOps {
      let writes = 0;
      return {
        ...ops,
        write(path, bytes) {
          writes += 1;
          if (writes === 2) throw new Error("controlled temp write failure");
          ops.write(path, bytes);
        }
      };
    },
    label: "temp write",
    message: /controlled temp write failure/,
    seedPrior: false
  },
  {
    inject(ops: MachinePublicationFileOps): MachinePublicationFileOps {
      let renames = 0;
      return {
        ...ops,
        rename(from, to) {
          renames += 1;
          if (renames === 2) throw new Error("controlled rename failure");
          ops.rename(from, to);
        }
      };
    },
    label: "rename",
    message: /controlled rename failure/,
    seedPrior: false
  }
] as const;


describe("validated machine artifact publication", () => {
  it("rejects an invalid candidate set before writing canonical files", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "vibe-check-publication-invalid-"));
    const operations: string[] = [];
    const ops = recordingFileOps(operations);
    const candidates = validCandidates();
    const unrelatedTemp = ".consumer-owned.tmp";

    try {
      for (const fileName of CANONICAL_FILES) {
        writeFileSync(join(artifactDir, fileName), "stale", "utf8");
      }
      writeFileSync(join(artifactDir, OWNED_TEMP), "stale", "utf8");
      writeFileSync(join(artifactDir, unrelatedTemp), "keep", "utf8");

      assert.throws(
        () => publishMachineArtifactCandidatesV1(
          artifactDir,
          { ...candidates, metricsJson: "{}" },
          ops
        ),
        /Machine artifact candidate validation failed for metrics\.json/
      );
      assert.equal(
        operations.some(
          (operation) =>
            operation.startsWith("write:") || operation.startsWith("rename:")
        ),
        false
      );
      for (const fileName of CANONICAL_FILES) {
        assert.equal(existsSync(join(artifactDir, fileName)), false);
      }
      assert.equal(existsSync(join(artifactDir, OWNED_TEMP)), false);
      assert.equal(readFileSync(join(artifactDir, unrelatedTemp), "utf8"), "keep");
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });

  it("cleans prior canonical and owned temp files before publishing all candidates", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "vibe-check-publication-prior-"));
    const candidates = validCandidates();
    const operations: string[] = [];
    const unrelatedTemp = ".consumer-owned.tmp";

    try {
      for (const fileName of CANONICAL_FILES) {
        writeFileSync(join(artifactDir, fileName), "stale", "utf8");
      }
      writeFileSync(join(artifactDir, OWNED_TEMP), "stale", "utf8");
      writeFileSync(join(artifactDir, unrelatedTemp), "keep", "utf8");

      const paths = publishMachineArtifactCandidatesV1(
        artifactDir,
        candidates,
        recordingFileOps(operations)
      );

      assert.deepEqual(paths, {
        metricsPath: join(artifactDir, "metrics.json"),
        warningsAllPath: join(artifactDir, "warnings-all.ndjson"),
        warningsPath: join(artifactDir, "warnings.ndjson")
      });
      assert.equal(readFileSync(paths.metricsPath, "utf8"), candidates.metricsJson);
      assert.equal(
        readFileSync(paths.warningsPath, "utf8"),
        candidates.warningsNdjson
      );
      assert.equal(
        readFileSync(paths.warningsAllPath, "utf8"),
        candidates.warningsAllNdjson
      );
      assert.equal(existsSync(join(artifactDir, OWNED_TEMP)), false);
      assert.equal(readFileSync(join(artifactDir, unrelatedTemp), "utf8"), "keep");
      const firstWrite = operations.findIndex((operation) => operation.startsWith("write:"));
      assert.ok(firstWrite >= 0);
      assert.equal(
        operations.slice(0, firstWrite).every((operation) => operation.startsWith("remove:")),
        true
      );
      assert.equal(
        operations.filter((operation) => operation.startsWith("rename:")).length,
        3
      );
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });

  it("best-effort cleans every canonical and owned temp after handled file failures", () => {
    for (const testCase of PUBLICATION_FAILURE_CASES) {
      assertPublicationFailureCleanup(testCase);
    }
  });
});


type PublicationFailureCase = typeof PUBLICATION_FAILURE_CASES[number];

function assertPublicationFailureCleanup(
  testCase: PublicationFailureCase
): void {
  const artifactDir = mkdtempSync(
    join(tmpdir(), `vibe-check-publication-${testCase.label.replace(" ", "-")}-`)
  );
  const operations: string[] = [];
  const baseOps = recordingFileOps(operations);

  try {
    if (testCase.seedPrior) {
      for (const fileName of CANONICAL_FILES) {
        writeFileSync(join(artifactDir, fileName), "stale", "utf8");
      }
      writeFileSync(join(artifactDir, OWNED_TEMP), "stale", "utf8");
    }

    assert.throws(
      () => publishMachineArtifactCandidatesV1(
        artifactDir,
        validCandidates(),
        testCase.inject(baseOps)
      ),
      testCase.message,
      testCase.label
    );
    for (const fileName of CANONICAL_FILES) {
      assert.equal(
        existsSync(join(artifactDir, fileName)),
        false,
        `${testCase.label}: ${fileName}`
      );
    }
    assert.equal(
      readdirSync(artifactDir).some(isOwnedMachineTemp),
      false,
      `${testCase.label}: owned temp`
    );
    if (testCase.label === "prior cleanup") {
      assert.equal(
        operations.some((operation) => operation.startsWith("write:")),
        false
      );
    }
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
}

function validCandidates(): ReturnType<typeof serializeMachineArtifactCandidatesV1> {
  const metrics = createEmptyMetrics({
    commitSha: "publication-test",
    configVersion: "test",
    repository: "/tmp/publication-test",
    scope: {
      excludeDirs: [],
      generatedFiles: [],
      include: ["src/**/*.ts"]
    },
    tools: []
  });
  return serializeMachineArtifactCandidatesV1(projectMachineMetricsV1(metrics));
}

function recordingFileOps(operations: string[]): MachinePublicationFileOps {
  return {
    list(directory) {
      return readdirSync(directory);
    },
    remove(path) {
      operations.push(`remove:${path}`);
      rmSync(path, { force: true });
    },
    rename(from, to) {
      operations.push(`rename:${from}->${to}`);
      renameSync(from, to);
    },
    write(path, bytes) {
      operations.push(`write:${path}`);
      writeFileSync(path, bytes, { flag: "wx" });
    }
  };
}

function isOwnedMachineTemp(fileName: string): boolean {
  return fileName.startsWith(".vibe-check-machine-") && fileName.endsWith(".tmp");
}
