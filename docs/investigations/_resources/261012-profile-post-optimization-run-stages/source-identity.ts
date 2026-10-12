/** Content identity includes every src file, not only runtime implementation files. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
export interface SourceEntry {
  readonly path: string;
  readonly sha256: string;
}
export function sourceManifest(root: string): readonly SourceEntry[] {
  const entries: SourceEntry[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        entries.push({ path: relative(root, path), sha256: fileSha256(path) });
      } else throw new Error(`Unexpected source entry: ${path}`);
    }
  }
  visit(resolve(root, "src"));
  return entries.sort((left, right) => {
    if (left.path < right.path) return -1;
    if (left.path > right.path) return 1;
    return 0;
  });
}
export function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
export function manifestSha256(entries: readonly SourceEntry[]): string {
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}
if (import.meta.main) {
  const artifactRoot = fileURLToPath(new URL("./", import.meta.url));
  const baseline = sourceManifest("/workspace/vibe-check");
  const copy = sourceManifest(resolve(artifactRoot, "instrumented"));
  if (JSON.stringify(baseline) !== JSON.stringify(copy))
    throw new Error("Source copy differs before instrumentation");
  writeFileSync(
    resolve(artifactRoot, "source-before.json"),
    JSON.stringify(
      { manifestSha256: manifestSha256(baseline), fileCount: baseline.length, baseline, copy },
      null,
      2
    ) + "\n"
  );
  console.log(manifestSha256(baseline));
}
