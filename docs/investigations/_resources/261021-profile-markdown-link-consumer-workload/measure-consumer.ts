/** Native mdlink only. Reuses the Product-owned measurement entry and builds a consumer-shaped fixture. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass an owned directory; run profile-links.ts there first");
const output = path.resolve(directory);
mkdirSync(output, { recursive: true });
const fixtures = [
  { id: "sparse-1824", sourceCount: 1824, depth: 4, withLinks: true },
  { id: "sparse-400", sourceCount: 400, depth: 4, withLinks: true },
  { id: "sparse-900", sourceCount: 900, depth: 4, withLinks: true },
  { id: "deep-1824", sourceCount: 1824, depth: 10, withLinks: true },
  { id: "no-links-1824", sourceCount: 1824, depth: 4, withLinks: false }
];
const manifests = fixtures.map(fixture => ({ id: fixture.id, ...makeConsumerFixture(
  path.join(output, `${fixture.id}.tgz`), fixture.sourceCount, fixture.depth, fixture.withLinks) }));
writeFileSync(path.join(output, "consumer-fixtures.json"), JSON.stringify(manifests, null, 2) + "\n");
const transforms: Record<string, unknown> = {};
for (const mode of ["plain", "trace"]) {
  let source = readFileSync(path.join(output, `${mode}.mjs`), "utf8");
  const originalHash = createHash("sha256").update(source).digest("hex");
  function change(before: string, after: string) {
    if (source.split(before).length !== 2) throw new Error(`Expected one seam: ${before}`);
    source = source.replace(before, after);
  }
  change('"docs/**/*.md"', '"docs/testing/cases/**/*.md"');
  change('"changes/**/*.md"', '"docs/guides/**/*.md"');
  change('if (cacheState === "hit")', 'if (cacheState === "hit" || cacheState === "two-misses")');
  change('globalThis.__linkPerfReset();', `
    if (cacheState === "two-misses") {
      const selected = collectProjectFiles2({ projectRoot: root, selection: { patterns: REAL_PATTERNS } });
      for (const relative of selected.slice(-2)) {
        const file = path5.join(root, relative);
        const bytes = readFileSync(file); bytes[bytes.length - 2] = 121; writeFileSync(file, bytes);
      }
    }
    globalThis.__linkPerfReset();`);
  // Bundler-generated aliases are checked below; fail closed if its emitted layout changes.
  if (!source.includes("function collectProjectFiles2(") || !source.includes('var path5 =')) {
    // Use the public function and path aliases discovered from their final calls, not guessed aliases.
    const collectionAlias = /const selected = ([\w$]+)\(\{\s*projectRoot: process.cwd\(\)/u.exec(source)?.[1];
    const pathAlias = /directory: ([\w$]+)\.join\(root, "\.parse-cache"\)/u.exec(source)?.[1];
    if (!collectionAlias || !pathAlias) throw new Error("Cannot locate bundled aliases");
    source = source.replace("const selected = collectProjectFiles2({ projectRoot: root", `const selected = ${collectionAlias}({ projectRoot: root`)
      .replace("const file = path5.join(root, relative)", `const file = ${pathAlias}.join(root, relative)`);
  }
  writeFileSync(path.join(output, `consumer-${mode}.mjs`), source);
  transforms[mode] = { originalHash, transformedHash: createHash("sha256").update(source).digest("hex") };
}
const evidence = { startedAt: new Date().toISOString(), scope: "Only native markdownLinkValidation, no repository Gate",
  environment: { bun: Bun.version, platform: process.platform, architecture: process.arch,
    cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length }, transforms,
  samples: [] as Record<string, unknown>[] };

async function sample(fixture: string, state: string, mode: string, round: number) {
  const startedAt = new Date().toISOString();
  const loadBefore = os.loadavg();
  const child = Bun.spawn([process.execPath, "run", path.join(output, `consumer-${mode}.mjs`),
    path.join(output, `${fixture}.tgz`), "real", "0", "0", state], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited
  ]);
  if (exitCode !== 0) throw new Error(`${fixture}/${state}: ${stdout}\n${stderr}`);
  const measured = JSON.parse(stdout.trim());
  const expected = manifests.find(item => item.id === fixture)!;
  if (measured.outcome.data.sourceFileCount !== expected.sourceCount ||
    measured.outcome.data.occurrenceCount !== expected.occurrenceCount ||
    measured.outcome.data.targetReadCount !== expected.logicalDirectCount) {
    throw new Error(`Workload mismatch: ${JSON.stringify(measured.outcome)}`);
  }
  const result = { fixture, state, mode, round, startedAt, loadBefore, loadAfter: os.loadavg(), ...measured };
  evidence.samples.push(result);
  writeFileSync(path.join(output, "consumer-results.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ fixture, state, mode, round, elapsedMs: measured.elapsedMs }));
}
const scenarios = [
  ["sparse-1824", "hit"], ["sparse-1824", "two-misses"],
  ["sparse-400", "hit"], ["sparse-900", "hit"],
  ["deep-1824", "hit"], ["no-links-1824", "hit"]
];
for (let round = 0; round < 5; round += 1) {
  for (let position = 0; position < scenarios.length; position += 1) {
    const [fixture, state] = scenarios[(round + position) % scenarios.length]!;
    await sample(fixture!, state!, "plain", round + 1);
  }
}
for (const [fixture, state] of [
  ["sparse-1824", "hit"], ["sparse-1824", "two-misses"],
  ["deep-1824", "hit"], ["no-links-1824", "hit"]
]) await sample(fixture!, state!, "trace", 1);
writeFileSync(path.join(output, "consumer-results.json"), JSON.stringify({ ...evidence,
  finishedAt: new Date().toISOString() }, null, 2) + "\n");
