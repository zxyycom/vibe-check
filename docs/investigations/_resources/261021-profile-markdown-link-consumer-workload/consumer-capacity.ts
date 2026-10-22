/** Capacity sensitivity on the consumer-shaped corpus, not a proposed reduction in accepted input size. */
import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass the existing consumer experiment directory");
const output = path.resolve(directory);
const evidence = { startedAt: new Date().toISOString(), bun: Bun.version,
  scope: "1824 sources / 3.32 MB / 1193 occurrences / 777 logical direct; byte limit sensitivity only",
  samples: [] as Record<string, unknown>[] };
for (let round = 0; round < 7; round += 1) {
  const mode = round < 6 ? "plain" : "trace";
  const capacities = round < 6 ? (round % 2 ? [131072, 1048576] : [1048576, 131072]) : [131072];
  for (const cap of capacities) {
    const loadBefore = os.loadavg();
    const child = Bun.spawn([process.execPath, "run", path.join(output, `consumer-${mode}.mjs`),
      path.join(output, "sparse-1824.tgz"), "real", "0", "0", "hit"], {
      stdout: "pipe", stderr: "pipe", env: { ...process.env, LINK_MAX_BYTES: String(cap) }
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited
    ]);
    if (exitCode !== 0) throw new Error(`${stdout}\n${stderr}`);
    const measured = JSON.parse(stdout.trim());
    const expected = JSON.parse(readFileSync(path.join(output, "consumer-results.json"), "utf8")).samples[0].outcome;
    if (JSON.stringify(measured.outcome) !== JSON.stringify(expected)) throw new Error("Outcome mismatch");
    evidence.samples.push({ round: round + 1, mode, cap, loadBefore, loadAfter: os.loadavg(), ...measured });
    writeFileSync(path.join(output, "consumer-capacity-results.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify({ round: round + 1, mode, cap, elapsedMs: measured.elapsedMs }));
  }
}
writeFileSync(path.join(output, "consumer-capacity-results.json"), JSON.stringify({ ...evidence,
  finishedAt: new Date().toISOString() }, null, 2) + "\n");
