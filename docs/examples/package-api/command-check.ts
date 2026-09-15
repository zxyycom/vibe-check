// #region package-api-example:command-check
import { commandCheck, defineConfig, run } from "@zxyycom/vibe-check";

const nodeProbe = commandCheck({
  checkId: "node-probe",
  displayName: "Node probe",
  executable: process.execPath,
  arguments: ["--eval", "process.exit(0)"],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024
});

const definition = defineConfig({
  checks: [nodeProbe],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === nodeProbe.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.exitCode !== 0) {
  throw new Error("Node probe did not produce the expected passed outcome");
}
// #endregion package-api-example:command-check
