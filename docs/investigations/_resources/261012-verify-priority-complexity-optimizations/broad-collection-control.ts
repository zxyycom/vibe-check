/** Independent broad-pattern common-path sanity.
 * Historical samples remain bound to the original control/harness hashes.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argument, ownedFixtureRoot, loadBenchmarkApi } from "./benchmark-boundaries.ts";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sourceRoot = resolve(argument({ name: "--source-root", fallback: repositoryRoot }));
const fixtureRoot = ownedFixtureRoot(argument({ name: "--fixture-root", fallback: "" }));
const { collectProjectFiles } = await loadBenchmarkApi(sourceRoot);
const projectRoot = resolve(fixtureRoot, "directory-1024");
const expected = Array.from(
  { length: 1024 },
  (_, index) => `f-${String(index).padStart(6, "0")}.ts`
);
const options = { projectRoot, selection: { patterns: ["**/*.ts"], useDefaultExcludes: false } };
let semanticDigest: string | undefined;
function measuredOperation(): number {
  const started = performance.now();
  const result = collectProjectFiles(options);
  const wallMs = performance.now() - started;
  if (!Object.isFrozen(result) || JSON.stringify(result) !== JSON.stringify(expected))
    throw new Error("Broad collection drift");
  const digest = createHash("sha256").update(JSON.stringify(result)).digest("hex");
  if (semanticDigest !== undefined && digest !== semanticDigest) throw new Error("Facts drift");
  semanticDigest = digest;
  if (!Number.isFinite(wallMs) || wallMs < 0 || wallMs > 10_000)
    throw new Error("Bounded sample exceeded");
  return wallMs;
}
const warmupWallMs = Array.from({ length: 3 }, () => measuredOperation());
const operationWallMs = Array.from({ length: 9 }, () => measuredOperation());
console.log(
  JSON.stringify(
    {
      protocol: "broad-collection-control-v1",
      observedAt: new Date().toISOString(),
      size: 1024,
      patterns: ["**/*.ts"],
      useDefaultExcludes: false,
      warmups: 3,
      samples: 9,
      iterations: 1,
      timingScope:
        "complete synchronous public collectProjectFiles call; import/assertions/digest excluded",
      sourceRoot,
      fixtureRoot,
      runtime: { executable: process.execPath, versions: process.versions },
      invocation: { cwd: process.cwd(), argv: process.argv },
      harnessSha256: createHash("sha256")
        .update(readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      fixtureManifestSha256: createHash("sha256")
        .update(readFileSync(resolve(fixtureRoot, "manifest.json")))
        .digest("hex"),
      semanticDigest,
      warmupWallMs,
      operationWallMs
    },
    null,
    2
  )
);
