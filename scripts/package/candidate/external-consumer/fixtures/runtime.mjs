import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  jsonSchemaValidation,
  jsonValidation,
  markdownLinkValidation,
  parseDuplicateDetectionData,
  parseFileMetricsData,
  parseFunctionMetricsData,
  parseJsonSchemaValidationData,
  parseJsonValidationData,
  parseMaintenanceRemindersData,
  parseMarkdownLinkValidationData,
  run
} from "@zxyycom/vibe-check";

const projectRoot = process.argv[2];
if (projectRoot === undefined) throw new Error("fixture project root is required");

const jsonCheck = jsonValidation();
const parserEvidence = {
  attachedJson: jsonCheck.parseData({
    invalidFileCount: 0,
    issueCount: 0,
    rejectedInputCount: 0,
    scannedFileCount: 0,
    validFileCount: 0
  }),
  duplicate: parseDuplicateDetectionData({ blockingFindingCount: 0, findingCount: 0 }),
  file: parseFileMetricsData({ blockingFindingCount: 0, findingCount: 0 }),
  function: parseFunctionMetricsData({ blockingFindingCount: 0, findingCount: 0 }),
  json: parseJsonValidationData({
    invalidFileCount: 0,
    issueCount: 0,
    rejectedInputCount: 0,
    scannedFileCount: 0,
    validFileCount: 0
  }),
  jsonSchema: parseJsonSchemaValidationData({
    bindingCount: 0,
    blockedBindingCount: 0,
    invalidBindingCount: 0,
    issueCount: 0,
    issuesTruncated: false,
    reportedIssueCount: 0,
    schemaCount: 0,
    validBindingCount: 0
  }),
  maintenance: parseMaintenanceRemindersData({ entries: [] }),
  markdown: parseMarkdownLinkValidationData({
    findingCount: 0,
    occurrenceCount: 0,
    rejectedInputCount: 0,
    sourceFileCount: 0,
    targetReadCount: 0
  })
};

const terminalNote = defineCheck({
  checkId: "installed-terminal-note",
  displayName: "Installed terminal note",
  visibility: "attention",
  execution: () => ({
    status: "passed",
    data: {},
    messages: [
      {
        code: "installed-terminal-note",
        level: "info",
        message: "Installed candidate terminal message."
      }
    ]
  })
});

let changedFilesCalls = 0;
const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data) {
    if (
      data.version !== 1 ||
      !Array.isArray(data.files) ||
      !data.files.every((value) => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: 1 };
  },
  execution: () => {
    changedFilesCalls += 1;
    return {
      status: "passed",
      data: { files: ["src/duplicate-a.ts", "src/duplicate-b.ts"], version: 1 }
    };
  }
});

const firstChangedFilesConsumer = defineCheck({
  checkId: "first-changed-files-consumer",
  displayName: "First changed-files consumer",
  dependsOn: [changedFiles.checkId],
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

const secondChangedFilesConsumer = defineCheck({
  checkId: "second-changed-files-consumer",
  displayName: "Second changed-files consumer",
  dependsOn: [changedFiles.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsedChangedFiles = changedFiles.parseData(read.data);
    return { status: read.status, data: { firstFile: parsedChangedFiles.files[0] } };
  }
});

const result = await run(
  defineConfig({
    checks: [
      duplicateDetection({
        codeAreas: {
          project: {
            files: { include: ["duplicate-a.ts", "duplicate-b.ts"] },
            minimumTokens: 20
          }
        }
      }),
      jsonCheck,
      jsonSchemaValidation({
        bindings: [
          {
            id: "person",
            instancePath: "instance.json",
            schemaId: "__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__"
          }
        ],
        schemas: [
          { id: "__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__", path: "schema.json" }
        ]
      }),
      markdownLinkValidation(),
      changedFiles,
      firstChangedFilesConsumer,
      secondChangedFilesConsumer,
      terminalNote
    ],
    outputs: {
      machinePublication: { directory: "machine-output", enabled: true }
    },
    scheduler: { maxParallel: 1 }
  }),
  { projectRoot }
);
const duplicate =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === "duplicate-detection")
    : undefined;
const duplicateRecords =
  result.kind === "completed"
    ? result.snapshot.records.filter((record) => record.checkId === "duplicate-detection")
    : null;
const jsonSchemaCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === "json-schema-validation")
    : undefined;
const markdownLink =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === "markdown-link-validation")
    : undefined;
const runChangedFilesCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === changedFiles.checkId)
    : undefined;
const publishedRun = JSON.parse(readFileSync(join(projectRoot, "machine-output/run.json"), "utf8"));
const publishedChangedFilesCheck = publishedRun.checks.find(
  (check) => check.checkId === changedFiles.checkId
);
const parsedChangedFilesFromMachine = changedFiles.parseData(
  publishedChangedFilesCheck.outcome.data
);
const parsedChangedFilesFromRun =
  runChangedFilesCheck?.outcome.status === "passed"
    ? changedFiles.parseData(runChangedFilesCheck.outcome.data)
    : null;
const firstConsumerCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === firstChangedFilesConsumer.checkId)
    : undefined;
const secondConsumerCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === secondChangedFilesConsumer.checkId)
    : undefined;

function settledFinalData(check) {
  if (check?.outcome.status !== "passed" && check?.outcome.status !== "failed") return null;
  return check.outcome.data;
}

process.stdout.write(
  "__VIBE_CHECK_ISOLATED_RUN__" +
    JSON.stringify({
      checkMessages: result.kind === "completed" ? result.checkMessages : null,
      checkDurations: result.kind === "completed" ? result.checkDurations : null,
      changedFilesCalls,
      changedFilesFromMachine: parsedChangedFilesFromMachine,
      changedFilesFromRun: parsedChangedFilesFromRun,
      kind: result.kind,
      firstChangedFilesConsumer: settledFinalData(firstConsumerCheck),
      machineSchemaVersion: publishedRun.schemaVersion,
      parserEvidence,
      secondChangedFilesConsumer: settledFinalData(secondConsumerCheck),
      duplicateData: settledFinalData(duplicate),
      duplicateOutcome: duplicate?.outcome.status ?? null,
      duplicateRecords,
      jsonSchemaData: settledFinalData(jsonSchemaCheck),
      jsonSchemaOutcome: jsonSchemaCheck?.outcome.status ?? null,
      markdownLinkData: settledFinalData(markdownLink),
      markdownLinkOutcome: markdownLink?.outcome.status ?? null
    })
);
