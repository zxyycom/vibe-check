/** Depth-only extension: existing Product measurement entry, fixed consumer workload, no Product edits. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";

const [directory, phase, depthsText, roundsText = "1"] = process.argv.slice(2);
if (!directory || !["explore", "confirm", "profile"].includes(phase ?? "") || !depthsText) {
  throw new Error("Usage: measure-path-depth.ts <owned output, profile-links.ts built first> <explore|confirm|profile> <comma-separated depths> [rounds]");
}
if (process.env.LINK_MAX_BYTES && process.env.LINK_MAX_BYTES !== "1048576") {
  throw new Error("Depth experiments require the default 1 MiB reader limit");
}
const output = path.resolve(directory);
const depths = depthsText.split(",").map(Number);
const rounds = Number(roundsText);
if (!depths.length || depths.some(depth => !Number.isInteger(depth) || depth < 4) ||
  !Number.isInteger(rounds) || rounds < 1) throw new Error("Invalid depth or round count");
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const read = (file: string) => JSON.parse(readFileSync(path.join(output, file), "utf8"));
const save = (file: string, value: unknown) => writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + "\n");
const bundleIdentity = read("bundle-identities.json");
const transforms: Record<string, unknown> = {};
for (const mode of ["plain", "trace"]) {
  let source = readFileSync(path.join(output, `${mode}.mjs`), "utf8");
  const originalHash = digest(source);
  if (originalHash !== bundleIdentity.bundles[mode]) throw new Error("Original bundle identity mismatch");
  for (const [before, after] of [
    ['"docs/**/*.md"', '"docs/testing/cases/**/*.md"'],
    ['"changes/**/*.md"', '"docs/guides/**/*.md"']
  ]) {
    if (source.split(before!).length !== 2) throw new Error(`Expected one selection seam: ${before}`);
    source = source.replace(before!, after!);
  }
  const target = path.join(output, `depth-${mode}.mjs`);
  if (existsSync(target) && digest(readFileSync(target)) !== digest(source)) throw new Error("Transformed bundle drift");
  if (!existsSync(target)) writeFileSync(target, source);
  transforms[mode] = { originalHash, transformedHash: digest(source) };
}
const identities = {
  bundleIdentitySha256: digest(readFileSync(path.join(output, "bundle-identities.json"))), transforms,
  methods: Object.fromEntries(["measure-path-depth.ts", "consumer-fixture.ts", "profile-links.ts"].map(file => [file,
    digest(readFileSync(new URL(file, import.meta.url)))]))
};
const evidenceFile = "depth-results.json";
const evidence = existsSync(path.join(output, evidenceFile)) ? read(evidenceFile) : {
  startedAt: new Date().toISOString(),
  scope: "Native markdownLinkValidation, fixed N=1824/B=3320000/E=1193/logicalDirect=777/targets=296; depth is the only experimental variable",
  timing: "New process per sample; one untimed warmup run, then public single-Check Run; generation/extraction/import/warmup excluded",
  environment: { bun: Bun.version, platform: process.platform, architecture: process.arch,
    kernel: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() },
  identities, fixtures: [], samples: []
};
if (JSON.stringify(evidence.identities) !== JSON.stringify(identities)) throw new Error("Evidence identity drift");
if (evidence.samples.some((sample: any) => sample.phase === phase)) throw new Error(`Phase already sampled: ${phase}`);
for (const depth of depths) {
  if (evidence.fixtures.some((fixture: any) => fixture.depth === depth)) continue;
  const fixture = makeConsumerFixture(path.join(output, `depth-${depth}.tgz`), 1824, depth, true);
  const { sourceManifest, ...metadata } = fixture;
  evidence.fixtures.push({ ...metadata,
    sourceManifestSha256: digest(JSON.stringify(sourceManifest)),
    minSourceBytes: Math.min(...sourceManifest.map(item => item.bytes)),
    maxSourceBytes: Math.max(...sourceManifest.map(item => item.bytes)),
    firstSourcePath: sourceManifest[0]!.path,
    lastSourcePath: sourceManifest.at(-1)!.path
  });
}
save(evidenceFile, evidence);
for (let round = 1; round <= rounds; round += 1) {
  for (let position = 0; position < depths.length; position += 1) {
    const depth = depths[(position + round - 1) % depths.length]!;
    const mode = phase === "profile" ? "trace" : "plain";
    const startedAt = new Date().toISOString();
    const loadBefore = os.loadavg();
    const child = Bun.spawn([process.execPath, "run", path.join(output, `depth-${mode}.mjs`),
      path.join(output, `depth-${depth}.tgz`), "real", "0", "0", "hit"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited
    ]);
    if (code !== 0) throw new Error(`depth ${depth}: ${stdout}\n${stderr}`);
    const measured = JSON.parse(stdout.trim());
    const data = measured.outcome.data;
    if (measured.outcome.status !== "passed" || data.findingCount !== 0 || data.sourceFileCount !== 1824 ||
      data.occurrenceCount !== 1193 || data.targetReadCount !== 777 || measured.maxMarkdownBytes !== 1048576) {
      throw new Error(`Workload mismatch: ${JSON.stringify(measured)}`);
    }
    evidence.samples.push({ phase, fixtureDepth: depth, round, mode, startedAt,
      finishedAt: new Date().toISOString(), loadBefore, loadAfter: os.loadavg(), ...measured });
    evidence.updatedAt = new Date().toISOString();
    save(evidenceFile, evidence);
    console.log(JSON.stringify({ phase, depth, round, elapsedMs: measured.elapsedMs }));
  }
}
