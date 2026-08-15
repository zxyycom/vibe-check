// Vibe Check docs validators keep validation paths and task names in one place.
// Product semantics remain owned by the product runtime and owner docs.
export const TASK_NAMES = {
  json: "json",
  schema: "schema",
  examples: "examples",
  links: "links"
};

export const FILE_SYSTEM = {
  docsDir: "docs",
  examplesJsonDir: "docs/examples/json",
  schemasDir: "docs/schemas",
  ignoredDirs: [
    ".git",
    ".codegraph",
    ".cache",
    ".log",
    ".tmp",
    "artifacts",
    "node_modules",
    "target",
    ".venv",
    "dist",
    "build"
  ],
  markdownLinkRoots: ["AGENTS.md", "docs"],
  jsonExtension: ".json",
  markdownExtension: ".md",
  schemaExtension: ".schema.json"
};

export const CURRENT_SCHEMAS = {
  record: "docs/schemas/vibe-check-record.schema.json",
  run: "docs/schemas/vibe-check-run.schema.json"
};

export const HISTORICAL_SCHEMAS = {
  report: "docs/schemas/vibe-check-report.schema.json",
  machineRecordV2: "docs/schemas/historical/v2/vibe-check-record.schema.json",
  machineRunV2: "docs/schemas/historical/v2/vibe-check-run.schema.json"
};

export const EXAMPLES = { reportExamplesDir: FILE_SYSTEM.examplesJsonDir };
