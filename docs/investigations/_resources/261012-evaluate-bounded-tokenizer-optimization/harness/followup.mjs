import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const rows = [];
for (const runtime of ["node", "bun"])
  for (const kind of ["template", "comment"])
    for (const prefix of ["0", "1"])
      for (const mode of ["raw", "run", "port"])
        for (const variant of ["baseline", "candidate"]) {
          const size = kind === "template" ? "24" : "16000";
          const args = [
            variant,
            mode,
            kind,
            size,
            prefix,
            ...(mode === "port" ? ["--exit-wait-3000"] : [])
          ];
          const started = performance.now();
          const result = spawnSync("mise", ["exec", "--", runtime, `${work}/measure.ts`, ...args], {
            encoding: "utf8",
            timeout: 6000,
            killSignal: "SIGKILL",
            maxBuffer: 2 * 1024 * 1024
          });
          const row = {
            runtime,
            args,
            externalDeadlineMs: 6000,
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
writeFileSync(
  `${work}/native-followup.json`,
  JSON.stringify(
    {
      candidate: "native-matchAll",
      rows,
      protocol:
        "fresh child per operation; one sample per shape/layer/runtime (diagnostic confirmation, not stable tail estimate); port physical exit observed up to3000ms after return; external deadline6000ms"
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
