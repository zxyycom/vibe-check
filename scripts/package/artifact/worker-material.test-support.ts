import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import {
  PACKAGE_FUNCTION_METRICS_WORKER_PARENT_RUNTIME_PATH,
  PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH,
  PACKAGE_MARKDOWN_LINK_WORKER_PARENT_RUNTIME_PATH,
  PACKAGE_MARKDOWN_LINK_WORKER_RUNTIME_PATH
} from "../package-contract.ts";
import { runBun } from "../pack.ts";

/** Minimal independent tree and exact tarball accepted by both production Worker auditors. */
export function createWorkerMaterialFixture(root: string): Readonly<{
  readonly artifactPath: string;
  readonly stagingDirectory: string;
}> {
  const stagingDirectory = join(root, "package");
  const artifactDirectory = join(root, "artifacts");
  mkdirSync(stagingDirectory, { recursive: true });
  mkdirSync(artifactDirectory);
  writeFileSync(
    join(stagingDirectory, "package.json"),
    JSON.stringify({
      name: "worker-material-fixture",
      version: "0.0.0",
      files: ["dist", "src"]
    })
  );
  for (const [runtimePath, source] of [
    [PACKAGE_FUNCTION_METRICS_WORKER_RUNTIME_PATH, "export {};\n"],
    [
      PACKAGE_FUNCTION_METRICS_WORKER_PARENT_RUNTIME_PATH,
      'new URL("./analyzer-worker.mjs", import.meta.url);\n'
    ],
    [PACKAGE_MARKDOWN_LINK_WORKER_RUNTIME_PATH, "export {};\n"],
    [
      PACKAGE_MARKDOWN_LINK_WORKER_PARENT_RUNTIME_PATH,
      'new URL("./io-worker.mjs", import.meta.url);\n'
    ]
  ] as const) {
    const modulePath = join(stagingDirectory, runtimePath);
    const sourcePath = join(
      stagingDirectory,
      runtimePath.replace(/^dist\/esm\//u, "src/").replace(/\.mjs$/u, ".ts")
    );
    mkdirSync(dirname(modulePath), { recursive: true });
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, source);
    writeFileSync(modulePath, `${source}//# sourceMappingURL=${basename(modulePath)}.map\n`);
    writeFileSync(
      `${modulePath}.map`,
      JSON.stringify({
        version: 3,
        file: basename(modulePath),
        sources: [relative(dirname(modulePath), sourcePath).split("\\").join("/")],
        sourcesContent: [source],
        names: [],
        mappings: ""
      })
    );
  }
  runBun({
    args: ["pm", "pack", `--destination=${artifactDirectory}`, "--ignore-scripts", "--quiet"],
    cwd: stagingDirectory,
    phase: "pack independent Worker material fixture"
  });
  return Object.freeze({
    artifactPath: join(artifactDirectory, "worker-material-fixture-0.0.0.tgz"),
    stagingDirectory
  });
}
