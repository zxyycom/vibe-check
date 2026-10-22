// Change-local diagnostic; retain with this Change's evidence until closeout.
// Registration-only runs import every selected module but skip bodies. Reruns replace stage JSON.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, loadavg } from "node:os";
import { join } from "node:path";
import { resolveProjectGateTestLanes } from "../../scripts/project/gate/checks/test-execution/lanes.ts";
import { parseBunRegistrationJUnit } from "../../scripts/test-evidence/discovery/bun-junit.ts";

const repositoryRoot = process.cwd();
const [stage = "before", onlyLane] = process.argv.slice(2);
assert.ok(["before", "after"].includes(stage), "Expected stage: before | after");
const lanes = Object.entries(resolveProjectGateTestLanes(repositoryRoot)).filter(([name]) => {
  const isInspectedLane = name.startsWith("scripts") || name === "packageSupporting";
  return isInspectedLane && (onlyLane === undefined || name === onlyLane);
});
assert.ok(lanes.length > 0, `No inspected lane matched: ${onlyLane}`);

const logRoot = join(repositoryRoot, ".log/script-lane-profile", randomUUID());
mkdirSync(logRoot, { recursive: true });
const reportPath = new URL(
  stage === "before" ? "./lane-profile.json" : "./lane-profile-after.json",
  import.meta.url
);
const report = {
  stage,
  formedAt: new Date().toISOString(),
  environment: { bun: Bun.version, cpus: cpus().length, platform: process.platform },
  note: "Sequential warm OS cache. No candidate/consumer groups. Full runs are real test bodies; registration-only uses an impossible test-name pattern. Their difference is approximate body/hooks/reporting cost, not an exact additive phase decomposition. Import closures include conservative lazy/type-only branches and exclude bare dependencies.",
  logRoot,
  lanes: Object.fromEntries(
    lanes.map(([name, files]) => [
      name,
      files.map((path) => ({
        path,
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex")
      }))
    ])
  ),
  samples: []
};

for (let round = 0; round < 4; round++) {
  for (const [lane, files] of lanes) {
    for (const mode of ["registration", "full"]) {
      const registrationReportPath = join(logRoot, `${round}-${lane}.xml`);
      const registrationArgs =
        mode === "registration"
          ? [
              "--test-name-pattern=a^",
              "--reporter=junit",
              `--reporter-outfile=${registrationReportPath}`
            ]
          : [];
      const args = ["test", ...registrationArgs, ...files];
      const loadBefore = loadavg();
      const startedAtMs = performance.now();
      const child = Bun.spawn([process.execPath, ...args], {
        cwd: repositoryRoot,
        stdout: "pipe",
        stderr: "pipe"
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited
      ]);
      const wallMs = performance.now() - startedAtMs;
      const logPath = join(logRoot, `${round}-${lane}-${mode}.log`);
      writeFileSync(logPath, stdout + stderr);

      if (mode === "registration") {
        assert.ok(exitCode === 0 || exitCode === 1, logPath + "\n" + stderr);
        const registeredTests = parseBunRegistrationJUnit(
          readFileSync(registrationReportPath, "utf8")
        );
        assert.ok(registeredTests.length > 0);
      } else {
        assert.equal(exitCode, 0, logPath + "\n" + stderr);
      }
      const passedTestLines = stderr.split("\n").filter((line) => line.startsWith("(pass)"));
      if (mode === "registration") assert.equal(passedTestLines.length, 0);
      report.samples.push({
        round,
        warmup: round === 0,
        lane,
        mode,
        wallMs,
        loadBefore,
        loadAfter: loadavg(),
        tests: passedTestLines,
        logPath
      });
      writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
      console.log(JSON.stringify({ round, lane, mode, wallMs, passed: passedTestLines.length }));
    }
  }
}
