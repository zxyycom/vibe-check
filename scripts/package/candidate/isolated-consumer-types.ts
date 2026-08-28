import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

import { assertExternalConsumerCommandSucceeded } from "./external-consumer-command-result.ts";
import { CURRENT_PUBLIC_CONTRACT } from "../../package/public-api-inventory.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const tsgoPath = resolve(repositoryRoot, "node_modules/@typescript/native-preview/bin/tsgo.js");

/** Writes declaration and QuickInfo fixtures contributed by type acceptance. */
export function writeExternalConsumerTypesFixture(consumerDirectory: string): void {
  writeFileSync(join(consumerDirectory, "tsconfig.json"), typecheckConfig(), "utf8");
  writeFileSync(join(consumerDirectory, "public-imports.ts"), publicImports(), "utf8");
  writeFileSync(join(consumerDirectory, "hover-fixture.ts"), hoverFixture(), "utf8");
}

/** Runs the public declaration import and QuickInfo acceptance against one installed consumer. */
export function assertExternalConsumerTypes(consumerDirectory: string): void {
  typecheckPublicImports(consumerDirectory);
  assertInstalledDeclarationQuickInfo(consumerDirectory);
}

function typecheckPublicImports(consumerDirectory: string): void {
  assert.equal(existsSync(tsgoPath), true, `repository-pinned tsgo is missing at ${tsgoPath}`);
  const result = spawnSync(process.execPath, [tsgoPath, "--project", "tsconfig.json"], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertExternalConsumerCommandSucceeded(result, "isolated public-import typecheck");
}

function assertInstalledDeclarationQuickInfo(consumerDirectory: string): void {
  const fixturePath = join(consumerDirectory, "hover-fixture.ts");
  const fixtureSource = readFileSync(fixturePath, "utf8");
  const service = ts.createLanguageService({
    fileExists: (path) => ts.sys.fileExists(path),
    getCompilationSettings: () => ({
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      target: ts.ScriptTarget.ESNext,
      verbatimModuleSyntax: true
    }),
    getCurrentDirectory: () => consumerDirectory,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fixturePath],
    getScriptSnapshot: (filePath) => {
      const source = ts.sys.readFile(filePath);
      return source === undefined ? undefined : ts.ScriptSnapshot.fromString(source);
    },
    getScriptVersion: () => "1",
    readDirectory: (...args) => ts.sys.readDirectory(...args),
    readFile: (path) => ts.sys.readFile(path)
  });
  try {
    const defineCheckInfo = quickInfoText(service, fixturePath, fixtureSource, "defineCheck({");
    assert.match(defineCheckInfo.documentation, /定义一个 Check/);
    assert.match(defineCheckInfo.tags, /@remarks 此函数负责 authoring inference/);
    assert.match(defineCheckInfo.tags, /run.*负责 Project Definition validation/);
    assert.match(
      defineCheckInfo.tags,
      /@example 定义带 options、Records 与 messages 的自定义 Check/
    );

    const runInfo = quickInfoText(service, fixturePath, fixtureSource, "run(definition)");
    assert.match(runInfo.documentation, /在调用方的 Bun runtime 中执行/);
    assert.match(runInfo.tags, /@remarks.*validation/);
    assert.match(runInfo.tags, /@param definition/);
    assert.match(runInfo.tags, /@returns/);
  } finally {
    service.dispose();
  }
}

function quickInfoText(
  service: ts.LanguageService,
  fixturePath: string,
  fixtureSource: string,
  usage: string
): Readonly<{ readonly documentation: string; readonly tags: string }> {
  const position = fixtureSource.indexOf(usage);
  assert.notEqual(position, -1, `hover fixture is missing ${usage}`);
  const info = service.getQuickInfoAtPosition(fixturePath, position);
  assert.notEqual(info, undefined, `LanguageService did not return QuickInfo for ${usage}`);
  if (info === undefined) throw new Error(`LanguageService did not return QuickInfo for ${usage}`);
  const tags = info.tags
    ?.map(
      (tag) =>
        `@${tag.name}${tag.text === undefined ? "" : ` ${ts.displayPartsToString(tag.text)}`}`
    )
    .join("\n");
  return Object.freeze({
    documentation: ts.displayPartsToString(info.documentation),
    tags: tags ?? ""
  });
}

function typecheckConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        module: "nodenext",
        moduleResolution: "nodenext",
        noEmit: true,
        strict: true,
        target: "esnext",
        verbatimModuleSyntax: true
      },
      include: ["public-imports.ts", "docs/examples/package-api/*.ts"]
    },
    null,
    2
  )}\n`;
}

function hoverFixture(): string {
  return `import { defineCheck, defineConfig, run } from "vibe-check";

const documentedCheck = defineCheck({
  checkId: "hover-fixture",
  displayName: "Hover fixture",
  execution: () => ({ status: "passed", data: {} })
});
const definition = defineConfig({ checks: [documentedCheck] });
await run(definition);
`;
}

function publicImports(): string {
  const typeImports = Object.values(CURRENT_PUBLIC_CONTRACT.types)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => `  type ${name}`)
    .join(",\n");
  return `import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation,
  inherit,
  maintenanceReminders,
  jsonSchemaValidation,
  jsonValidation,
  parseDuplicateDetectionData,
  parseFileMetricsData,
  parseFunctionMetricsData,
  parseJsonSchemaValidationData,
  parseJsonValidationData,
  parseMaintenanceRemindersData,
  parseMarkdownLinkValidationData,
  run,
${typeImports}
} from "vibe-check";

const directCheck = defineCheck({
  checkId: "isolated-public-import",
  displayName: "Isolated public import",
  execution: (context) => {
    const selected = context.project.flags.includes("isolated-consumer");
    context.records.report({ id: "selection" }, { selected });
    return selected
      ? { status: "passed", data: { selected } }
      : { status: "failed", data: { selected } };
  }
});
interface ChangedFilesData {
  readonly files: readonly string[];
  readonly version: 1;
}

const changedFilesData: ChangedFilesData = {
  files: ["src/duplicate-a.ts", "src/duplicate-b.ts"],
  version: 1
};

const changedFiles = defineCheck({
  checkId: "isolated-changed-files",
  displayName: "Isolated changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== 1 ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported isolated changed-files data");
    }
    return { files: data.files, version: 1 };
  },
  execution: () => ({
    status: "passed",
    data: changedFilesData
  })
});

const asyncChangedFilesParser = async (
  _data: Readonly<Record<string, unknown>>
): Promise<ChangedFilesData> => changedFilesData;
defineCheck({
  checkId: "isolated-async-provider",
  displayName: "Isolated async provider",
  execution: () => ({ status: "passed", data: changedFilesData }),
  // @ts-expect-error emitted provider declarations require a synchronous parser.
  parseData: asyncChangedFilesParser
});

const changedFilesConsumer = defineCheck({
  checkId: "isolated-changed-files-consumer",
  displayName: "Isolated changed-files consumer",
  dependsOn: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsedChangedFiles = changedFiles.parseData(read.data);
    return { status: read.status, data: { fileCount: parsedChangedFiles.files.length } };
  }
});

const definition: ProjectDefinition = defineConfig({
  checks: [
    duplicateDetection({
      codeAreas: {
        source: {
          files: {
            exclude: ["**/*.generated.*"],
            include: ["src/**/*.ts"],
            source: "git-worktree"
          }
        }
      },
      findingPolicy: "non-blocking"
    }),
    fileMetrics({ findingPolicy: "non-blocking" }),
    functionMetrics({ findingPolicy: "non-blocking" }),
    markdownLinkValidation(),
    directCheck,
    changedFiles,
    changedFilesConsumer
  ]
});
const inheritedCheckIds = inherit({ add: [directCheck.checkId] });
const reminder = maintenanceReminders([
  {
    id: "isolated-maintenance-reminder",
    baseCommit: "0000000000000000000000000000000000000000",
    limits: { commits: 1 },
    message: "Review isolated consumer maintenance."
  }
]);
const aggregation: CheckAggregation = {
  checks: [directCheck.checkId],
  empty: "failed",
  mode: "all",
  notApplicable: "fail",
  unavailable: "propagate"
};
const result: Promise<RunResult> = run(definition, {
  checkAggregation: aggregation,
  flags: ["isolated-consumer"]
});

const authorResult: CheckResult = { status: "passed", data: new Date() };
const messagedResult: CheckResult = {
  status: "not-applicable",
  messages: [{ code: "not-required", level: "info", message: "Not required" }]
};
const attentionCheck: Check = {
  checkId: "isolated-attention",
  displayName: "Isolated attention",
  execution: () => messagedResult,
  visibility: "attention"
};
const settledOutcome: CheckOutcome = { status: "passed", data: { selected: true } };
if (settledOutcome.status === "passed") {
  // @ts-expect-error Settled Run outcomes expose readonly canonical data.
  settledOutcome.data.selected = false;
}

function observeFinalDurations(runResult: RunResult): void {
  if (
    runResult.kind === "completed" ||
    runResult.kind === "output" ||
    (runResult.kind === "cancelled" && runResult.phase === "execution")
  ) {
    const durations: readonly Readonly<{ readonly checkId: string; readonly durationMs: number | null }>[] =
      runResult.checkDurations;
    const messages: readonly Readonly<{
      readonly checkId: string;
      readonly code: string;
      readonly level: "info" | "warning" | "error";
      readonly message: string;
    }>[] = runResult.checkMessages;
    void durations;
    void messages;
    if (runResult.kind === "completed" || runResult.kind === "output") {
      const aggregate: CheckAggregate | null = runResult.aggregate;
      void aggregate;
    }
  }
}

void [
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation,
  inherit,
  maintenanceReminders,
  jsonSchemaValidation,
  jsonValidation,
  run,
  aggregation,
  attentionCheck,
  authorResult,
  changedFiles,
  changedFilesData,
  changedFilesConsumer,
  inheritedCheckIds,
  observeFinalDurations,
  reminder,
  result
];
`;
}
