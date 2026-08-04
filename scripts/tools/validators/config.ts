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
  config: "docs/schemas/vibe-check-config.schema.json",
  metrics: "docs/schemas/vibe-check-metrics.schema.json",
  warning: "docs/schemas/vibe-check-warning.schema.json"
};

export const HISTORICAL_SCHEMAS = {
  report: "docs/schemas/vibe-check-report.schema.json"
};

export const EXAMPLES = {
  semanticConfig: "docs/examples/json/vibe-check-config.json",
  reportExamplesDir: FILE_SYSTEM.examplesJsonDir
};
