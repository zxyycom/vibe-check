import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
if (process.argv.length > 4) throw new Error("arguments: expected at most runtime and phase");
const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const runtime = process.argv[2] ?? "node";
const phase = process.argv[3] ?? "pathological";
if (runtime !== "node" && runtime !== "bun") throw new Error("runtime: expected node or bun");
if (phase !== "pathological" && phase !== "corpus")
  throw new Error("phase: expected pathological or corpus");
const rows = [];
function child(args, timeout = 5000) {
  const started = performance.now();
  const result = spawnSync("mise", ["exec", "--", runtime, `${work}/measure.ts`, ...args], {
    timeout,
    killSignal: "SIGKILL",
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  const row = {
    args,
    externalDeadlineMs: timeout,
    outerMs: performance.now() - started,
    status: result.status,
    signal: result.signal,
    error: result.error?.code,
    ...decodeChildObservation(result),
    stderrExcerpt: result.status === 0 ? undefined : (result.stderr ?? "").slice(-1000)
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
if (phase === "pathological") {
  for (const mode of ["raw", "run", "port"])
    for (const kind of ["template", "comment"]) {
      const sizes = kind === "template" ? [16, 20, 24] : [2000, 8000, 16000];
      for (const prefix of ["0", "1"])
        for (const n of sizes)
          for (let block = 0; block < 2; block++)
            for (const variant of block % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"])
              child([variant, mode, kind, String(n), prefix]);
    }
} else if (phase === "corpus") {
  for (let block = 0; block < (runtime === "bun" ? 4 : 8); block++)
    for (const variant of block % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"])
      child([variant, "corpus", "real"], 15000);
} else throw new Error("bad phase");
writeFileSync(
  `${work}/${phase}-${runtime}.json`,
  JSON.stringify(
    {
      runtime,
      phase,
      rows,
      protocol:
        "fresh child per operation; alternating AB/BA; external hard timeout via spawnSync killSignal SIGKILL; cancelled/timeout samples not normal completion; raw/run/port separate overlapping layers"
    },
    null,
    2
  ) + "\n"
);

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
