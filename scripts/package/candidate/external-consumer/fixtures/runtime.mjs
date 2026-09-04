import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  cacheJsonByKey,
  createAdmissionGraph,
  defineCheck,
  defineConfig,
  duplicateDetection,
  functionMetrics,
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
  parseSecretDetectionData,
  secretDetection,
  run
} from "@zxyycom/vibe-check";

const projectRoot = process.argv[2];
if (projectRoot === undefined) throw new Error("fixture project root is required");
const markdownLinkCacheDirectory = join(projectRoot, ".vibe-check", "markdown-link-parse-cache");
const MARKDOWN_LINK_CACHE_FILE = "markdown-link-parse-facts-v1.jsonl";

const cacheEvidence = await observeCacheReuse();
const learnedSchedulingEvidence = await observeLearnedScheduling(projectRoot);
const admissionSimulationEvidence = await observeAdmissionSimulation(projectRoot);

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
  }),
  secret: parseSecretDetectionData({
    coverageGapCount: 0,
    findingCount: 0,
    scannedFileCount: 0,
    selectedFileCount: 0,
    waivedFindingCount: 0
  }),
  secretCheckId: secretDetection({
    files: { exclude: [], include: ["package.json"], source: "filesystem" }
  }).checkId
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

const installedFunctionMetrics = functionMetrics({
  codeAreas: {
    worker: {
      files: { include: ["function-metrics.ts"] },
      limits: { cyclomaticComplexity: { maximum: 1 } }
    }
  }
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

const failedChangedFiles = defineCheck({
  checkId: "failed-changed-files",
  displayName: "Failed changed files",
  parseData: changedFiles.parseData,
  execution: () => ({
    status: "failed",
    data: { files: ["src/failed-change.ts"], version: 1 }
  })
});

const firstChangedFilesConsumer = defineCheck({
  checkId: "first-changed-files-consumer",
  displayName: "First changed-files consumer",
  observes: [failedChangedFiles.checkId],
  execution: ({ dependencies }) => {
    const observation = dependencies
      .list()
      .find(({ checkId }) => checkId === failedChangedFiles.checkId);
    if (observation === undefined || observation.outcome.status !== "failed") {
      return { status: "unavailable", reason: { code: "changed-files-data-unavailable" } };
    }
    const parsedChangedFiles = failedChangedFiles.parseData(observation.outcome.data);
    return {
      status: "passed",
      data: {
        fileCount: parsedChangedFiles.files.length,
        observedStatus: observation.outcome.status
      }
    };
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

let blockedChangedFilesConsumerCalls = 0;
const blockedChangedFilesConsumer = defineCheck({
  checkId: "blocked-changed-files-consumer",
  displayName: "Blocked changed-files consumer",
  dependsOn: [failedChangedFiles.checkId],
  execution: () => {
    blockedChangedFilesConsumerCalls += 1;
    return { status: "passed", data: {} };
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
      installedFunctionMetrics,
      jsonCheck,
      jsonSchemaValidation({
        bindings: [
          {
            id: "person",
            instancePath: "instance.json",
            schemaId: "__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__"
          }
        ],
        schemas: [{ id: "__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__", path: "schema.json" }]
      }),
      markdownLinkValidation({
        cache: { enabled: true, directory: markdownLinkCacheDirectory }
      }),
      changedFiles,
      failedChangedFiles,
      firstChangedFilesConsumer,
      secondChangedFilesConsumer,
      blockedChangedFilesConsumer,
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
const functionMetricsCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === installedFunctionMetrics.checkId)
    : undefined;
const functionMetricsRecords =
  result.kind === "completed"
    ? result.snapshot.records.filter((record) => record.checkId === installedFunctionMetrics.checkId)
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
const blockedConsumerCheck =
  result.kind === "completed"
    ? result.snapshot.checks.find((check) => check.checkId === blockedChangedFilesConsumer.checkId)
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
      cacheComputations: cacheEvidence.computations,
      firstCacheRead: cacheEvidence.firstRead,
      secondCacheRead: cacheEvidence.secondRead,
      blockedChangedFilesConsumer: blockedConsumerCheck?.outcome ?? null,
      blockedChangedFilesConsumerCalls,
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
      functionMetricsData: settledFinalData(functionMetricsCheck),
      functionMetricsOutcome: functionMetricsCheck?.outcome.status ?? null,
      functionMetricsRecords,
      jsonSchemaData: settledFinalData(jsonSchemaCheck),
      jsonSchemaOutcome: jsonSchemaCheck?.outcome.status ?? null,
      learnedScheduling: learnedSchedulingEvidence,
      admissionSimulation: admissionSimulationEvidence,
      markdownLinkData: settledFinalData(markdownLink),
      markdownLinkCacheJsonl: markdownLinkCacheJsonlEvidence(markdownLinkCacheDirectory),
      markdownLinkOutcome: markdownLink?.outcome.status ?? null
    })
);

function markdownLinkCacheJsonlEvidence(directory) {
  if (!existsSync(directory)) {
    return { completeLineCount: 0, entries: [], hasUnterminatedTail: false };
  }
  const entries = readdirSync(directory).sort();
  const filePath = join(directory, MARKDOWN_LINK_CACHE_FILE);
  if (!existsSync(filePath)) {
    return { completeLineCount: 0, entries, hasUnterminatedTail: false };
  }
  const contents = readFileSync(filePath, "utf8");
  const completeLines = contents.split("\n").slice(0, -1);
  for (const line of completeLines) JSON.parse(line);
  return {
    completeLineCount: completeLines.length,
    entries,
    hasUnterminatedTail: !contents.endsWith("\n")
  };
}

async function observeCacheReuse() {
  const directory = await mkdtemp(join(tmpdir(), "vibe-check-installed-cache-"));
  let computations = 0;
  try {
    const options = {
      compute: () => ({ count: ++computations }),
      directory,
      key: "installed-runtime-v1",
      namespace: "installed.consumer",
      parse(value) {
        if (
          value === null ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          typeof value.count !== "number"
        ) {
          throw new TypeError("installed cache payload is invalid");
        }
        return value;
      },
      version: "1"
    };
    const firstRead = await cacheJsonByKey(options);
    const secondRead = await cacheJsonByKey(options);
    return Object.freeze({ computations, firstRead, secondRead });
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function observeAdmissionSimulation(projectRoot) {
  const simulation = createAdmissionGraph({
    graph: {
      scopes: [],
      tasks: [
        admissionSimulationTask("source"),
        admissionSimulationTask("dependent", ["source"]),
        admissionSimulationTask("independent")
      ]
    },
    maxParallel: 2
  });
  const initial = simulation.initialState();
  const selectedSource = initial.select("source");
  if (!selectedSource.accepted) throw new Error("installed standalone source selection was rejected");
  const settledSource = selectedSource.state.settle("source", "unsatisfied");
  if (!settledSource.accepted) throw new Error("installed standalone source settlement was rejected");
  const independentBranch = initial.select("independent");
  if (!independentBranch.accepted) throw new Error("installed standalone branch selection was rejected");

  const started = [];
  let lookaheadSettled = false;
  let lookaheadSelected = false;
  const first = defineCheck({
    checkId: "installed-simulation-first",
    displayName: "Installed simulation first",
    execution: () => {
      started.push("installed-simulation-first");
      return { status: "passed", data: {} };
    }
  });
  const second = defineCheck({
    checkId: "installed-simulation-second",
    displayName: "Installed simulation second",
    execution: () => {
      started.push("installed-simulation-second");
      return { status: "passed", data: {} };
    }
  });
  const customRun = await run(
    defineConfig({
      checks: [first, second],
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      },
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "simple",
            decide(context) {
              if (!lookaheadSelected) {
                const selected = context.admissionState.select(second.checkId);
                if (!selected.accepted) throw new Error("installed callback lookahead was rejected");
                lookaheadSelected = true;
                const settled = selected.state.settle(second.checkId, "satisfied");
                if (!settled.accepted) throw new Error("installed callback branch settlement was rejected");
                lookaheadSettled = true;
              }
              const candidate = context.candidates.find(({ canAdmit }) => canAdmit);
              return candidate === undefined
                ? { kind: "wait" }
                : { kind: "select", taskId: candidate.taskId };
            }
          }
        },
        maxParallel: 1
      }
    }),
    { projectRoot }
  );

  const controller = new AbortController();
  let hardGuardCallbackCount = 0;
  let hardGuardExecutionCount = 0;
  const guarded = defineCheck({
    checkId: "installed-simulation-guarded",
    displayName: "Installed simulation guarded",
    execution: () => {
      hardGuardExecutionCount += 1;
      return { status: "passed", data: {} };
    }
  });
  const hardGuardRun = await run(
    defineConfig({
      checks: [guarded],
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      },
      scheduler: {
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "simple",
            decide(context) {
              hardGuardCallbackCount += 1;
              if (!context.admissionState.validateSelection(guarded.checkId).accepted) {
                throw new Error("installed hard-guard callback did not receive an admissible task");
              }
              controller.abort();
              return { kind: "select", taskId: guarded.checkId };
            }
          }
        },
        maxParallel: 1
      }
    }),
    { projectRoot, signal: controller.signal }
  );

  return Object.freeze({
    callback: Object.freeze({
      customRunKind: customRun.kind,
      lookaheadSelected,
      lookaheadSettled,
      started: Object.freeze([...started])
    }),
    hardGuard: Object.freeze({
      callbackCount: hardGuardCallbackCount,
      diagnostic: hardGuardRun.kind === "execution" ? hardGuardRun.diagnostic.code : null,
      executionCount: hardGuardExecutionCount,
      kind: hardGuardRun.kind
    }),
    standalone: Object.freeze({
      branchRunningTaskIds: independentBranch.state.inspection.runningTaskIds,
      initialSourceSelectable: initial.validateSelection("source").accepted,
      methodsFrozen: Object.freeze({
        initialState: Object.isFrozen(simulation.initialState),
        select: Object.isFrozen(initial.select),
        settle: Object.isFrozen(initial.settle),
        validateSelection: Object.isFrozen(initial.validateSelection)
      }),
      settledTaskIds: settledSource.state.inspection.settledTasks.map(({ taskId }) => taskId)
    })
  });
}

function admissionSimulationTask(taskId, dependsOn = []) {
  return {
    admissionPriority: 0,
    dependsOn,
    mutex: [],
    observes: [],
    scopeId: null,
    taskId
  };
}

async function observeLearnedScheduling(projectRoot) {
  const fast = defineCheck({
    checkId: "installed-learned-fast",
    displayName: "Installed learned fast",
    options: { marker: "installed-private-option" },
    async execution() {
      await delay(1);
      return { status: "passed", data: {} };
    }
  });
  const slow = defineCheck({
    checkId: "installed-learned-slow",
    displayName: "Installed learned slow",
    options: { marker: "installed-private-option" },
    async execution() {
      await delay(20);
      return { status: "passed", data: {} };
    }
  });
  const definition = defineConfig({
    checks: [fast, slow],
    outputs: {
      diagnosticLogging: { directory: "learned-diagnostics", enabled: true },
      machinePublication: { directory: "learned-machine", enabled: true },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: {
        kind: "learned-critical-path",
        stateDirectory: "learned-state"
      },
      maxParallel: 1
    }
  });
  const controls = {
    flags: ["installed-private-flag"],
    projectRoot
  };
  const first = await run(definition, controls);
  const firstMachine = readLearnedMachine(projectRoot);
  const firstDiagnostic = readLearnedDiagnostic(projectRoot, first);
  const statePath = join(projectRoot, "learned-state", "scheduler-history.json");
  const second = await run(definition, controls);
  const secondMachine = readLearnedMachine(projectRoot);
  const secondDiagnostic = readLearnedDiagnostic(projectRoot, second);
  const history = readFileSync(statePath, "utf8");
  return {
    first: publicLearnedRunEvidence(first, firstMachine, firstDiagnostic),
    history,
    stateFileExists: existsSync(statePath),
    second: publicLearnedRunEvidence(second, secondMachine, secondDiagnostic)
  };
}

function publicLearnedRunEvidence(result, machine, diagnostic) {
  return {
    diagnostic,
    kind: result.kind,
    machineHasSchedulerHistory: Object.hasOwn(machine, "schedulerHistory"),
    resultHasSchedulerHistory: Object.hasOwn(result, "schedulerHistory"),
    resultHasSchedulerPrediction: Object.hasOwn(result, "schedulerPrediction"),
    snapshotCheckIds:
      result.kind === "completed" ? result.snapshot.checks.map((check) => check.checkId).sort() : []
  };
}

function readLearnedMachine(projectRoot) {
  return JSON.parse(readFileSync(join(projectRoot, "learned-machine", "run.json"), "utf8"));
}

function readLearnedDiagnostic(projectRoot, result) {
  if (result.kind !== "completed") throw new Error(`Expected learned Run to complete: ${result.kind}`);
  const path = result.outputs.diagnosticLogging.channels.learnedAdmission.file;
  if (typeof path !== "string") throw new Error("Expected learned-admission diagnostic file");
  return readFileSync(join(projectRoot, path), "utf8");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
