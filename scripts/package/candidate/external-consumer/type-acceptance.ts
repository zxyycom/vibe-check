import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertExternalConsumerCommandSucceeded } from "./command-result.ts";
import { CUSTOM_ADMISSION_STRATEGY_TYPE_ACCEPTANCE_SOURCE } from "./custom-admission-strategy-type-acceptance.ts";
import { CURRENT_PUBLIC_CONTRACT } from "../../public-api-inventory.ts";
import { PACKAGE_TYPES_DIRECTORY } from "../../package-contract.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const tsgoPath = resolve(repositoryRoot, "node_modules/@typescript/native-preview/bin/tsgo.js");
const defineCheckDeclarationPath = `${PACKAGE_TYPES_DIRECTORY}/check/check.d.ts`;
const runDeclarationPath = `${PACKAGE_TYPES_DIRECTORY}/project-run/run.d.ts`;

/** Writes declaration fixtures contributed by type acceptance. */
export function writeExternalConsumerTypesFixture(consumerDirectory: string): void {
  writeFileSync(join(consumerDirectory, "tsconfig.json"), typecheckConfig(), "utf8");
  writeFileSync(join(consumerDirectory, "public-imports.ts"), publicImports(), "utf8");
}

/** Runs public typechecking and audits the installed declaration documentation. */
export function assertExternalConsumerTypes(consumerDirectory: string): void {
  typecheckPublicImports(consumerDirectory);
  assertInstalledDeclarationDocumentation(consumerDirectory);
}

function typecheckPublicImports(consumerDirectory: string): void {
  assert.equal(existsSync(tsgoPath), true, `repository-pinned tsgo is missing at ${tsgoPath}`);
  const result = spawnSync(process.execPath, [tsgoPath, "--project", "tsconfig.json"], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  assertExternalConsumerCommandSucceeded(result, "isolated public-import typecheck");
}

function assertInstalledDeclarationDocumentation(consumerDirectory: string): void {
  const packageDirectory = join(
    consumerDirectory,
    "node_modules",
    CURRENT_PUBLIC_CONTRACT.packageImport
  );
  const defineCheckDocs = readAdjacentDeclarationDocumentation({
    declarationMarker: `export declare function ${CURRENT_PUBLIC_CONTRACT.operations.defineCheck}`,
    declarationPath: join(packageDirectory, defineCheckDeclarationPath)
  });
  assert.match(defineCheckDocs, /定义一个 Check/);
  assert.match(defineCheckDocs, /@remarks 此函数负责 authoring inference/);
  assert.match(defineCheckDocs, /run.*负责 Project Definition validation/);
  assert.match(defineCheckDocs, /@example 定义带 options、Records 与 messages 的自定义 Check/);

  const runDocs = readAdjacentDeclarationDocumentation({
    declarationMarker: `export declare function ${CURRENT_PUBLIC_CONTRACT.operations.run}`,
    declarationPath: join(packageDirectory, runDeclarationPath)
  });
  assert.match(runDocs, /在调用方的 Bun runtime 中执行/);
  assert.match(runDocs, /@remarks.*validation/su);
  assert.match(runDocs, /@param definition/);
  assert.match(runDocs, /@returns/);
}

function readAdjacentDeclarationDocumentation(input: {
  readonly declarationMarker: string;
  readonly declarationPath: string;
}): string {
  const source = readFileSync(input.declarationPath, "utf8");
  const declarationStart = source.indexOf(input.declarationMarker);
  if (declarationStart === -1) {
    throw new Error(
      `installed declaration is missing ${input.declarationMarker}: ${input.declarationPath}`
    );
  }
  const commentEnd = source.lastIndexOf("*/", declarationStart);
  if (commentEnd === -1) {
    throw new Error(`installed declaration is missing closed JSDoc: ${input.declarationPath}`);
  }
  const commentStart = source.lastIndexOf("/**", commentEnd);
  if (commentStart === -1) {
    throw new Error(`installed declaration is missing JSDoc start: ${input.declarationPath}`);
  }
  const sourceBetweenCommentAndDeclaration = source.slice(commentEnd + 2, declarationStart);
  if (sourceBetweenCommentAndDeclaration.trim().length > 0) {
    throw new Error(`installed declaration JSDoc is not adjacent: ${input.declarationPath}`);
  }
  return source.slice(commentStart, commentEnd + 2);
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
      include: [
        "public-imports.ts",
        "docs/examples/package-api/*.ts",
        `node_modules/${CURRENT_PUBLIC_CONTRACT.packageImport}/docs/examples/artifacts/mixed-outcomes/definition.ts`
      ]
    },
    null,
    2
  )}\n`;
}

const PUBLIC_TYPE_IMPORTS_MARKER = "__VIBE_CHECK_PUBLIC_TYPE_IMPORTS__";

function publicImports(): string {
  const typeImports = Object.values(CURRENT_PUBLIC_CONTRACT.types)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => `  type ${name}`)
    .join(",\n");
  return PUBLIC_IMPORTS_TEMPLATE.replace(PUBLIC_TYPE_IMPORTS_MARKER, typeImports);
}

const PUBLIC_IMPORTS_TEMPLATE = `import {
  cacheJsonByKey,
  createAdmissionGraph,
  defineAdmissionPolicy,
  defineCheck,
  defineConfig,
  defaultProjectFileSelection,
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
  presentCheckFindings,
  run,
  secretDetection,
  parseSecretDetectionData,
__VIBE_CHECK_PUBLIC_TYPE_IMPORTS__
} from "${CURRENT_PUBLIC_CONTRACT.packageImport}";

function isCacheRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const cacheOptions: CacheJsonByKeyOptions<{ readonly count: number }> = {
  compute: () => ({ count: 1 }),
  directory: "/tmp/isolated-vibe-check-cache",
  key: "type-acceptance",
  namespace: "isolated.consumer",
  parse: (value) => {
    if (!isCacheRecord(value) || typeof value.count !== "number") {
      throw new TypeError("cache value is invalid");
    }
    return { count: value.count };
  },
  version: "1"
};
const cacheResult: Promise<CacheJsonByKeyResult<{ readonly count: number }>> = cacheJsonByKey(cacheOptions);
const asyncCacheParser = async (_value: unknown) => ({ count: 1 });
cacheJsonByKey({
  compute: () => ({ count: 1 }),
  directory: "/tmp/isolated-vibe-check-cache",
  key: "async-parser-rejection",
  namespace: "isolated.consumer",
  // @ts-expect-error cache payload parsing must synchronously return a non-thenable value.
  parse: asyncCacheParser,
  version: "1"
});

const directCheck = defineCheck({
  admissionPriority: 2,
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

const sourceFiles: ProjectFileSelection = {
  ...defaultProjectFileSelection,
  exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"],
  include: ["src/**/*.ts"]
};

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
  observes: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const observation = dependencies.list().find(({ checkId }) => checkId === changedFiles.checkId);
    if (
      observation === undefined ||
      (observation.outcome.status !== "passed" && observation.outcome.status !== "failed")
    ) {
      return { status: "unavailable", reason: { code: "changed-files-data-unavailable" } };
    }
    const parsedChangedFiles = changedFiles.parseData(observation.outcome.data);
    return { status: observation.outcome.status, data: { fileCount: parsedChangedFiles.files.length } };
  }
});

const secretCheck = secretDetection({
  files: { exclude: [], include: ["src/**/*.ts"], source: "filesystem" }
});
const secretData: SecretDetectionFinalData = parseSecretDetectionData({
  coverageGapCount: 0,
  findingCount: 0,
  scannedFileCount: 0,
  selectedFileCount: 0,
  waivedFindingCount: 0
});

const definition: ProjectDefinition = defineConfig({
  checks: [
    duplicateDetection({
      codeAreas: {
        source: {
          files: {
            ...sourceFiles,
            source: "git-worktree"
          }
        }
      }
    }),
    fileMetrics(),
    functionMetrics(),
    markdownLinkValidation({
      cache: { enabled: true, directory: "/tmp/isolated-markdown-link-parse-cache" }
    }),
    secretCheck,
    directCheck,
    changedFiles,
    changedFilesConsumer
  ]
});
${CUSTOM_ADMISSION_STRATEGY_TYPE_ACCEPTANCE_SOURCE}
const learnedCriticalPathAdmissionPolicy: AdmissionPolicy = defineAdmissionPolicy({
  kind: "learned-critical-path",
  stateDirectory: ".vibe-check/duration-state"
});
defineConfig({ scheduler: { admissionPolicy: learnedCriticalPathAdmissionPolicy } });
defineConfig({});
defineAdmissionPolicy({
  kind: "static",
  // @ts-expect-error admission policy authoring is a closed union.
  unsupported: true
});
defineAdmissionPolicy({
  kind: "learned-critical-path",
  stateDirectory: ".vibe-check/duration-state",
  // @ts-expect-error admission policy authoring is a closed union.
  unsupported: true
});
defineAdmissionPolicy({
  kind: "learned-critical-path",
  stateDirectory: ".vibe-check/duration-state",
  // @ts-expect-error v1 derives duration predictions from local history rather than authored hints.
  expectedDurationMs: 250
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
const findingMessages = presentCheckFindings({
  findings: [{ path: "src/example.ts" }],
  limit: 1,
  message: (finding) => ({
    code: "finding-detail",
    level: "warning",
    message: finding.path
  }),
  omittedMessage: ({ omittedCount }) => ({
    code: "findings-omitted",
    level: "warning",
    message: String(omittedCount) + " findings omitted"
  })
});
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
  cacheJsonByKey,
  defineAdmissionPolicy,
  cacheResult,
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
  secretCheck,
  secretData,
  parseSecretDetectionData,
  run,
  aggregation,
  attentionCheck,
  authorResult,
  changedFiles,
  changedFilesData,
  changedFilesConsumer,
  customAdmissionPolicy,
  preparedCustomAdmissionPolicy,
  learnedCriticalPathAdmissionPolicy,
  inheritedCheckIds,
  observeFinalDurations,
  findingMessages,
  presentCheckFindings,
  reminder,
  result
];
`;
