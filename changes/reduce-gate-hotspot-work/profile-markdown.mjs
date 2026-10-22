// Change-local diagnostic; retain with this Change's evidence until closeout.
// Normal lane timing never executes this bundle. Reruns replace the selected stage profile JSON.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

const changeDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(changeDirectory, "../..");
const stage = process.argv[2];
assert.ok(["before", "after"].includes(stage), "Expected stage: before | after");
const workload = JSON.parse(readFileSync(join(changeDirectory, "workload.json"), "utf8"));
const driverPath = join(workload.directory, "markdown-driver.mjs");
const profileBundlePath = join(workload.directory, `${stage}-markdown-profile.mjs`);
const cacheOptionsSource =
  stage === "before"
    ? "{ enabled: false }"
    : '{ enabled: true, directory: join(fixtureRoot, "parse-cache") }';

const driverSource = `
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, MARKDOWN_LINK_OPTIONS } from ${JSON.stringify(join(repositoryRoot, "src/package-checks/markdown-link-validation/constructor.test-support.ts"))};
import { executeMarkdownLinkValidation } from ${JSON.stringify(join(repositoryRoot, "src/package-checks/markdown-link-validation/execution.ts"))};

const fixtureRoot = mkdtempSync(join(tmpdir(), "gate-markdown-stages-"));
const trials = [];
try {
  writeFileSync(join(fixtureRoot, "source.md"), "[x](attachment) ".repeat(10001));
  writeFileSync(join(fixtureRoot, "attachment"), "present");
  const cache = ${cacheOptionsSource};
  const limitCases = [
    { maxOccurrences: false, maxTargetReads: false },
    { maxOccurrences: 100001, maxTargetReads: 10001 },
    { maxOccurrences: false, maxTargetReads: 10000 }
  ];
  for (const { maxOccurrences, maxTargetReads } of limitCases) {
    globalThis.__hotspotStages = [];
    const startedAtMs = performance.now();
    const checked = await execute(
      executeMarkdownLinkValidation,
      {
        ...MARKDOWN_LINK_OPTIONS,
        cache,
        limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxOccurrences, maxTargetReads }
      },
      fixtureRoot,
      { patterns: ["source.md"] }
    );
    const ms = performance.now() - startedAtMs;
    if (maxTargetReads === 10000) {
      assert.deepEqual(checked.result.reason, { code: "target-read-limit-exceeded" });
    } else {
      assert.deepEqual(checked.result.data, {
        sourceFileCount: 1,
        occurrenceCount: 10001,
        targetReadCount: 10001,
        findingCount: 0,
        rejectedInputCount: 0
      });
    }
    trials.push({ maxTargetReads, ms, stages: globalThis.__hotspotStages });
  }
  console.log(JSON.stringify(trials));
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
`;
writeFileSync(driverPath, driverSource);

const targetFunctionNames = new Set([
  "executeMarkdownLinkValidation",
  "collectSourceReferences",
  "registerSourceOccurrences",
  "settleReferenceCandidates",
  "parseMarkdownLinkFacts"
]);

function instrumentMarkdownSource({ modulePath, source }) {
  if (!modulePath.includes("/markdown-link-validation/")) return source;

  const syntaxTree = ts.createSourceFile(modulePath, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  for (const node of syntaxTree.statements) {
    const isTargetFunction =
      ts.isFunctionDeclaration(node) && node.body && targetFunctionNames.has(node.name?.text);
    if (!isTargetFunction) continue;

    const functionName = node.name.text;
    const isAsync = node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
    );
    const invocationPrefix = isAsync ? "await (async () => {" : "(() => {";
    const bodyStart = node.body.getStart() + 1;
    const bodyEnd = node.body.end - 1;
    edits.push({
      start: bodyStart,
      end: bodyEnd,
      text: `
        const __startedAtMs = performance.now();
        try {
          return ${invocationPrefix}
            ${source.slice(bodyStart, bodyEnd)}
          })();
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

const buildResult = await Bun.build({
  entrypoints: [driverPath],
  target: "bun",
  format: "esm",
  plugins: [
    {
      name: "diagnostic-stages",
      setup(build) {
        build.onLoad({ filter: /\.ts$/ }, (args) => {
          const instrumentedSource = instrumentMarkdownSource({
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
writeFileSync(profileBundlePath, await buildResult.outputs[0].text());
const child = Bun.spawn([process.execPath, profileBundlePath], { stdout: "pipe", stderr: "pipe" });
const [stdout, stderr, exitCode] = await Promise.all([
  new Response(child.stdout).text(),
  new Response(child.stderr).text(),
  child.exited
]);
assert.equal(exitCode, 0, stderr);
writeFileSync(join(changeDirectory, `${stage}-markdown-profile.json`), stdout);
console.log(stdout);
