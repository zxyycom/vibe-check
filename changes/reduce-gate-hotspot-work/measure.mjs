// Change-local measurement, not a Gate entry. Retain with this Change's evidence until closeout.
// State points to owned .cache/.log artifacts; rerunning a stage replaces measurement JSON.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, loadavg } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const changeDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(changeDirectory, "../..");
const [mode, statePath] = process.argv.slice(2);
assert.ok(
  typeof mode === "string",
  "Expected before | after, optional -profile, or a consumer worker mode"
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(path, report) {
  writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
}

async function measureConsumer({ mode, statePath }) {
  assert.ok(statePath, "Consumer worker requires a workload JSON path");
  const workload = JSON.parse(readFileSync(statePath, "utf8"));
  const importStartedAtMs = performance.now();
  const consumerModule = await import(
    mode === "consumer"
      ? "../../scripts/package/candidate/external-consumer/material.ts"
      : workload.consumerProfile
  );
  const importMs = performance.now() - importStartedAtMs;
  const preparationStartedAtMs = performance.now();
  const material = consumerModule.prepareExternalConsumerMaterial(workload.artifact);
  const prepareMs = performance.now() - preparationStartedAtMs;
  // The prepared material is used only for this immediate cleanup measurement.
  const cleanupStartedAtMs = performance.now();
  consumerModule.cleanupExternalConsumerMaterial(material);
  const cleanupMs = performance.now() - cleanupStartedAtMs;
  console.log(
    JSON.stringify({ importMs, prepareMs, cleanupMs, stages: globalThis.__hotspotStages })
  );
}

if (mode === "consumer" || mode === "consumer-profile") {
  await measureConsumer({ mode, statePath });
  process.exit(0);
}

const stage = mode.replace("-profile", "");
const isProfileOnly = mode.endsWith("-profile");
assert.ok(
  ["before", "after"].includes(stage),
  "Expected stage: before | after, optionally suffixed -profile"
);
const productApi = await import("../../src/index.ts");
const { PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS: qualityOptions } =
  await import("../../scripts/project/gate/checks/repository-quality.ts");
const { resolveProjectGateTestLanes } =
  await import("../../scripts/project/gate/checks/test-execution/lanes.ts");

const workloadPath = join(changeDirectory, "workload.json");
let workload;
if (stage === "before" && !isProfileOnly) {
  const { preparePackageCandidate } = await import("../../scripts/package/candidate/prepare.ts");
  const candidate = await preparePackageCandidate();
  const directory = join(repositoryRoot, ".cache/vibe-check/gate-hotspots", randomUUID());
  const sourceRoot = join(directory, "sources");
  mkdirSync(sourceRoot, { recursive: true });
  const files = [
    ...new Set(
      Object.values(qualityOptions.functionMetrics.codeAreas).flatMap((area) =>
        productApi.collectProjectFiles({ projectRoot: repositoryRoot, selection: area.files })
      )
    )
  ].sort();
  const sourceIdentities = [];
  for (const path of files) {
    const destination = join(sourceRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, path), destination);
    const sourceBytes = readFileSync(destination);
    sourceIdentities.push({ path, sha256: sha256(sourceBytes), bytes: sourceBytes.length });
  }
  workload = {
    directory,
    sourceRoot,
    files: sourceIdentities,
    functionOptions: qualityOptions.functionMetrics,
    artifact: { artifactPath: candidate.artifactPath, sha256: candidate.sha256 },
    candidateVersion: candidate.candidateVersion,
    markdownFiles: [...resolveProjectGateTestLanes(repositoryRoot).productMarkdownLinks]
  };
  writeJson(workloadPath, workload);
} else {
  workload = JSON.parse(readFileSync(workloadPath, "utf8"));
}
for (const file of workload.files) {
  assert.equal(sha256(readFileSync(join(workload.sourceRoot, file.path))), file.sha256);
}
assert.equal(sha256(readFileSync(workload.artifact.artifactPath)), workload.artifact.sha256);

const reportPath = join(changeDirectory, `${stage}-measurements.json`);
const report = isProfileOnly
  ? JSON.parse(readFileSync(reportPath, "utf8"))
  : {
      mode,
      formedAt: new Date().toISOString(),
      environment: {
        bun: Bun.version,
        platform: process.platform,
        arch: process.arch,
        cpus: cpus().length
      },
      candidate: workload.candidateVersion,
      function: [],
      markdown: [],
      consumer: [],
      profiles: {}
    };
function saveReport() {
  writeJson(reportPath, report);
}

async function measureChild(args) {
  const startedAtMs = performance.now();
  const bunExecutable = Bun.which("bun");
  assert.ok(bunExecutable, "Cannot run hotspot child: bun executable not found");
  const child = Bun.spawn([bunExecutable, ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe"
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  assert.equal(exitCode, 0, stdout + stderr);
  return { wallMs: performance.now() - startedAtMs, stdout, stderr };
}

const sampleRounds = isProfileOnly ? 0 : 4;
for (let round = 0; round < sampleRounds; round++) {
  const loadBefore = loadavg();
  const definition = productApi.defineConfig({
    checks: [productApi.functionMetrics(workload.functionOptions)],
    outputs: { progressRendering: { enabled: false } }
  });
  const startedAtMs = performance.now();
  const runResult = await productApi.run(definition, { projectRoot: workload.sourceRoot });
  assert.equal(runResult.kind, "completed");
  assert.equal(runResult.snapshot.checks[0].outcome.status, "passed");
  const outcome = runResult.snapshot.checks[0].outcome;
  const sample = {
    round,
    warmup: round === 0,
    wallMs: performance.now() - startedAtMs,
    outcome,
    loadBefore,
    loadAfter: loadavg()
  };
  report.function.push(sample);
  saveReport();
  console.log(JSON.stringify({ scope: "function", ...sample }));
}
for (let round = 0; round < sampleRounds; round++) {
  const sample = await measureChild(["test", ...workload.markdownFiles]);
  const tests = sample.stderr.split("\n").filter((line) => line.startsWith("(pass)"));
  report.markdown.push({ round, warmup: round === 0, wallMs: sample.wallMs, tests });
  saveReport();
  const slowestTests = tests
    .toSorted((left, right) => {
      const leftDurationMs = Number(left.match(/\[([\d.]+)ms\]/)?.[1] ?? 0);
      const rightDurationMs = Number(right.match(/\[([\d.]+)ms\]/)?.[1] ?? 0);
      return rightDurationMs - leftDurationMs;
    })
    .slice(0, 5);
  console.log(
    JSON.stringify({ scope: "markdown", round, wallMs: sample.wallMs, slowest: slowestTests })
  );
}
for (let round = 0; round < sampleRounds; round++) {
  const sample = await measureChild([fileURLToPath(import.meta.url), "consumer", workloadPath]);
  const consumerSample = {
    round,
    warmup: round === 0,
    wallMs: sample.wallMs,
    ...JSON.parse(sample.stdout)
  };
  report.consumer.push(consumerSample);
  saveReport();
  console.log(JSON.stringify({ scope: "consumer", ...consumerSample }));
}

// Diagnostic stages overlap the production measurements; they are not additive timing components.
const { runCurrentProductForPerformanceBenchmark } =
  await import("../../src/package-checks/function-metrics/measurement-performance-harness.test-support.ts");
report.profiles.function = await runCurrentProductForPerformanceBenchmark({
  rootDir: workload.sourceRoot,
  files: workload.files.map(({ path }) => ({
    path,
    source: readFileSync(join(workload.sourceRoot, path), "utf8")
  }))
});
saveReport();

// Instrument actual functions at build time. Normal timing samples above never use this bundle.
const ts = await import("typescript");
const targetFunctions = new Map([
  [
    "scripts/package/candidate/external-consumer/material.ts",
    [
      "prepareExternalConsumerMaterial",
      "writeExternalConsumerFixture",
      "installCandidate",
      "resolvePublicEntry"
    ]
  ],
  [
    "scripts/package/candidate/external-consumer/type-acceptance.ts",
    ["writeExternalConsumerTypesFixture"]
  ],
  [
    "scripts/package/candidate/external-consumer/documentation.ts",
    ["writeExternalConsumerDocumentationFixture"]
  ],
  [
    "scripts/package/candidate/external-consumer/documentation-fixture.ts",
    ["writeExternalConsumerDocumentationFixture"]
  ],
  [
    "scripts/package/candidate/external-consumer/runtime.ts",
    ["writeExternalConsumerRuntimeFixture"]
  ]
]);

function instrumentConsumerSource({ modulePath, source }) {
  const repositoryRelativePath = modulePath.slice(repositoryRoot.length + 1);
  const functionNames = targetFunctions.get(repositoryRelativePath);
  if (!functionNames) return source;

  const syntaxTree = ts.createSourceFile(modulePath, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  for (const node of syntaxTree.statements) {
    const isTargetFunction =
      ts.isFunctionDeclaration(node) && node.body && functionNames.includes(node.name?.text);
    if (!isTargetFunction) continue;

    const functionName = node.name.text;
    const bodyStart = node.body.getStart() + 1;
    const bodyEnd = node.body.end - 1;
    edits.push({
      start: bodyStart,
      end: bodyEnd,
      text: `
        const __startedAtMs = performance.now();
        try {
          ${source.slice(bodyStart, bodyEnd)}
        } finally {
          (globalThis.__hotspotStages ??= []).push({
            name: ${JSON.stringify(functionName)},
            ms: performance.now() - __startedAtMs
          });
        }
      `
    });
  }
  // Apply right-to-left so earlier source offsets remain valid.
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}

const consumerProfilePath = join(workload.directory, `${mode}-consumer-profile.mjs`);
const buildResult = await Bun.build({
  entrypoints: [join(repositoryRoot, "scripts/package/candidate/external-consumer/material.ts")],
  target: "bun",
  format: "esm",
  external: ["typescript"],
  outfile: consumerProfilePath,
  plugins: [
    {
      name: "change-local-stage-timing",
      setup(build) {
        build.onLoad({ filter: /\.ts$/ }, (args) => {
          const instrumentedSource = instrumentConsumerSource({
            modulePath: args.path,
            source: readFileSync(args.path, "utf8")
          });
          const source = instrumentedSource.replaceAll(
            "import.meta.url",
            JSON.stringify(pathToFileURL(args.path).href)
          );
          return { contents: source, loader: "ts" };
        });
      }
    }
  ]
});
assert.equal(buildResult.success, true, JSON.stringify(buildResult.logs));
// Resolve the external TS API exactly, not via the bundle's different ancestry.
const bundleSource = (await buildResult.outputs[0].text()).replaceAll(
  'from "typescript"',
  `from ${JSON.stringify(import.meta.resolve("typescript"))}`
);
writeFileSync(consumerProfilePath, bundleSource);
writeJson(workloadPath, { ...workload, consumerProfile: consumerProfilePath });
const consumerProfile = await measureChild([
  fileURLToPath(import.meta.url),
  "consumer-profile",
  workloadPath
]);
report.profiles.consumer = {
  wallMs: consumerProfile.wallMs,
  ...JSON.parse(consumerProfile.stdout)
};
if (stage === "after") {
  const beforeReport = JSON.parse(
    readFileSync(join(changeDirectory, "before-measurements.json"), "utf8")
  );
  assert.deepEqual(
    report.profiles.function.metrics,
    beforeReport.profiles.function.metrics,
    "frozen-input function metrics changed"
  );
  for (const sample of report.function) {
    assert.deepEqual(sample.outcome, beforeReport.function[0].outcome);
  }
}
saveReport();
console.log(
  JSON.stringify({
    scope: "profiles",
    function: report.profiles.function.stages,
    consumer: report.profiles.consumer
  })
);
