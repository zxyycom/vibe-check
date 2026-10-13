import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
if (process.argv.length > 3) throw new Error("arguments: expected at most one phase");
const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const phase = process.argv[2] ?? "legal";
if (phase !== "legal" && phase !== "tail") throw new Error("phase: expected legal or tail");
const rows = [];
const matrixStartedAt = new Date().toISOString();
function child(runtime, args, deadlineMs) {
  const startedAt = new Date().toISOString(),
    start = performance.now();
  const r = spawnSync("mise", ["exec", "--", runtime, `${work}/measure-v3.1.ts`, ...args], {
    timeout: deadlineMs,
    killSignal: "SIGKILL",
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  const row = {
    runtime,
    args,
    startedAt,
    finishedAt: new Date().toISOString(),
    externalDeadlineMs: deadlineMs,
    outerMs: performance.now() - start,
    status: r.status,
    signal: r.signal,
    error: r.error?.code,
    ...decodeChildObservation(r),
    stderrExcerpt: r.status === 0 ? undefined : (r.stderr ?? "").slice(-1000)
  };
  rows.push(row);
  console.log(JSON.stringify(row));
  writeFileSync(
    `${work}/v3.1-${phase}.json`,
    JSON.stringify(
      {
        candidate: "v3.1-addition-eligible-cost-dispatch",
        startedAt: matrixStartedAt,
        finishedAt: new Date().toISOString(),
        protocol:
          phase === "legal"
            ? "fresh child, once warm/once timed analyzer, Node4/Bun2 pervariant AB/BA, frozen source/input"
            : "one diagnostic sample per shape/layer/runtime, pure and normalprefix, external6s; port observe3s only after timedreturn",
        rows
      },
      null,
      2
    ) + "\n"
  );
  if (r.status !== 0 || row.protocolFailure)
    throw Error(
      "external/protocol failure; bounded controller stopped after retaining child evidence"
    );
}
if (phase === "legal")
  for (const runtime of ["node", "bun"])
    for (let block = 0; block < (runtime === "node" ? 4 : 2); block++)
      for (const v of block % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"])
        child(runtime, [v, "corpus", "real"], 15000);
else if (phase === "tail")
  for (const runtime of ["node", "bun"])
    for (const kind of ["template", "comment"])
      for (const p of ["0", "1"])
        for (const mode of ["raw", "run", "port"])
          for (const v of ["baseline", "candidate"])
            child(
              runtime,
              [
                v,
                mode,
                kind,
                kind === "template" ? "24" : "16000",
                p,
                ...(mode === "port" ? ["--exit-wait-3000"] : [])
              ],
              6000
            );
else throw Error("unknown phase");

function decodeChildObservation(result) {
  if (result.status !== 0) return { observation: undefined };
  try {
    if (typeof result.stdout !== "string") throw new Error("expected textual child stdout");
    const line = result.stdout.trim().split("\n").filter(Boolean).at(-1);
    if (!line) throw new Error("missing child observation line");
    const observation = JSON.parse(line);
    if (typeof observation !== "object" || observation === null || Array.isArray(observation)) {
      throw new Error("expected observation object");
    }
    return { observation };
  } catch (error) {
    return {
      observation: undefined,
      protocolFailure: {
        message: error instanceof Error ? error.message : String(error),
        status: result.status,
        signal: result.signal,
        stdout: result.stdout,
        stderr: result.stderr
      }
    };
  }
}
