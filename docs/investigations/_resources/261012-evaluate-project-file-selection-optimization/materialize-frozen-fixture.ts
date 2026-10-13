import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { assertNoArguments, readFrozenManifest } from "./helper-inputs.ts";

assertNoArguments(process.argv.slice(2), "materialize-frozen-fixture.ts");
const root = process.cwd(),
  base = resolve(root, "tmp/optimization-20261012/file-selection"),
  resources = resolve(
    root,
    "docs/investigations/_resources/261012-evaluate-project-file-selection-optimization"
  );
const frozen = readFrozenManifest(resolve(resources, "manifest.json"));
const fixture = resolve(base, "node_modules/frozen-fixture"),
  head = "08c9166b85152168ca27d45452a4174afed50e57";
if (existsSync(fixture))
  throw new Error(`fixture target already exists; do not overwrite: ${fixture}`);
mkdirSync(fixture, { recursive: true });
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const sources = [];
for (const item of frozen.manifest) {
  let bytes = readFileSync(resolve(root, item.path)),
    source = "current-workspace";
  if (bytes.length !== item.bytes || digest(bytes) !== item.sha256) {
    const result = spawnSync("git", ["show", `${head}:${item.path}`], {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024
    });
    if (result.status !== 0) throw new Error(`fixed HEAD blob read failed for ${item.path}`);
    bytes = result.stdout;
    source = `git:${head}`;
  }
  if (bytes.length !== item.bytes || digest(bytes) !== item.sha256)
    throw new Error(`could not recover frozen bytes for ${item.path}`);
  const target = resolve(fixture, item.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes, { flag: "wx" });
  sources.push({ path: item.path, source });
}
function collect(dir: string, prefix = ""): string[] {
  const paths: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    const stats = lstatSync(path);
    if (stats.isDirectory()) paths.push(...collect(path, relative));
    else if (stats.isFile()) paths.push(relative);
    else throw new Error(`nonregular fixture member ${path}`);
  }
  return paths.sort();
}
const actual = collect(fixture),
  expected = frozen.manifest.map((entry) => entry.path).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error("fixture membership mismatch");
for (const item of frozen.manifest) {
  const bytes = readFileSync(resolve(fixture, item.path));
  if (bytes.length !== item.bytes || digest(bytes) !== item.sha256)
    throw new Error("materialized hash mismatch");
}
const evidence = {
  materializedAt: new Date().toISOString(),
  fixture,
  sourceHead: head,
  files: actual.length,
  totalBytes: frozen.manifest.reduce((total, entry) => total + entry.bytes, 0),
  sources,
  verifiedExactMembershipAndBytes: true
};
writeFileSync(resolve(resources, "fixture-provenance.json"), JSON.stringify(evidence, null, 2), {
  flag: "wx"
});
console.log(
  JSON.stringify({
    fixture,
    files: actual.length,
    recoveredFromFixedHead: sources.filter((x) => x.source !== "current-workspace").length,
    verifiedExactMembershipAndBytes: true
  })
);
